"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, forwardRef } from "react";
import { Color, Mesh } from "three";
import "./Silk.css";

type SilkProps = { speed?: number; scale?: number; color?: string; noiseIntensity?: number; rotation?: number; className?: string };
type SilkPlaneProps = { uniforms: Record<string, { value: unknown }> };

const vertexShader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader = `varying vec2 vUv; uniform float uTime,uSpeed,uScale,uRotation,uNoiseIntensity; uniform vec3 uColor; const float E=2.718281828; float noise(vec2 p){float g=E;vec2 r=g*sin(g*p);return fract(r.x*r.y*(1.0+p.x));} vec2 rotate(vec2 uv,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*uv;} void main(){float grain=noise(gl_FragCoord.xy);vec2 uv=rotate(vUv*uScale,uRotation);float t=uSpeed*uTime;uv.y+=.03*sin(8.0*uv.x-t);float pattern=.6+.4*sin(5.0*(uv.x+uv.y+cos(3.0*uv.x+5.0*uv.y)+.02*t)+sin(20.0*(uv.x+uv.y-.1*t)));vec3 color=uColor*pattern-grain/15.0*uNoiseIntensity;gl_FragColor=vec4(color,1.0);}`;

const SilkPlane = forwardRef<Mesh, SilkPlaneProps>(function SilkPlane({ uniforms }, ref) {
  const { viewport } = useThree();
  useLayoutEffect(() => {
    if (ref && typeof ref !== "function") ref.current?.scale.set(viewport.width, viewport.height, 1);
  }, [ref, viewport]);
  useFrame((_, delta) => {
    if (ref && typeof ref !== "function" && ref.current) {
      const material = ref.current.material as unknown as { uniforms: typeof uniforms };
      material.uniforms.uTime.value = Number(material.uniforms.uTime.value) + 0.1 * delta;
    }
  });
  return <mesh ref={ref}><planeGeometry args={[1, 1, 1, 1]} /><shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} /></mesh>;
});
SilkPlane.displayName = "SilkPlane";

function hexToRgb(hex: string) { const value = hex.replace("#", ""); return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255); }

export default function Silk({ speed = 5, scale = 1, color = "#7C3AED", noiseIntensity = 1.5, rotation = 0, className }: SilkProps) {
  const uniforms = useMemo(() => ({ uSpeed: { value: speed }, uScale: { value: scale }, uNoiseIntensity: { value: noiseIntensity }, uColor: { value: new Color(...hexToRgb(color)) }, uRotation: { value: rotation }, uTime: { value: 0 } }), []);
  useEffect(() => { uniforms.uSpeed.value = speed; uniforms.uScale.value = scale; uniforms.uNoiseIntensity.value = noiseIntensity; uniforms.uColor.value = new Color(...hexToRgb(color)); uniforms.uRotation.value = rotation; }, [color, noiseIntensity, rotation, scale, speed, uniforms]);
  const meshRef = useRef<Mesh>(null);
  return <div className={`silk-container ${className ?? ""}`}><Canvas dpr={[1, 2]} frameloop="always" gl={{ alpha: true, antialias: false }}><SilkPlane ref={meshRef} uniforms={uniforms} /></Canvas></div>;
}
