"use client";

import { gsap } from "gsap";
import { useEffect, useMemo, useRef } from "react";
import "./TargetCursor.css";

type TargetCursorProps = { targetSelector?: string; hideDefaultCursor?: boolean; hoverDuration?: number; parallaxOn?: boolean; cursorColor?: string; cursorColorOnTarget?: string };

export default function TargetCursor({ targetSelector = ".cursor-target", hideDefaultCursor = true, hoverDuration = 0.2, parallaxOn = true, cursorColor = "#ffffff", cursorColorOnTarget = "#d8b4fe" }: TargetCursorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<HTMLDivElement[]>([]);
  const isMobile = useMemo(() => typeof window !== "undefined" && (window.innerWidth <= 768 || "ontouchstart" in window || navigator.maxTouchPoints > 0), []);

  useEffect(() => {
    if (isMobile || !wrapperRef.current) return;
    const wrapper = wrapperRef.current;
    const corners = cornersRef.current;
    const originalCursor = document.body.style.cursor;
    if (hideDefaultCursor) document.body.style.cursor = "none";
    const move = (event: MouseEvent) => gsap.set(wrapper, { x: event.clientX, y: event.clientY });
    const down = () => { gsap.to(wrapper, { scale: 0.88, duration: 0.15 }); gsap.to(dotRef.current, { scale: 0.7, duration: 0.15 }); };
    const up = () => { gsap.to(wrapper, { scale: 1, duration: 0.2 }); gsap.to(dotRef.current, { scale: 1, duration: 0.2 }); };
    let active: Element | null = null;
    let leave: (() => void) | null = null;
    let parallax: ((event: Event) => void) | null = null;
    const reset = () => { if (leave) leave(); };
    const enter = (event: MouseEvent) => {
      const target = (event.target as Element).closest(targetSelector);
      if (!target || target === active) return;
      reset(); active = target;
      const rect = target.getBoundingClientRect();
      const positions = [{ x: rect.left - 3, y: rect.top - 3 }, { x: rect.right - 12 + 3, y: rect.top - 3 }, { x: rect.right - 12 + 3, y: rect.bottom - 12 + 3 }, { x: rect.left - 3, y: rect.bottom - 12 + 3 }];
      corners.forEach((corner, index) => gsap.to(corner, { x: positions[index].x - (gsap.getProperty(wrapper, "x") as number), y: positions[index].y - (gsap.getProperty(wrapper, "y") as number), duration: hoverDuration, ease: "power2.out", borderColor: cursorColorOnTarget }));
      gsap.to(dotRef.current, { backgroundColor: cursorColorOnTarget, duration: 0.15 });
      const leaveHandler = () => { target.removeEventListener("mouseleave", leaveHandler); if (parallax) target.removeEventListener("mousemove", parallax); corners.forEach((corner, index) => gsap.to(corner, { x: [-18, 6, 6, -18][index], y: [-18, -18, 6, 6][index], duration: 0.3, ease: "power3.out", borderColor: cursorColor })); gsap.to(dotRef.current, { backgroundColor: cursorColor, duration: 0.15 }); active = null; leave = null; parallax = null; };
      leave = leaveHandler; target.addEventListener("mouseleave", leaveHandler);
      if (parallaxOn) { parallax = (event) => { const moveEvent = event as MouseEvent; const x = ((moveEvent.clientX - rect.left) / rect.width - 0.5) * 8; const y = ((moveEvent.clientY - rect.top) / rect.height - 0.5) * 8; corners.forEach((corner, index) => gsap.to(corner, { x: positions[index].x - (gsap.getProperty(wrapper, "x") as number) + x, y: positions[index].y - (gsap.getProperty(wrapper, "y") as number) + y, duration: 0.15, overwrite: true })); }; target.addEventListener("mousemove", parallax); }
    };
    wrapper.style.color = cursorColor;
    window.addEventListener("mousemove", move); window.addEventListener("mouseover", enter); window.addEventListener("mousedown", down); window.addEventListener("mouseup", up);
    return () => { if (leave) leave(); window.removeEventListener("mousemove", move); window.removeEventListener("mouseover", enter); window.removeEventListener("mousedown", down); window.removeEventListener("mouseup", up); document.body.style.cursor = originalCursor; };
  }, [cursorColor, cursorColorOnTarget, hideDefaultCursor, hoverDuration, isMobile, parallaxOn, targetSelector]);

  if (isMobile) return null;
  const addCorner = (element: HTMLDivElement | null) => { if (element && !cornersRef.current.includes(element)) cornersRef.current.push(element); };
  return <div ref={wrapperRef} className="target-cursor-wrapper" aria-hidden="true"><div ref={dotRef} className="target-cursor-dot" style={{ backgroundColor: cursorColor }} /><div ref={addCorner} className="target-cursor-corner corner-tl" style={{ borderColor: cursorColor }} /><div ref={addCorner} className="target-cursor-corner corner-tr" style={{ borderColor: cursorColor }} /><div ref={addCorner} className="target-cursor-corner corner-br" style={{ borderColor: cursorColor }} /><div ref={addCorner} className="target-cursor-corner corner-bl" style={{ borderColor: cursorColor }} /></div>;
}
