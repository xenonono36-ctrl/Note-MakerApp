"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Check,
  ChevronDown,
  Clipboard,
  ExternalLink,
  FileCode,
  FileText,
  LoaderCircle,
  Minus,
  Paperclip,
  PanelLeft,
  Plus,
  Sparkles,
  Target,
  TimerReset,
  ArrowRightLeft,
  Pause,
  Play,
  WandSparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import "katex/dist/katex.min.css";
import Silk from "./components/Silk";
import Dither from "./components/Dither";
import TargetCursor from "./components/TargetCursor";
import CardNav from "./components/CardNav";
import { buildStudyRoutine, getStudyPhases, normalizePrepMinutes } from "../lib/studyRoutine";
import Image from "next/image";
import chronoLogo from "./logo.png";

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

const goalOptions = [
  "Understand and remember the key information",
  "Prepare for an exam",
  "Learn the topic from beginner level",
  "Review quickly before a test",
  "Apply the ideas in practice",
];

const LIBRARY_STORAGE_KEY = "lumen-study-library-v1";

type SavedStudyNote = {
  id: string;
  title: string;
  topic: string;
  content: string;
  updatedAt: number;
  settings: NoteSettings;
};

type NoteSettings = {
  level: string;
  format: string;
  focus: string;
  goal: string;
  prepAmount: string;
  prepUnit: "minutes" | "hours" | "days";
};

const defaultNoteSettings: NoteSettings = {
  level: "Intermediate",
  format: "Study guide",
  focus: "Balanced coverage",
  goal: "Understand and remember the key information",
  prepAmount: "45",
  prepUnit: "minutes",
};

function createSavedStudyNote(topic: string, content: string, settings: NoteSettings): SavedStudyNote {
  const safeTopic = topic.trim() || "Untitled note";
  const title = content.match(/^# (.+)$/m)?.[1] || safeTopic;

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    topic: safeTopic,
    content,
    updatedAt: Date.now(),
    settings,
  };
}

function formatUpdatedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

function decodeMathEntities(markdown: string) {
  const decode = (expression: string) =>
    expression
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

  return markdown.replace(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, (match, block, inline) => {
    if (block !== undefined) return `$$${decode(block)}$$`;
    return `$${decode(inline)}$`;
  });
}

function NoteBody({ note, topic }: { note: string; topic: string }) {
  const title = note.match(/^# (.+)$/m)?.[1] || topic || "Untitled study note";
  const sections = Array.from(
    note.matchAll(/^## (.+)$/gm),
    (match) => match[1],
  );
  const content = note.replace(/^# .+\n?/, "");
  const renderableContent = decodeMathEntities(content);

  return (
    <div className="study-guide-area">
      <nav className="note-tabs" aria-label="Study note sections">
        {sections.map((section, index) => (
          <a href={`#note-section-${index}`} key={section}>
            <span>{section}</span>
          </a>
        ))}
      </nav>
      <div className="notebook" id="study-guide">
        <div className="title-block">
          <div className="notebook-eyebrow">AI STUDY NOTE</div>
          <h1>{title}</h1>
          <div className="notebook-sub">
            Structured by Gemini · {sections.length || 1} sections
          </div>
        </div>
        <div className="study-sticky">
          <strong>Study focus</strong>
          <br />
          Read the overview first, then use the review questions to test what
          you remember.
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSanitize]}
          components={{
            h2: ({ children }) => {
              const index = sections.findIndex(
                (section) => section === String(children),
              );
              return (
                <h2 id={`note-section-${index < 0 ? 0 : index}`}>{children}</h2>
              );
            },
          }}
        >
          {renderableContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function RoutineTimers({ totalMinutes }: { totalMinutes: number }) {
  const phases = getStudyPhases(totalMinutes);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    phases.map((phase) => phase.minutes * 60),
  );
  const [runningPhase, setRunningPhase] = useState<number | null>(null);

  useEffect(() => {
    setSecondsLeft(phases.map((phase) => phase.minutes * 60));
    setRunningPhase(null);
  }, [totalMinutes]);

  useEffect(() => {
    if (runningPhase === null) return;
    if (secondsLeft[runningPhase] === 0) {
      setRunningPhase(null);
      return;
    }
    const timeout = window.setTimeout(() => {
      setSecondsLeft((current) =>
        current.map((seconds, index) =>
          index === runningPhase ? Math.max(0, seconds - 1) : seconds,
        ),
      );
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [runningPhase, secondsLeft]);

  function formatTimer(seconds: number) {
    return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  }

  function adjustTimer(index: number, amount: number) {
    if (runningPhase !== null) return;
    setSecondsLeft((current) =>
      current.map((seconds, timerIndex) =>
        timerIndex === index ? Math.max(60, seconds + amount * 60) : seconds,
      ),
    );
  }

  return (
    <div className="routine-timers" aria-label="Study phase timers">
      <div className="routine-timers-heading">
        <span>Phase timers</span>
        <small>Start each block when you are ready</small>
      </div>
      <div className="routine-timer-grid">
        {phases.map((phase, index) => (
          <div className={`routine-timer ${runningPhase === index ? "active" : ""}`} key={phase.name}>
            <div className="routine-timer-label">
              <strong>{phase.name}</strong>
              <span>{phase.minutes} min allotted</span>
            </div>
            <div
              className="routine-timer-progress"
              style={{ "--timer-progress": `${(secondsLeft[index] / (phase.minutes * 60)) * 100}%` } as React.CSSProperties}
            >
              <output aria-label={`${phase.name} time remaining`}>{formatTimer(secondsLeft[index])}</output>
            </div>
            <div className="routine-timer-actions">
              <button
                type="button"
                className="routine-timer-adjust"
                aria-label={`Subtract one minute from ${phase.name} timer`}
                title="Subtract 1 minute"
                onClick={() => adjustTimer(index, -1)}
                disabled={runningPhase !== null}
              >
                <Minus size={12} /> 1
              </button>
              <button
                type="button"
                className="routine-timer-adjust"
                aria-label={`Subtract five minutes from ${phase.name} timer`}
                title="Subtract 5 minutes"
                onClick={() => adjustTimer(index, -5)}
                disabled={runningPhase !== null}
              >
                <Minus size={12} /> 5
              </button>
              <button
                type="button"
                className="routine-timer-adjust"
                aria-label={`Add one minute to ${phase.name} timer`}
                title="Add 1 minute"
                onClick={() => adjustTimer(index, 1)}
                disabled={runningPhase !== null}
              >
                <Plus size={12} /> 1
              </button>
              <button
                type="button"
                className="routine-timer-adjust"
                aria-label={`Add five minutes to ${phase.name} timer`}
                title="Add 5 minutes"
                onClick={() => adjustTimer(index, 5)}
                disabled={runningPhase !== null}
              >
                <Plus size={12} /> 5
              </button>
              <button
                type="button"
                className="routine-timer-start"
                aria-label={`${runningPhase === index ? "Pause" : "Start"} ${phase.name} timer`}
                title={`${runningPhase === index ? "Pause" : "Start"} ${phase.name} timer`}
                onClick={() => setRunningPhase(runningPhase === index ? null : index)}
                disabled={secondsLeft[index] === 0}
              >
                {runningPhase === index ? <Pause size={14} /> : <Play size={14} />}
                <span>{runningPhase === index ? "Pause" : "Start"}</span>
              </button>
              <button
                type="button"
                className="routine-timer-button"
                aria-label={`Reset ${phase.name} timer`}
                title={`Reset ${phase.name} timer`}
                onClick={() => {
                  setRunningPhase(null);
                  setSecondsLeft((current) => current.map((seconds, timerIndex) => timerIndex === index ? phase.minutes * 60 : seconds));
                }}
              >
                <TimerReset size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentIndex = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    onChange(options[nextIndex].value);
    setOpen(true);
  }

  return (
    <div className={`dropdown ${label ? "select-wrap" : "time-unit-dropdown"} ${open ? "is-open" : ""}`} ref={dropdownRef}>
      {label && <span>{label}</span>}
      <button
        className="time-unit-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        {options[currentIndex].label}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="time-unit-menu" role="listbox" aria-label={label || "Preparation time unit"}>
          {options.map((option) => (
            <button
              className={`time-unit-option ${option.value === value ? "active" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [format, setFormat] = useState("Study guide");
  const [focus, setFocus] = useState("Balanced coverage");
  const [goal, setGoal] = useState(
    "Understand and remember the key information",
  );
  const [prepAmount, setPrepAmount] = useState("45");
  const [prepUnit, setPrepUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [routine, setRoutine] = useState("");
  const [library, setLibrary] = useState<SavedStudyNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sources, setSources] = useState<File[]>([]);
  const [sourceError, setSourceError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [alternateBackground, setAlternateBackground] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const noteAreaRef = useRef<HTMLDivElement>(null);

  const noteSettings: NoteSettings = { level, format, focus, goal, prepAmount, prepUnit };
  const filteredLibrary = library.filter((savedNote) =>
    savedNote.title.toLowerCase().includes(libraryQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    try {
      const storedLibrary = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (!storedLibrary) return;
      const parsed = JSON.parse(storedLibrary) as SavedStudyNote[];
      if (Array.isArray(parsed)) {
        setLibrary(parsed.map((savedNote) => ({ ...savedNote, settings: { ...defaultNoteSettings, ...savedNote.settings } })));
      }
    } catch {
      // Ignore invalid saved library data.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  function openSavedNote(savedNote: SavedStudyNote) {
    setSelectedNoteId(savedNote.id);
    setTopic(savedNote.topic);
    setNote(savedNote.content);
    setRoutine(buildStudyRoutine(savedNote.topic, savedNote.settings.prepAmount, savedNote.settings.goal, savedNote.settings.prepUnit));
    setLevel(savedNote.settings.level);
    setFormat(savedNote.settings.format);
    setFocus(savedNote.settings.focus);
    setGoal(savedNote.settings.goal);
    setPrepAmount(savedNote.settings.prepAmount);
    setPrepUnit(savedNote.settings.prepUnit);
    setSources([]);
    setErrorMessage("");
    setIsSetupOpen(false);
  }

  function resetToNewNote() {
    setTopic("");
    setGoal("Understand and remember the key information");
    setPrepAmount("45");
    setPrepUnit("minutes");
    setRoutine("");
    setSelectedNoteId(null);
    setSources([]);
    setSourceError("");
    setErrorMessage("");
    setNote("");
    setIsSetupOpen(true);
  }

  function renameSavedNote(savedNote: SavedStudyNote) {
    const nextTitle = window.prompt("Rename note", savedNote.title)?.trim();
    if (!nextTitle || nextTitle === savedNote.title) return;
    setLibrary((current) => current.map((item) => item.id === savedNote.id ? { ...item, title: nextTitle, updatedAt: Date.now() } : item));
  }

  function deleteSavedNote(id: string) {
    if (!window.confirm("Delete this saved note?")) return;
    setLibrary((current) => current.filter((noteItem) => noteItem.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
      setTopic("");
      setNote("");
    }
  }

  async function generateNote() {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("topic", topic);
      formData.append("level", level);
      formData.append("format", format);
      formData.append("focus", focus);
      formData.append("goal", goal);
      formData.append("prepAmount", String(prepAmount));
      formData.append("prepUnit", String(prepUnit));
      sources.forEach((file) => formData.append("sources", file));
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      const nextNote = data.note || `# ${topic}\n\nNo note was returned.`;
      const savedNote = createSavedStudyNote(topic, nextNote, noteSettings);
      setLibrary((current) => {
        const withoutCurrent = current.filter((item) => item.id !== selectedNoteId);
        const nextLibrary = [savedNote, ...withoutCurrent].slice(0, 20);
        return nextLibrary;
      });
      setSelectedNoteId(savedNote.id);
      setRoutine(buildStudyRoutine(topic, prepAmount, goal, prepUnit));
      setNote(nextNote);
      setIsSetupOpen(false);
    } catch (error) {
      setRoutine(buildStudyRoutine(topic, prepAmount, goal, prepUnit));
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate a note.");
    } finally {
      setIsGenerating(false);
    }
  }
  async function copyNote() {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrorMessage("Clipboard access was blocked. Select the note text and copy it manually.");
    }
  }
  function getHtmlDocument() {
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("\n");
        } catch {
          return "";
        }
      })
      .join("\n");
    const title = escapeHtml(topic.trim() || "Chrono Study Note");
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>${styles}body{margin:0;background:#e4decb}.study-guide-export{min-height:100vh}</style></head><body><main class="study-guide-export">${noteAreaRef.current?.innerHTML || ""}</main></body></html>`;
  }
  function createHtmlUrl() {
    return URL.createObjectURL(
      new Blob([getHtmlDocument()], { type: "text/html" }),
    );
  }
  async function downloadNote() {
    if (!noteAreaRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = createHtmlUrl();
      link.download = `${(topic.trim() || "chrono-study-note")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()}.html`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setIsDownloading(false);
    }
  }
  function openHtmlNote() {
    if (!noteAreaRef.current) return;
    const url = createHtmlUrl();
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      URL.revokeObjectURL(url);
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return (
    <main
      className={`app${alternateBackground ? " atmosphere-alt" : ""}${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
    >
      <TargetCursor hideDefaultCursor parallaxOn cursorColor="#ffffff" cursorColorOnTarget="#c084fc" />
      <aside
        className="sidebar"
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
      >
        <div className="brand">
          <Image className="brand-logo" src={chronoLogo} alt="Chrono" priority />
        </div>
        <button
          className="new-note cursor-target"
          onClick={resetToNewNote}
        >
          <WandSparkles size={16} />
          <span className="button-label">New note</span>
          <span className="shortcut">⌘ N</span>
        </button>
        <div className="side-label">Your library</div>
        {library.length === 0 ? (
          <div className="library-empty">No saved notes yet.</div>
        ) : (
          <>
            <input
              className="library-search"
              aria-label="Search saved notes"
              placeholder="Search notes"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
            />
            {filteredLibrary.map((savedNote) => (
            <div className="library-item-row" key={savedNote.id}>
              <button
                type="button"
                className={`library-item ${selectedNoteId === savedNote.id ? "active" : ""} cursor-target`}
                onClick={() => openSavedNote(savedNote)}
                onDoubleClick={() => renameSavedNote(savedNote)}
                title={`${savedNote.title} · updated ${formatUpdatedAt(savedNote.updatedAt)}`}
              >
                <FileText size={16} />
                <span><strong>{savedNote.title}</strong><small>{formatUpdatedAt(savedNote.updatedAt)}</small></span>
              </button>
              <button type="button" className="library-rename cursor-target" aria-label={`Rename ${savedNote.title}`} onClick={() => renameSavedNote(savedNote)}>
                <span aria-hidden="true">Aa</span>
              </button>
              <button
                type="button"
                className="library-delete cursor-target"
                aria-label={`Delete ${savedNote.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteSavedNote(savedNote.id);
                }}
              >
                <X size={14} />
              </button>
            </div>
            ))}
            {filteredLibrary.length === 0 && <div className="library-empty">No notes match that search.</div>}
          </>
        )}
        <div className="sidebar-bottom">
          <button
            className="plain-button cursor-target"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <PanelLeft size={16} />
            <span className="button-label">
              {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </button>
          <div className="profile">
            <span>AM</span>
            <div className="profile-details">
              <strong>Alex Morgan</strong>
              <small>Personal workspace</small>
            </div>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>
      <section className="workspace">
        <div className="workspace-atmosphere">
          {alternateBackground ? (
            <Dither
              waveColor={[0.38823529411764707, 0.4, 0.9450980392156862]}
              waveSpeed={0.05}
              waveFrequency={3}
              waveAmplitude={0.35}
              colorNum={4}
              pixelSize={2}
              enableMouseInteraction
              mouseRadius={0.3}
            />
          ) : (
            <Silk speed={5} scale={1.1} color="#7C3AED" noiseIntensity={1.2} rotation={0.15} />
          )}
        </div>
        <CardNav
          topic={topic}
          hasNote={Boolean(note)}
          level={level}
          format={format}
          noteCount={library.length}
          alternateBackground={alternateBackground}
          onNewNote={() => {
            resetToNewNote();
          }}
          onToggleBackground={() => setAlternateBackground((current) => !current)}
        />
        <div className="content">
          <div className="intro">
            <div>
              <div className="eyebrow">
                <span className="status-dot" /> Gemini-powered workspace
              </div>
              <h1>What would you like to understand?</h1>
              <p>
                Give me a topic and I&apos;ll turn it into a clear, complete
                note you can actually use.
              </p>
            </div>
            <div className="sparkle-large">
              <Sparkles size={27} />
            </div>
          </div>
          <div className={`builder-panel${isSetupOpen ? " is-open" : " is-collapsed"}`}>
            <div className="builder-heading">
              <div>
                <span className="builder-kicker">Study setup</span>
                {!isSetupOpen && <strong>{level} · {format}</strong>}
              </div>
              {note && <button type="button" className="builder-toggle cursor-target" onClick={() => setIsSetupOpen((current) => !current)} aria-expanded={isSetupOpen}>
                {isSetupOpen ? "Hide setup" : "Edit setup"}<ChevronDown size={15} aria-hidden="true" />
              </button>}
            </div>
            <div className="builder-fields">
            <label htmlFor="topic">Topic or question</label>
            <div className="topic-input-shell">
              <textarea
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. How do neural networks learn?"
                rows={3}
              />
              <span className="topic-input-hint">Press enter with a clear question</span>
            </div>
            <div className="source-picker">
              <input
                id="sources"
                type="file"
                accept=".pdf,.txt,.md,.html,.htm,application/pdf,text/plain,text/markdown,text/html"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  const allowed = /\.(pdf|txt|md|html?)$/i;
                  const invalid = files.find((file) => !allowed.test(file.name) || file.size > 20 * 1024 * 1024);
                  if (invalid) {
                    setSourceError(`${invalid.name} is unsupported or larger than 20 MB.`);
                  } else if (sources.length + files.length > 8) {
                    setSourceError("You can attach up to 8 source files.");
                  } else {
                    setSourceError("");
                    setSources((current) => [...current, ...files.filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size))]);
                  }
                  event.currentTarget.value = "";
                }}
              />
              <label className="cursor-target" htmlFor="sources">
                <Paperclip size={16} /> Attach sources
              </label>
              <span>PDF, TXT, MD, or HTML · up to 8 files</span>
              {sourceError && <span className="field-error" role="alert">{sourceError}</span>}
            </div>
            {sources.length > 0 && (
              <div className="source-list">
                {sources.map((file, index) => (
                  <div className="source-file" key={`${file.name}-${index}`}>
                    <FileText size={14} />
                    <span>{file.name}</span>
                    <button
                      className="cursor-target"
                      type="button"
                      title={`Remove ${file.name}`}
                      onClick={() =>
                        setSources((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="goal-field">
              <label htmlFor="goal">What do you want to achieve?</label>
              <div className="goal-input-shell">
                <Target size={17} aria-hidden="true" />
                <input
                  id="goal"
                  list="goal-options"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="e.g. Prepare for my exam"
                />
              </div>
              <datalist id="goal-options">
                <option value="Understand and remember the key information" />
                <option value="Prepare for an exam" />
                <option value="Learn the topic from beginner level" />
                <option value="Review quickly before a test" />
                <option value="Apply the ideas in practice" />
              </datalist>
            </div>
            <div className="goal-field">
              <label htmlFor="prepAmount">How much time do you have to prepare?</label>
              <div className="time-input-row">
                <div className="goal-input-shell time-input-shell">
                  <Target size={17} aria-hidden="true" />
                  <input
                    id="prepAmount"
                    type="number"
                    min={1}
                    max={prepUnit === "minutes" ? 24 * 60 : prepUnit === "hours" ? 24 * 30 : 30}
                    step={prepUnit === "minutes" ? 1 : 0.5}
                    value={prepAmount}
                    onChange={(event) => setPrepAmount(event.target.value)}
                    placeholder="45"
                  />
                </div>
                <Dropdown
                  value={prepUnit}
                  options={[{ value: "minutes", label: "Minutes" }, { value: "hours", label: "Hours" }, { value: "days", label: "Days" }]}
                  onChange={(value) => setPrepUnit(value as "minutes" | "hours" | "days")}
                />
              </div>
              {prepUnit === "minutes" && Number(prepAmount) >= 60 && (
                <button
                  type="button"
                  className="convert-time-button cursor-target"
                  onClick={() => {
                    setPrepAmount(String(Number((Number(prepAmount) / 60).toFixed(1))));
                    setPrepUnit("hours");
                  }}
                >
                  <ArrowRightLeft size={14} /> Use hours
                </button>
              )}
              <small className="helper-text">Works for short sessions, long study blocks, or multi-day prep</small>
            </div>
            <div className="controls">
              <Dropdown label="Level" value={level} options={["Beginner", "Intermediate", "Advanced"].map((option) => ({ value: option, label: option }))} onChange={setLevel} />
              <Dropdown label="Format" value={format} options={["Study guide", "Deep dive", "Cheat sheet"].map((option) => ({ value: option, label: option }))} onChange={setFormat} />
              <Dropdown label="Focus" value={focus} options={["Balanced coverage", "Practical examples", "Exam preparation"].map((option) => ({ value: option, label: option }))} onChange={setFocus} />
              <button
                className="generate cursor-target"
                onClick={generateNote}
                disabled={isGenerating || !topic.trim()}
              >
                {isGenerating ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}
                {isGenerating ? "Building..." : "Build my note"}
              </button>
            </div>
            </div>
          </div>
          {errorMessage && <div className="generation-error" role="alert" aria-live="assertive"><strong>Could not build this note.</strong><span>{errorMessage}</span><button type="button" onClick={generateNote}>Try again</button></div>}
          <div className="note-header">
            <div>
              <div className="note-kicker">
                <span className="green-dot" /> {note ? "Ready to read" : "Waiting for a topic"}
              </div>
              <h2>{topic || "No note yet"}</h2>
            </div>
            {note && <div className="note-tools">
              <button className="cursor-target" aria-label={copied ? "Note copied" : "Copy note"} title="Copy note" onClick={copyNote}>
                {copied ? <Check size={16} /> : <Clipboard size={16} />}
              </button>
              <button className="cursor-target" aria-label="Open HTML in a new tab" title="Open HTML in a new tab" onClick={openHtmlNote}>
                <ExternalLink size={16} />
              </button>
              <button
                className="cursor-target"
                aria-label="Download HTML"
                title="Download HTML"
                onClick={downloadNote}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <FileCode size={16} />
                )}
              </button>
            </div>}
          </div>
          {routine && (
            <div className="routine-card cursor-target">
              <div className="routine-card-header">
                <span className="routine-kicker">Study routine</span>
                <strong>
                  {prepAmount} {prepUnit}
                </strong>
              </div>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {routine}
              </ReactMarkdown>
              <RoutineTimers totalMinutes={normalizePrepMinutes(prepAmount, prepUnit)} />
            </div>
          )}
          <div ref={noteAreaRef}>
            {note ? <NoteBody note={note} topic={topic} /> : <div className="empty-note-state"><div className="empty-note-icon"><FileText size={24} /></div><span className="note-kicker">Your note will appear here</span><h2>Start with a question worth exploring.</h2><p>Give Chrono a topic, goal, and time budget. Your study guide will be saved here automatically.</p><button type="button" className="example-button cursor-target" onClick={() => { setTopic("How do neural networks learn?"); setNote(sampleNote); setIsSetupOpen(false); }}>Preview an example</button></div>}
          </div>
          {note && <footer className="footer-note">
            Drafted with Gemini <span>•</span> Edit freely, make it yours
          </footer>}
        </div>
      </section>
    </main>
  );
}
