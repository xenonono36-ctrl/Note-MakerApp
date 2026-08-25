"use client";
import { useRef, useState } from "react";
import { Check, ChevronDown, Clipboard, ExternalLink, FileCode, FileText, LoaderCircle, Menu, Moon, PanelLeft, Sparkles, Sun, WandSparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function NoteBody({ note }: { note: string }) {
  const title = note.match(/^# (.+)$/m)?.[1] || "Untitled study note";
  const sections = Array.from(note.matchAll(/^## (.+)$/gm), (match) => match[1]);
  const content = note.replace(/^# .+\n?/, "");

  return <div className="study-guide-area">
    <nav className="note-tabs" aria-label="Study note sections">
      {sections.map((section, index) => <a href={`#note-section-${index}`} key={section}>{section}</a>)}
    </nav>
    <div className="notebook" id="study-guide">
      <div className="title-block">
        <div className="notebook-eyebrow">AI STUDY NOTE</div>
        <h1>{title}</h1>
        <div className="notebook-sub">Structured by Gemini · {sections.length || 1} sections</div>
      </div>
      <div className="study-sticky"><strong>Study focus</strong><br />Read the overview first, then use the review questions to test what you remember.</div>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        h2: ({ children }) => {
          const index = sections.findIndex((section) => section === String(children));
          return <h2 id={`note-section-${index < 0 ? 0 : index}`}>{children}</h2>;
        },
      }}>{content}</ReactMarkdown>
    </div>
  </div>;
}

export default function Home() {
  const [topic, setTopic] = useState(""); const [level, setLevel] = useState("Intermediate"); const [format, setFormat] = useState("Study guide"); const [focus, setFocus] = useState("Balanced coverage"); const [note, setNote] = useState(sampleNote); const [isGenerating, setIsGenerating] = useState(false); const [copied, setCopied] = useState(false); const [isDownloading, setIsDownloading] = useState(false); const [dark, setDark] = useState(false); const [sidebarCollapsed, setSidebarCollapsed] = useState(false); const noteAreaRef = useRef<HTMLDivElement>(null);
  async function generateNote() { if (!topic.trim()) return; setIsGenerating(true); try { const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, level, format, focus }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setNote(data.note); } catch (error) { setNote(`## Something needs attention\n\n${error instanceof Error ? error.message : "Unable to generate a note."}`); } finally { setIsGenerating(false); } }
  async function copyNote() { await navigator.clipboard.writeText(note); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  function getHtmlDocument() {
    const styles = Array.from(document.querySelectorAll("style")).map((style) => style.textContent || "").join("\n");
    const title = topic.trim() || "Lumen Study Note";
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>${styles}</style></head><body><main class="study-guide-export">${noteAreaRef.current?.innerHTML || ""}</main></body></html>`;
  }
  function createHtmlUrl() {
    return URL.createObjectURL(new Blob([getHtmlDocument()], { type: "text/html" }));
  }
  async function downloadNote() {
    if (!noteAreaRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = createHtmlUrl();
      link.download = `${(topic.trim() || "lumen-study-note").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}.html`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setIsDownloading(false);
    }
  }
  function openHtmlNote() {
    if (!noteAreaRef.current) return;
    window.open(createHtmlUrl(), "_blank", "noopener,noreferrer");
  }
  return <main className={`${dark ? "app dark" : "app"}${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span className="brand-name">Lumen</span><span className="brand-dot" /></div><button className="new-note" onClick={() => { setTopic(""); setNote(sampleNote); }}><WandSparkles size={16} /><span className="button-label">New note</span><span className="shortcut">⌘ N</span></button><div className="side-label">Your library</div><button className="library-item active"><FileText size={16} /><span>Asking better questions</span></button><button className="library-item"><FileText size={16} /><span>Photosynthesis</span></button><button className="library-item"><FileText size={16} /><span>Design principles</span></button><div className="sidebar-bottom"><button className="plain-button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}><PanelLeft size={16} /><span className="button-label">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span></button><div className="profile"><span>AM</span><div className="profile-details"><strong>Alex Morgan</strong><small>Personal workspace</small></div><ChevronDown size={14} /></div></div></aside>
    <section className="workspace"><header className="topbar"><button className="mobile-menu"><Menu size={19} /></button><div className="crumb"><span>New note</span><span>/</span><strong>{topic || "Untitled note"}</strong></div><div className="top-actions"><button title="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><button className="avatar">AM</button></div></header><div className="content"><div className="intro"><div><div className="eyebrow"><span className="status-dot" /> Gemini-powered workspace</div><h1>What would you like to understand?</h1><p>Give me a topic and I&apos;ll turn it into a clear, complete note you can actually use.</p></div><div className="sparkle-large"><Sparkles size={27} /></div></div>
      <div className="builder-panel"><label htmlFor="topic">Topic or question</label><textarea id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. How do neural networks learn?" rows={2} /><div className="controls"><div className="select-wrap"><span>Level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div><div className="select-wrap"><span>Format</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>Study guide</option><option>Deep dive</option><option>Cheat sheet</option></select></div><div className="select-wrap"><span>Focus</span><select value={focus} onChange={(event) => setFocus(event.target.value)}><option>Balanced coverage</option><option>Practical examples</option><option>Exam preparation</option></select></div><button className="generate" onClick={generateNote} disabled={isGenerating || !topic.trim()}>{isGenerating ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}{isGenerating ? "Building..." : "Build my note"}</button></div></div>
      <div className="note-header"><div><div className="note-kicker"><span className="green-dot" /> Ready to read</div><h2>{topic || "The Art of Asking Better Questions"}</h2></div><div className="note-tools"><button title="Copy note" onClick={copyNote}>{copied ? <Check size={16} /> : <Clipboard size={16} />}</button><button title="Open HTML in a new tab" onClick={openHtmlNote}><ExternalLink size={16} /></button><button title="Download HTML" onClick={downloadNote} disabled={isDownloading}>{isDownloading ? <LoaderCircle className="spin" size={16} /> : <FileCode size={16} />}</button></div></div><div ref={noteAreaRef}><NoteBody note={note} /></div><footer className="footer-note">Drafted with Gemini <span>•</span> Edit freely, make it yours</footer></div></section>
  </main>;
}