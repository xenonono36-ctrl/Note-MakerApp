"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";
import "./Ferrofluid.css";

type FlowDirection = "up" | "down" | "left" | "right";

type FerrofluidProps = {
  className?: string;
  dpr?: number;
  paused?: boolean;
  colors?: string[];
  speed?: number;
  scale?: number;
  turbulence?: number;
  fluidity?: number;
  rimWidth?: number;
  sharpness?: number;
  shimmer?: number;
  glow?: number;
  flowDirection?: FlowDirection;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  mouseRadius?: number;
  mouseDampening?: number;
  mixBlendMode?: React.CSSProperties["mixBlendMode"];
};

const MAX_COLORS = 8;
const vertex = `attribute vec2 position; attribute vec2 uv; varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,0.,1.);}`;
const legacyFragment = `precision highp float; uniform vec3 iResolution; uniform vec2 iMouse; uniform float iTime; uniform vec3 uColor0,uColor1,uColor2,uColor3,uColor4,uColor5,uColor6,uColor7; uniform int uColorCount; uniform vec2 uFlow; uniform float uSpeed,uScale,uTurbulence,uFluidity,uRimWidth,uSharpness,uShimmer,uGlow,uOpacity,uMouseEnabled,uMouseStrength,uMouseRadius; varying vec2 vUv; #define PI 3.14159265
vec3 palette(float h){int c=max(uColorCount,1);int i=int(floor(clamp(h,0.,.999999)*float(c)));if(i<=0)return uColor0;if(i==1)return uColor1;if(i==2)return uColor2;if(i==3)return uColor3;if(i==4)return uColor4;if(i==5)return uColor5;if(i==6)return uColor6;return uColor7;}
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+33.33);return fract((p.x+p.y)*p.z);} float smin(float a,float b,float k){float r=exp2(-a/k)+exp2(-b/k);return-k*log2(r);} float sinlerp(float a,float b,float w){return mix(a,b,(sin(w*PI-PI/2.)+1.)/2.);} float vn(vec2 p,float s,float seed){vec2 c=floor(p/s),r=mod(p,s);float a=hash(vec3(c,seed)),b=hash(vec3(c.x+1.,c.y,seed)),d=hash(vec3(c.x+1.,c.y+1.,seed)),e=hash(vec3(c.x,c.y+1.,seed));return sinlerp(sinlerp(a,b,r.x/s),sinlerp(e,d,r.x/s),r.y/s);} float dbn(vec2 p,float s,float seed){float o=s/2.;return(2.*vn(p,s,seed)+1.5*vn(p+vec2(o,o),s,seed+.1)+1.25*vn(p+vec2(-o,o),s,seed+.2)+1.125*vn(p+vec2(o,-o),s,seed+.3)+vn(p+vec2(-o,-o),s,seed+.4))/7.;}
void main(){float ref=700./max(uScale,.05);vec2 p=vUv*iResolution.xy/iResolution.y*ref;float t=iTime,spd=200.*uSpeed;vec2 dir=uFlow,perp=vec2(-dir.y,dir.x);float d1=vn(p+perp*(t*spd),60.,10.)*50.*uTurbulence,d2=vn(p-perp*(t*spd),120.,15.)*100.*uTurbulence;float peaks=dbn(p+d1+dir*(t*spd*.5),40.,1.),peaks2=dbn(p+d2-dir*(t*spd*.5),40.,0.),map=smin(peaks,peaks2,max(uFluidity,.001));float mg=0.;if(uMouseEnabled>.5){vec2 mp=iMouse/iResolution.y*ref;float md=length(p-mp)/ref;float rr=max(uMouseRadius,.02);mg=exp(-md*md/(rr*rr))*uMouseStrength;}float band=(uRimWidth-abs((map-.4)*2.))*5.;float light=clamp(band-vn(p+dir*(t*spd*.5),60.,12.)*uShimmer,0.,1.);light=pow(light,uSharpness)*uGlow*clamp(1.-mg,0.,1.);vec3 col=palette(clamp(.5+(peaks-peaks2)*.8,0.,1.));vec3 outc=col*light;float a=clamp(max(outc.r,max(outc.g,outc.b)),0.,1.);gl_FragColor=vec4(outc,a*uOpacity);}`;

const fragment = `precision highp float; uniform vec3 iResolution; uniform vec2 iMouse; uniform float iTime; uniform vec3 uColor0; uniform vec3 uColor1; uniform vec3 uColor2; uniform float uSpeed; uniform float uScale; uniform float uOpacity; uniform float uMouseEnabled; uniform float uMouseStrength; varying vec2 vUv;
void main(){vec2 p=(vUv-.5)*vec2(iResolution.x/iResolution.y,1.)*uScale;vec2 mouse=iMouse/max(iResolution.xy,vec2(1.));mouse=(mouse-.5)*vec2(iResolution.x/iResolution.y,1.)*uScale;float t=iTime*uSpeed;float wave=sin(p.x*5.+sin(p.y*4.+t)*1.8+t)+sin(p.y*7.-t*1.4)*.55;float cursor=exp(-length(p-mouse)*8.)*uMouseEnabled*uMouseStrength;float bands=abs(sin(wave*2.4+cursor*3.));float rim=smoothstep(.72,.98,bands);float shade=smoothstep(-1.2,1.2,wave);vec3 color=mix(mix(uColor0,uColor1,shade),uColor2,smoothstep(.35,.8,bands));gl_FragColor=vec4(color*rim*uOpacity,rim*uOpacity);}`;

function hexToRgb(hex: string) {
  const value = hex.replace("#", "").padEnd(6, "0");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
}

function flowVector(direction: FlowDirection) {
  return { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] }[direction];
}

export default function Ferrofluid({
  className,
  dpr,
  paused = false,
  colors = ["#c9ef65", "#82d8c8", "#ffffff"],
  speed = 0.35,
  scale = 1.6,
  turbulence = 1,
  fluidity = 0.1,
  rimWidth = 0.2,
  sharpness = 2.5,
  shimmer = 1.5,
  glow = 2,
  flowDirection = "down",
  opacity = 0.28,
  mouseInteraction = true,
  mouseStrength = 1,
  mouseRadius = 0.35,
  mouseDampening = 0.15,
  mixBlendMode,
}: FerrofluidProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new Renderer({ dpr: dpr ?? (window.devicePixelRatio || 1), alpha: true, antialias: true });
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.cssText = "width:100%;height:100%;display:block";
    container.appendChild(canvas);
    const prepared = colors.slice(0, MAX_COLORS).length ? colors.slice(0, MAX_COLORS) : ["#ffffff"];
    const rgb = [...prepared, ...Array(MAX_COLORS).fill(prepared[prepared.length - 1])].map(hexToRgb);
    const uniforms = {
      iResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1] }, iMouse: { value: [0, 0] }, iTime: { value: 0 },
      uColor0: { value: rgb[0] }, uColor1: { value: rgb[1] }, uColor2: { value: rgb[2] }, uColor3: { value: rgb[3] }, uColor4: { value: rgb[4] }, uColor5: { value: rgb[5] }, uColor6: { value: rgb[6] }, uColor7: { value: rgb[7] }, uColorCount: { value: prepared.length }, uFlow: { value: flowVector(flowDirection) }, uSpeed: { value: speed }, uScale: { value: scale }, uTurbulence: { value: turbulence }, uFluidity: { value: fluidity }, uRimWidth: { value: rimWidth }, uSharpness: { value: sharpness }, uShimmer: { value: shimmer }, uGlow: { value: glow }, uOpacity: { value: opacity }, uMouseEnabled: { value: mouseInteraction ? 1 : 0 }, uMouseStrength: { value: mouseStrength }, uMouseRadius: { value: mouseRadius },
    };
    const program = new Program(gl, { vertex, fragment, uniforms });
    const geometry = new Triangle(gl);
    const mesh = new Mesh(gl, { geometry, program });
    const resize = () => { const rect = container.getBoundingClientRect(); renderer.setSize(rect.width, rect.height); uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1]; };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const target = [0, 0];
    const move = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); const ratio = renderer.dpr || 1; target[0] = (event.clientX - rect.left) * ratio; target[1] = (rect.height - event.clientY + rect.top) * ratio; };
    if (mouseInteraction) canvas.addEventListener("pointermove", move);
    let frame = 0; let last = 0;
    const loop = (time: number) => { frame = requestAnimationFrame(loop); uniforms.iTime.value = time * 0.001; if (mouseDampening > 0) { const dt = last ? (time - last) / 1000 : 0; const factor = 1 - Math.exp(-dt / Math.max(mouseDampening, 0.0001)); uniforms.iMouse.value[0] += (target[0] - uniforms.iMouse.value[0]) * factor; uniforms.iMouse.value[1] += (target[1] - uniforms.iMouse.value[1]) * factor; } else uniforms.iMouse.value = target; last = time; if (!paused) renderer.render({ scene: mesh, sort: false, frustumCull: false }); };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); if (mouseInteraction) canvas.removeEventListener("pointermove", move); if (canvas.parentElement === container) container.removeChild(canvas); program.remove(); geometry.remove(); };
  }, [colors, dpr, paused, speed, scale, turbulence, fluidity, rimWidth, sharpness, shimmer, glow, flowDirection, opacity, mouseInteraction, mouseStrength, mouseRadius, mouseDampening]);

  return <div ref={containerRef} className={`ferrofluid-container ${className ?? ""}`} style={{ mixBlendMode }} aria-hidden="true" />;
}
