"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural nebula backdrop — an inverted sphere the camera sits inside.
 *
 * Deliberately dim. The system reads as silver-on-black, so this is depth and
 * drift rather than colour: a dark field that is never quite flat, with a warm
 * bloom toward the core. Cheap by design — 4 octaves of value noise, no
 * textures, no video, and it renders behind everything with depth writes off.
 *
 * `tint` shifts the palette per node, so each micro-world sits in its own
 * ambience without swapping the backdrop out.
 */

const VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vPos;
  uniform float uTime;
  uniform vec3  uTint;
  uniform vec3  uCore;
  uniform float uStrength;

  // Value noise. Hash is the classic sin-fract trick: not statistically great,
  // but stable across drivers and plenty for a slow-drifting fog.
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 dir = normalize(vPos);

    // Two layers drifting at different rates and directions, so the field never
    // resolves into a repeating pattern.
    float n1 = fbm(dir * 1.6 + vec3(uTime * 0.012, uTime * 0.008, 0.0));
    float n2 = fbm(dir * 3.1 - vec3(0.0, uTime * 0.010, uTime * 0.014));
    float cloud = smoothstep(0.35, 0.95, n1 * 0.65 + n2 * 0.35);

    // Warm lift toward the ecliptic centre — the sun bleeding into the dust.
    float core = pow(max(0.0, 1.0 - length(dir.xz) * 1.1), 3.0) * (1.0 - abs(dir.y) * 0.8);

    vec3 col = uTint * cloud * uStrength + uCore * core * 0.16;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Nebula({
  tint = "#141a2e",
  core = "#f0d9a8",
  strength = 0.5,
}: {
  tint?: string;
  core?: string;
  strength?: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(tint) },
      uCore: { value: new THREE.Color(core) },
      uStrength: { value: strength },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
    // Eased toward the target so a node change crossfades the ambience rather
    // than cutting it.
    uniforms.uTint.value.lerp(new THREE.Color(tint), delta * 1.2);
    uniforms.uCore.value.lerp(new THREE.Color(core), delta * 1.2);
    uniforms.uStrength.value += (strength - uniforms.uStrength.value) * delta * 1.2;
  });

  return (
    // Inside-out sphere, depth writes off, rendered first so everything else
    // draws over it.
    <mesh scale={[-1, 1, 1]} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[300, 32, 24]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
