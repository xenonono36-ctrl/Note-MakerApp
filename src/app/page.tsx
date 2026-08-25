"use client";
import { useState } from "react";
import { BookOpen, Check, ChevronDown, Clipboard, FileText, LoaderCircle, Menu, Moon, PanelLeft, Sparkles, Sun, WandSparkles } from "lucide-react";

const sampleNote = `# The Art of Asking Better Questions

## A quick orientation

Good questions are not just requests for information. They are tools for **thinking clearly**, uncovering assumptions, and moving a conversation forward. A strong question gives the other person enough context to respond meaningfully while leaving room for an answer you could not have predicted.

## The three layers of a strong question

### 1. Intent
Before asking, name what you are trying to learn. Are you looking for a fact, a perspective, a decision, or a possibility? Clear intent keeps a question from becoming a disguised statement.

### 2. Context
Add only the background that changes the answer. “How can we improve this?” is broad; “Which part of this onboarding flow creates the most hesitation for first-time users?” gives the answer somewhere useful to land.

### 3. Openness
Avoid building the answer into the wording. “Why did this fail?” assumes failure and blame. “What happened here, and what should we learn from it?” invites observation before judgment.

## A practical pattern

Try the **question ladder**: start broad, then narrow. Ask what someone notices, what they think it means, what evidence supports that view, and what they would try next. This pattern works in interviews, research, teaching, and everyday decisions.

> A question is a small structure for someone else’s attention.

## Common misconceptions

- **More detail is always better.** Too much framing can make the real question hard to find.
- **Open questions are always superior.** A precise yes-or-no question is often the fastest way to establish a shared fact.
- **The smartest question is the most complex one.** Useful questions reduce complexity for the person answering.

## Review

1. What are the three layers of a strong question?
2. When might a closed question be more useful than an open one?
3. Rewrite “Why is our product confusing?” using the question ladder.`;

export default function Home() {
  const [topic, setTopic] = useState(""); const [level, setLevel] = useState("Intermediate"); const [format, setFormat] = useState("Study guide"); const [focus, setFocus] = useState("Balanced coverage"); const [note, setNote] = useState(sampleNote); const [isGenerating, setIsGenerating] = useState(false); const [copied, setCopied] = useState(false); const [dark, setDark] = useState(false);
  async function generateNote() { if (!topic.trim()) return; setIsGenerating(true); try { const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, level, format, focus }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setNote(data.note); } catch (error) { setNote(`## Something needs attention\n\n${error instanceof Error ? error.message : "Unable to generate a note."}`); } finally { setIsGenerating(false); } }
  async function copyNote() { await navigator.clipboard.writeText(note); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  function downloadNote() { const blob = new Blob([note], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "lumen-note.md"; link.click(); URL.revokeObjectURL(url); }
  return <main className={dark ? "app dark" : "app"}>
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>Lumen</span><span className="brand-dot" /></div><button className="new-note" onClick={() => { setTopic(""); setNote(sampleNote); }}><WandSparkles size={16} /> New note <span>⌘ N</span></button><div className="side-label">Your library</div><button className="library-item active"><FileText size={16} /><span>Asking better questions</span></button><button className="library-item"><FileText size={16} /><span>Photosynthesis</span></button><button className="library-item"><FileText size={16} /><span>Design principles</span></button><div className="sidebar-bottom"><button className="plain-button"><PanelLeft size={16} /> Collapse sidebar</button><div className="profile"><span>AM</span><div><strong>Alex Morgan</strong><small>Personal workspace</small></div><ChevronDown size={14} /></div></div></aside>
    <section className="workspace"><header className="topbar"><button className="mobile-menu"><Menu size={19} /></button><div className="crumb"><span>New note</span><span>/</span><strong>{topic || "Untitled note"}</strong></div><div className="top-actions"><button title="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="avatar">AM</button></div></header><div className="content"><div className="intro"><div><div className="eyebrow"><span className="status-dot" /> Claude-powered workspace</div><h1>What would you like to understand?</h1><p>Give me a topic and I&apos;ll turn it into a clear, complete note you can actually use.</p></div><div className="sparkle-large"><Sparkles size={27} /></div></div>
      <div className="builder-panel"><label htmlFor="topic">Topic or question</label><textarea id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. How do neural networks learn?" rows={2} /><div className="controls"><div className="select-wrap"><span>Level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div className="select-wrap"><span>Format</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>Study guide</option><option>Deep dive</option><option>Cheat sheet</option></select></div><div className="select-wrap"><span>Focus</span><select value={focus} onChange={(event) => setFocus(event.target.value)}><option>Balanced coverage</option><option>Practical examples</option><option>Exam preparation</option></select></div><button className="generate" onClick={generateNote} disabled={isGenerating || !topic.trim()}>{isGenerating ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{isGenerating ? "Building..." : "Build my note"}</button></div></div>
      <div className="note-header"><div><div className="note-kicker"><span className="green-dot" /> Ready to read</div><h2>{topic || "The Art of Asking Better Questions"}</h2></div><div className="note-tools"><button title="Copy note" onClick={copyNote}>{copied ? <Check size={16} /> : <Clipboard size={16} />}</button><button title="Download note" onClick={downloadNote}><BookOpen size={16} /></button></div></div><article className="note-paper">{note.split("\n").map((line, index) => line.startsWith("# ") ? <h3 key={index}>{line.slice(2)}</h3> : line.startsWith("## ") ? <h4 key={index}>{line.slice(3)}</h4> : line.startsWith("### ") ? <h5 key={index}>{line.slice(4)}</h5> : line.startsWith("> ") ? <blockquote key={index}>{line.slice(2)}</blockquote> : line.match(/^\d+\. /) ? <p className="list-line" key={index}><b>{line.match(/^\d+/)?.[0]}.</b>{line.replace(/^\d+\. /, "")}</p> : line.startsWith("- ") ? <p className="list-line" key={index}><b>•</b>{line.slice(2)}</p> : line ? <p key={index}>{line}</p> : <div className="line-break" key={index} />)}</article><footer className="footer-note">Drafted with Claude <span>•</span> Edit freely, make it yours</footer></div></section>
  </main>;
}