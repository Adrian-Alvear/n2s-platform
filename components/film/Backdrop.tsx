"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The film's world: a lit space rather than flat black.
 *
 * An inverted sphere the camera sits inside. Mostly void, with a soft cool
 * glow behind the form, a faint warm counter-light low on the other side, and
 * a slow drift so the dark is never quite static. It also gives the glass
 * something to refract — glass in front of pure black just looks black.
 */

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform float uTime;
  uniform vec3 uVoid;
  uniform vec3 uCool;
  uniform vec3 uWarm;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vec3 d = normalize(vDir);
    // Key glow behind the form, slightly up.
    float key = pow(max(dot(d, normalize(vec3(0.15, 0.18, -1.0))), 0.0), 11.0);
    // Warm counter-light, low and to the left, much weaker.
    float rim = pow(max(dot(d, normalize(vec3(-0.9, -0.35, -0.4))), 0.0), 7.0);
    // A barely-there horizon band, so the space has an orientation.
    float band = exp(-pow(d.y * 9.0, 2.0)) * 0.12;
    // Slow drifting haze.
    float haze = noise(d * 2.4 + vec3(uTime * 0.015, 0.0, uTime * 0.01)) * 0.5 + 0.5;

    vec3 col = uVoid;
    col += uCool * (key * 0.9 + band * 0.25) * mix(0.8, 1.1, haze);
    col += uWarm * rim * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Backdrop() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVoid: { value: new THREE.Color("#020306") },
      uCool: { value: new THREE.Color("#1c2436") },
      uWarm: { value: new THREE.Color("#2a2114") },
    }),
    [],
  );
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  return (
    <mesh scale={[-1, 1, 1]} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[80, 48, 32]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
