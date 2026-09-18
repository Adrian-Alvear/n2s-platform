"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildShapes } from "./shapes";
import { useMorph } from "./store";
import { useDiag } from "./diag";

/**
 * The hero's particles: a loose cloud that pours into a shape for each
 * service, and parts around the cursor.
 *
 * Everything moves in the vertex shader. The CPU only does work when the
 * target changes (once every few seconds): it bakes the current in-flight
 * positions into `position` and swaps the destination. So the whole field is
 * one draw call and costs React nothing per frame.
 */

const MORPH_SECONDS = 1.9;

const VERT = /* glsl */ `
  uniform float uMix;
  uniform float uTime;
  uniform float uBoot;
  uniform vec3  uPointer;
  uniform float uPointerStrength;
  uniform float uSize;
  attribute vec3 aTo;
  attribute float aSeed;
  varying float vHeat;
  varying float vSeed;

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    // Each particle leaves at its own moment, so the form POURS rather than
    // snapping — the whole effect depends on this stagger.
    float local = clamp((uMix - aSeed * 0.45) / 0.55, 0.0, 1.0);
    vec3 p = mix(position, aTo, ease(local));

    // Mid-flight, particles swing outward on an arc instead of crossing in a
    // straight line through the middle.
    float flight = sin(local * 3.14159);
    p += normalize(p + 1e-4) * flight * (0.35 + aSeed * 0.6);

    // Breathing, on unrelated periods so nothing pulses together.
    p += vec3(
      sin(uTime * 0.60 + aSeed * 40.0),
      cos(uTime * 0.47 + aSeed * 31.0),
      sin(uTime * 0.39 + aSeed * 17.0)
    ) * 0.028;

    vec4 world = modelMatrix * vec4(p, 1.0);

    // The cursor parts the field.
    vec3 d = world.xyz - uPointer;
    float push = uPointerStrength * smoothstep(1.7, 0.0, length(d));
    world.xyz += normalize(d + 1e-4) * push * 0.85;

    vHeat = clamp(flight * 1.2 + push * 1.4, 0.0, 1.0);
    vSeed = aSeed;

    vec4 mv = viewMatrix * world;
    gl_PointSize = uSize * uBoot * (0.6 + fract(aSeed * 13.7) * 0.8) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform float uBoot;
  varying float vHeat;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.08, d);

    // Settled particles are silver; moving ones warm to gold — the colour
    // carries the motion.
    vec3 col = mix(uCool, uWarm, vHeat);
    float spark = step(0.965, fract(vSeed * 91.7)) * 0.8;
    gl_FragColor = vec4(col * (1.15 + spark + vHeat * 0.9), a * (0.55 + vHeat * 0.35) * uBoot);
  }
`;

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function ParticleMorph({
  count,
  reducedMotion,
}: {
  count: number;
  reducedMotion: boolean;
}) {
  const points = useRef<THREE.Points>(null!);
  const group = useRef<THREE.Group>(null!);
  const { camera, size } = useThree();

  const shapes = useMemo(() => buildShapes(count), [count]);

  const { geometry, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = Math.random();
    g.setAttribute("position", new THREE.BufferAttribute(shapes[0].slice(), 3));
    g.setAttribute("aTo", new THREE.BufferAttribute(shapes[0].slice(), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return { geometry: g, seeds };
  }, [count, shapes]);

  const uniforms = useMemo(
    () => ({
      uMix: { value: 1 },
      uTime: { value: 0 },
      uBoot: { value: reducedMotion ? 1 : 0 },
      uPointer: { value: new THREE.Vector3(999, 999, 999) },
      uPointerStrength: { value: 0 },
      uSize: { value: 26 },
      uCool: { value: new THREE.Color("#c9d0dc") },
      uWarm: { value: new THREE.Color("#f0d9a8") },
    }),
    [reducedMotion],
  );

  // Pointer, tracked on the window: the canvas sits behind the text and takes
  // no pointer events of its own.
  const ndc = useRef(new THREE.Vector2(10, 10));
  const lastMove = useRef(-10);
  useEffect(() => {
    if (reducedMotion) return;
    const move = (e: PointerEvent) => {
      ndc.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      lastMove.current = performance.now() / 1000;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reducedMotion]);

  // Retarget: bake where every particle is right now, then point it at the
  // new form. Runs only when the target changes.
  const current = useRef(-1);
  const retarget = (next: number) => {
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const to = geometry.getAttribute("aTo") as THREE.BufferAttribute;
    const mix = uniforms.uMix.value;
    const from = pos.array as Float32Array;
    const dest = to.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const local = Math.min(1, Math.max(0, (mix - seeds[i] * 0.45) / 0.55));
      const e = ease(local);
      const k = i * 3;
      from[k] += (dest[k] - from[k]) * e;
      from[k + 1] += (dest[k + 1] - from[k + 1]) * e;
      from[k + 2] += (dest[k + 2] - from[k + 2]) * e;
    }
    dest.set(shapes[next + 1]);
    pos.needsUpdate = true;
    to.needsUpdate = true;
    uniforms.uMix.value = reducedMotion ? 1 : 0;
    current.current = next;
  };

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const frames = useRef(0);
  useFrame((_, delta) => {
    frames.current += 1;
    if (frames.current % 20 === 0) {
      useDiag.getState().set({ stage: "rendering", frames: frames.current });
    }
    const target = useMorph.getState().target;
    if (target !== current.current) retarget(target);

    // Sit to the right of the headline on wide screens; centred and smaller
    // behind the text on narrow ones.
    const wide = size.width >= 900;
    group.current.position.x = wide ? 2.7 : 0;
    group.current.scale.setScalar(wide ? 1 : 0.72);

    if (reducedMotion) return;

    uniforms.uTime.value += delta;
    uniforms.uBoot.value = Math.min(1, uniforms.uBoot.value + delta / 1.6);
    uniforms.uMix.value = Math.min(1, uniforms.uMix.value + delta / MORPH_SECONDS);
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x = Math.sin(uniforms.uTime.value * 0.2) * 0.12;

    // Cursor influence fades in while the pointer moves and out when it rests.
    const active = performance.now() / 1000 - lastMove.current < 1.4;
    const s = uniforms.uPointerStrength;
    s.value += ((active ? 1 : 0) - s.value) * Math.min(1, delta * 4);
    raycaster.setFromCamera(ndc.current, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uPointer.value.copy(hit);
  });

  return (
    <group ref={group}>
      <points ref={points} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
