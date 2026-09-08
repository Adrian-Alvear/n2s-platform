"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A luminous ground plane receding to a horizon.
 *
 * The reference is not a scattering of dots — it is a dense FIELD seen from
 * standing height, lit in a pool around a figure and falling to pure black at
 * the edges. Three things carry that read, and an earlier version had none of
 * them:
 *
 *  1. GROUND PLANE, not a disc. Points spread far in z so the field recedes to
 *     a horizon instead of sitting in a ring around the camera.
 *  2. BOKEH. Near points are large and very soft; distant ones are small and
 *     sharp. That depth cue is most of what makes the reference read as
 *     photographed rather than drawn.
 *  3. COOL FIELD, WARM POOL. The blooms are blue-violet; only what the light
 *     reaches goes warm. A uniformly warm field reads as haze.
 */

const COUNT = 30000;
/** Half-width of the plane. */
const SPREAD_X = 34;
/** How far the field runs away from the camera. */
const DEPTH_FAR = 62;
const DEPTH_NEAR = 9;

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uBoot;
  attribute float aSeed;
  attribute float aScale;
  varying float vGlow;
  varying float vSeed;
  varying float vNear;

  void main() {
    vec3 p = position;

    // Blooms breathe on unrelated periods so the field never pulses together.
    p.y += sin(uTime * 0.28 + aSeed * 6.2831) * 0.055
         + sin(uTime * 0.17 + aSeed * 12.566) * 0.035;

    // The light pool is centred on the figure at the origin.
    float d = length(p.xz);
    vGlow = pow(1.0 - smoothstep(0.0, POOL_F, d), 2.0);
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    // Near points are large and soft — the depth cue that sells the frame.
    float depth = -mv.z;
    vNear = 1.0 - smoothstep(2.0, 26.0, depth);
    gl_PointSize = aScale * uBoot * (150.0 / depth) * (0.5 + vNear * 2.2);

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uCool;
  uniform vec3 uMid;
  uniform vec3 uWarm;
  uniform float uBoot;
  varying float vGlow;
  varying float vSeed;
  varying float vNear;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    // Near blooms defocus into soft discs; far ones stay tight.
    float edge = mix(0.30, 0.02, vNear);
    float alpha = smoothstep(0.5, edge, d);

    // Blue-violet field; warm only where the light reaches.
    vec3 col = mix(uCool, uMid, fract(vSeed * 31.7));
    col = mix(col, uWarm, smoothstep(0.15, 0.95, vGlow));

    // A minority burn brighter, so the field has texture rather than a wash.
    float spark = step(0.955, fract(vSeed * 97.31)) * 1.4;

    float lum = (0.30 + vGlow * 3.4) * (1.0 + spark);
    gl_FragColor = vec4(col * lum, alpha * (0.30 + vGlow * 0.9) * uBoot);
  }
`;

export function LuminousField({
  cool = "#3d4fa8",
  mid = "#7d6fd0",
  warm = "#f2e2bd",
  reducedMotion = false,
}: {
  cool?: string;
  mid?: string;
  warm?: string;
  reducedMotion?: boolean;
}) {
  const points = useRef<THREE.Points>(null!);
  const boot = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    const scale = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Spread across the plane, denser toward the centre line.
      const x = (Math.random() - 0.5) * 2;
      pos[i * 3] = Math.sign(x) * Math.pow(Math.abs(x), 1.3) * SPREAD_X;
      // Sit on the ground with a little scatter for volume.
      pos[i * 3 + 1] = Math.random() * 0.34 - 0.05;
      // Bias toward the far field, so the horizon reads dense.
      pos[i * 3 + 2] = DEPTH_NEAR - Math.pow(Math.random(), 0.75) * DEPTH_FAR;
      seed[i] = Math.random();
      scale[i] = 0.5 + Math.random() * 1.3;
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBoot: { value: 0 },
      uCool: { value: new THREE.Color(cool) },
      uMid: { value: new THREE.Color(mid) },
      uWarm: { value: new THREE.Color(warm) },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useFrame((_, delta) => {
    if (reducedMotion) {
      uniforms.uBoot.value = 1;
      return;
    }
    boot.current = Math.min(1, boot.current + delta / 2.8);
    uniforms.uBoot.value = 1 - Math.pow(1 - boot.current, 3);
    uniforms.uTime.value += delta;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={VERT.replace("POOL_F", "13.0")}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
