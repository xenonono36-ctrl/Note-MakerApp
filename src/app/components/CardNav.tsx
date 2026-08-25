"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, FilePlus2, Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { gsap } from "gsap";
import "./CardNav.css";

type CardNavProps = {
  topic: string;
  level: string;
  format: string;
  noteCount: number;
  alternateBackground: boolean;
  onNewNote: () => void;
  onToggleBackground: () => void;
};

export default function CardNav({
  topic,
  level,
  format,
  noteCount,
  alternateBackground,
  onNewNote,
  onToggleBackground,
}: CardNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const cards = cardsRef.current.filter(Boolean);
    const timeline = gsap.timeline({ paused: true });
    gsap.set(nav, { height: 62 });
    gsap.set(cards, { y: 18, opacity: 0 });
    timeline.to(nav, { height: 270, duration: 0.42, ease: "power3.out" });
    timeline.to(cards, { y: 0, opacity: 1, duration: 0.34, stagger: 0.07, ease: "power3.out" }, "-=0.2");
    timelineRef.current = timeline;
    return () => {
      timeline.kill();
      timelineRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (isOpen) timeline.play();
    else timeline.reverse();
  }, [isOpen]);

  const setCardRef = (index: number) => (element: HTMLDivElement | null) => {
    if (element) cardsRef.current[index] = element;
  };

  return (
    <div className="card-nav-container">
      <nav ref={navRef} className={`card-nav${isOpen ? " open" : ""}`} aria-label="Workspace navigation">
        <div className="card-nav-top">
          <button
            type="button"
            className="card-nav-menu"
            onClick={() => setIsOpen((current) => !current)}
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={18} /> : <Menu size={19} />}
          </button>
          <div className="card-nav-brand">
            <span className="card-nav-mark"><Sparkles size={14} /></span>
            <span>Chrono</span>
          </div>
          <button type="button" className="card-nav-cta" onClick={onNewNote}>
            <FilePlus2 size={15} />
            <span>New note</span>
          </button>
        </div>
        <div className="card-nav-content">
          <div className="nav-card nav-card-lime" ref={setCardRef(0)}>
            <div className="nav-card-label"><BookOpen size={16} /> Current note</div>
            <strong>{topic || "Untitled note"}</strong>
            <span className="nav-card-meta">Ready to read</span>
            <a className="nav-card-link" href="#study-guide">Jump to note <ArrowUpRight size={15} /></a>
          </div>
          <div className="nav-card nav-card-violet" ref={setCardRef(1)}>
            <div className="nav-card-label"><Sparkles size={16} /> Study setup</div>
            <strong>{level} · {format}</strong>
            <span className="nav-card-meta">{noteCount} saved {noteCount === 1 ? "note" : "notes"}</span>
            <a className="nav-card-link" href="#topic">Edit setup <ArrowUpRight size={15} /></a>
          </div>
          <div className="nav-card nav-card-cyan" ref={setCardRef(2)}>
            <div className="nav-card-label">Atmosphere</div>
            <strong>{alternateBackground ? "Dither field" : "Silk field"}</strong>
            <span className="nav-card-meta">Change the workspace mood</span>
            <button type="button" className="nav-card-link nav-card-action" onClick={onToggleBackground}>
              {alternateBackground ? <Sun size={15} /> : <Moon size={15} />} Switch background <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
