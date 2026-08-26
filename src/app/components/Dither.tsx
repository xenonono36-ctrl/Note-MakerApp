"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, ShaderMaterial, Vector2 } from "three";
import "./Dither.css";

type DitherProps = { waveSpeed?: number; waveFrequency?: number; waveAmplitude?: number; waveColor?: [number, number, number]; colorNum?: number; pixelSize?: number; disableAnimation?: boolean; enableMouseInteraction?: boolean; mouseRadius?: number };

const vertexShader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader = `precision highp float; varying vec2 vUv; uniform vec2 resolution; uniform float time,waveSpeed,waveFrequency,waveAmplitude,colorNum,pixelSize; uniform vec3 waveColor; uniform vec2 mousePos; uniform float mouseRadius; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);} float fbm(vec2 p){float value=0.;float amplitude=1.;for(int i=0;i<4;i++){value+=amplitude*abs(noise(p));p*=waveFrequency;amplitude*=waveAmplitude;}return value;} void main(){vec2 uv=gl_FragCoord.xy/resolution.xy-.5;uv.x*=resolution.x/resolution.y;vec2 mouse=(mousePos/resolution-.5)*vec2(resolution.x/resolution.y,-1.);float influence=1.-smoothstep(0.,mouseRadius,length(uv-mouse));vec2 flow=uv+time*waveSpeed+influence*.18;float wave=fbm(flow+fbm(flow+sin(flow.yx*4.+time)*.4));vec3 color=waveColor*clamp(wave,0.,1.);vec2 pixel=floor(gl_FragCoord.xy/max(pixelSize,1.));float threshold=fract(dot(mod(pixel,4.),vec2(.125,.375)));float levels=max(colorNum-1.,1.);color=step(vec3(threshold),color)*floor(color*levels+.5)/levels;gl_FragColor=vec4(color,1.);}`;

function DitherScene({ props }: { props: Required<Pick<DitherProps, "waveSpeed" | "waveFrequency" | "waveAmplitude" | "waveColor" | "colorNum" | "pixelSize" | "mouseRadius" | "disableAnimation" | "enableMouseInteraction">> }) {
  const materialRef = useRef<ShaderMaterial>(null);
  const { viewport, size, gl } = useThree();
  const mouse = useRef(new Vector2(-1000, -1000));
  const elapsedTime = useRef(0);
  const uniforms = useRef({ resolution: { value: new Vector2(1, 1) }, time: { value: 0 }, waveSpeed: { value: props.waveSpeed }, waveFrequency: { value: props.waveFrequency }, waveAmplitude: { value: props.waveAmplitude }, colorNum: { value: props.colorNum }, pixelSize: { value: props.pixelSize }, waveColor: { value: new Color(...props.waveColor) }, mousePos: { value: mouse.current }, mouseRadius: { value: props.mouseRadius } });
  useEffect(() => { const dpr = gl.getPixelRatio(); uniforms.current.resolution.value.set(size.width * dpr, size.height * dpr); }, [gl, size]);
  useEffect(() => { const element = gl.domElement; const move = (event: PointerEvent) => { const rect = element.getBoundingClientRect(); mouse.current.set((event.clientX - rect.left) * gl.getPixelRatio(), (event.clientY - rect.top) * gl.getPixelRatio()); }; if (props.enableMouseInteraction) element.addEventListener("pointermove", move); return () => element.removeEventListener("pointermove", move); }, [gl, props.enableMouseInteraction]);
  useFrame((_, delta) => { const values = uniforms.current; if (!props.disableAnimation) { elapsedTime.current += delta; values.time.value = elapsedTime.current; } values.waveSpeed.value = props.waveSpeed; values.waveFrequency.value = props.waveFrequency; values.waveAmplitude.value = props.waveAmplitude; values.colorNum.value = props.colorNum; values.pixelSize.value = props.pixelSize; values.waveColor.value.set(...props.waveColor); values.mouseRadius.value = props.mouseRadius; });
  return <mesh scale={[viewport.width, viewport.height, 1]}><planeGeometry args={[1, 1]} /><shaderMaterial ref={materialRef} uniforms={uniforms.current} vertexShader={vertexShader} fragmentShader={fragmentShader} /></mesh>;
}

export default function Dither({ waveSpeed = 0.05, waveFrequency = 3, waveAmplitude = 0.3, waveColor = [0.38823529411764707, 0.4, 0.9450980392156862], colorNum = 4, pixelSize = 2, disableAnimation = false, enableMouseInteraction = true, mouseRadius = 0.3 }: DitherProps) {
  return <div className="dither-container"><Canvas camera={{ position: [0, 0, 6] }} dpr={1}><DitherScene props={{ waveSpeed, waveFrequency, waveAmplitude, waveColor, colorNum, pixelSize, mouseRadius, disableAnimation, enableMouseInteraction }} /></Canvas></div>;
}
