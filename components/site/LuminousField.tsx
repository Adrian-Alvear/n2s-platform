"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A luminous field receding into darkness.
 *
 * The front face's own visual language — deliberately NOT the orrery, which
 * belongs to the hub (§0). The reference is a single warm light standing in a
 * vast field of glowing points, everything else swallowed by black.
 *
 * Built as one Points system, so the whole field is a single draw call. The
 * per-point drift happens in the vertex shader, which means the animation
 * costs nothing on the CPU and nothing in React.
 *
 * Colour comes from the house palette rather than the reference's blue: points
 * run cool silver at the rim and warm toward the centre, so the field reads as
 * lit by one warm source — the same monochrome-plus-one-warm rule as §5.1.
 */

const COUNT = 22000;
/** Field radius. Points thin out toward the edge and vanish into the void. */
const RADIUS = 26;

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uBoot;
  attribute float aSeed;
  attribute float aScale;
  varying float vGlow;
  varying float vSeed;

  void main() {
    vec3 p = position;

    // Two sine waves at unrelated periods, so the field never pulses in unison.
    p.y += sin(uTime * 0.35 + aSeed * 6.2831) * 0.10
         + sin(uTime * 0.21 + aSeed * 12.566) * 0.06;

    float dist = length(p.xz);

    // Brightness falls off from the centre — this is what makes it read as one
    // light source rather than an evenly lit plane.
    float falloff = 1.0 - smoothstep(0.0, RADIUS_F, dist);
    vGlow = pow(falloff, 2.2);
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Size attenuates with depth so the field has real perspective.
    gl_PointSize = aScale * uBoot * (42.0 / -mv.z) * (0.7 + vGlow * 2.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform float uBoot;
  varying float vGlow;
  varying float vSeed;

  void main() {
    // Round, soft-edged point. Square sprites read as digital noise.
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.06, d);

    // Warm toward the centre, cool at the rim.
    vec3 col = mix(uCool, uWarm, vGlow * 0.85);

    // A minority of points burn brighter, so the field has texture rather than
    // a uniform wash.
    float spark = step(0.93, fract(vSeed * 97.31)) * 0.9;

    // toneMapped:false plus a value pushed past 1.0 is what Bloom catches.
    gl_FragColor = vec4(col * (1.0 + spark) * (0.9 + vGlow * 3.2), alpha * (0.55 + vGlow) * uBoot);
  }
`;

export function LuminousField({
  cool = "#b9c0cc",
  warm = "#f0d9a8",
  reducedMotion = false,
}: {
  cool?: string;
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
      // sqrt() keeps the areal density even; without it everything clumps
      // at the centre.
      // pow < 0.5 biases toward the centre, so density falls off with the
      // light rather than staying uniform to the horizon.
      const r = Math.pow(Math.random(), 0.62) * RADIUS;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = Math.random();
      scale[i] = 0.6 + Math.random() * 1.1;
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
      uWarm: { value: new THREE.Color(warm) },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useFrame((_, delta) => {
    if (reducedMotion) {
      uniforms.uBoot.value = 1;
      return;
    }
    // The field resolves out of darkness rather than popping in.
    boot.current = Math.min(1, boot.current + delta / 2.4);
    uniforms.uBoot.value = 1 - Math.pow(1 - boot.current, 3);
    uniforms.uTime.value += delta;
    // Barely-perceptible rotation: enough that the field is never static.
    points.current.rotation.y += delta * 0.008;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={VERT.replace("RADIUS_F", RADIUS.toFixed(1))}
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
