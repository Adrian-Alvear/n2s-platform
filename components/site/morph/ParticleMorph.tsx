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
  uniform float uPixelRatio;
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
    // Sized in CSS pixels: gl_PointSize is in framebuffer pixels, so it must
    // be scaled by the pixel ratio or points shrink on high-density screens.
    gl_PointSize = uSize * uPixelRatio * uBoot * (0.65 + fract(aSeed * 13.7) * 0.7) / -mv.z;
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
    // Solid core, soft rim: a 3px point that is all feather reads as nothing.
    float a = smoothstep(0.5, 0.22, d);

    // Settled particles are silver; moving ones warm to gold — the colour
    // carries the motion.
    vec3 col = mix(uCool, uWarm, vHeat);
    float spark = step(0.965, fract(vSeed * 91.7)) * 0.8;
    gl_FragColor = vec4(col * (1.2 + spark + vHeat * 0.9), a * (0.8 + vHeat * 0.2) * uBoot);
  }
`;

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function ParticleMorph({
  count,
  reducedMotion,
  big = false,
}: {
  count: number;
  reducedMotion: boolean;
  /** Development test: huge points, to rule out "too small to see". */
  big?: boolean;
}) {
  const points = useRef<THREE.Points>(null!);
  // The material actually being drawn. Per-frame updates go through this,
  // not through the memoised uniforms object: in development the two can
  // diverge (the drawn material ends up holding a different uniforms object),
  // which froze uBoot at 0 and drew every particle at size zero.
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const group = useRef<THREE.Group>(null!);
  const { camera, size, gl } = useThree();

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
      uSize: { value: big ? 160 : 30 },
      uPixelRatio: { value: 1 },
      uCool: { value: new THREE.Color("#c9d0dc") },
      uWarm: { value: new THREE.Color("#f0d9a8") },
    }),
    [reducedMotion, big],
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
    const U = mat.current.uniforms;
    const mix = U.uMix.value;
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
    U.uMix.value = reducedMotion ? 1 : 0;
    current.current = next;
  };

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const frames = useRef(0);
  useFrame((_, delta) => {
    if (!mat.current) return;
    const U = mat.current.uniforms;
    frames.current += 1;
    if (frames.current % 20 === 0) {
      useDiag.getState().set({ stage: "rendering", frames: frames.current });
    }
    U.uPixelRatio.value = gl.getPixelRatio();
    const target = useMorph.getState().target;
    if (target !== current.current) retarget(target);

    // Fit to what the camera can actually see. A fixed offset was tuned for a
    // wide screen and pushed the form off the right edge of a squarer window.
    const cam = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
    const halfW = halfH * (size.width / size.height);
    const wide = size.width >= 900;
    // Forms are ~2.3 units in radius; leave margin on every side.
    const fit = wide ? Math.min(halfW * 0.38, halfH * 0.45) : Math.min(halfW * 0.55, halfH * 0.34);
    group.current.position.x = wide ? halfW * 0.5 : 0;
    group.current.position.y = wide ? 0 : -halfH * 0.35;
    group.current.scale.setScalar(fit / 2.3);

    if (reducedMotion) return;

    U.uTime.value += delta;
    U.uBoot.value = Math.min(1, U.uBoot.value + delta / 1.6);
    U.uMix.value = Math.min(1, U.uMix.value + delta / MORPH_SECONDS);
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x = Math.sin(U.uTime.value * 0.2) * 0.12;

    // Cursor influence fades in while the pointer moves and out when it rests.
    const active = performance.now() / 1000 - lastMove.current < 1.4;
    const s = U.uPointerStrength;
    s.value += ((active ? 1 : 0) - s.value) * Math.min(1, delta * 4);
    raycaster.setFromCamera(ndc.current, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) U.uPointer.value.copy(hit);
  });

  return (
    <group ref={group}>
      <points ref={points} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={mat}
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
