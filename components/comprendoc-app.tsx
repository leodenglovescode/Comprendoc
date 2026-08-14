"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, CircleDollarSign, Clock3, Download, FileCheck2, FileText, Globe2, Info, Languages, LoaderCircle, LockKeyhole, Search, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { extractDocument } from "../lib/extract";
import { examples } from "../lib/examples";
import { downloadIcs, googleCalendarUrl, outlookCalendarUrl } from "../lib/calendar";
import type { AnalysisResult, Deadline, ExtractedDocument } from "../lib/types";

const languages = ["English", "简体中文", "Español", "Français", "العربية", "Português", "Tiếng Việt", "한국어", "日本語"];
const levels = ["Simple", "Standard", "Detailed"];
type Stage = "start" | "review" | "processing" | "result";

export function ComprendocApp() {
  const [stage, setStage] = useState<Stage>("start");
  const [document, setDocument] = useState<ExtractedDocument | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState("Simple");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [progress, setProgress] = useState({ message: "Reading document", value: 8 });
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<Deadline | null>(null);
  const [reminder, setReminder] = useState<number | null>(1440);
  const [sourceOpen, setSourceOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setError(""); setStage("processing"); setProgress({ message: "Reading document", value: 7 });
    try {
      const extracted = await extractDocument(file, (message, value) => setProgress({ message, value }));
      setDocument(extracted); setProgress({ message: "Ready to explain", value: 100 }); setStage("review");
    } catch (err) { setError(err instanceof Error ? err.message : "This document could not be read."); setStage("start"); }
  }

  function usePastedText() {
    if (!pastedText.trim()) { setError("Paste some document text first."); return; }
    setDocument({ name: "Pasted text", text: pastedText, pages: [{ page: 1, text: pastedText, method: "paste" }], hasOcr: false, lowConfidenceOcr: false });
    setError(""); setStage("review");
  }

  function tryExample(id: string) {
    const example = examples.find((item) => item.id === id)!;
    setDocument(example.document); setAnalysis(example.analysis); setError(""); setStage("result"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function analyze() {
    if (!document) return;
    setStage("processing"); setProgress({ message: "Looking for important dates", value: 42 }); setError("");
    const timer = window.setTimeout(() => setProgress({ message: language === "English" ? "Simplifying document" : `Translating to ${language}`, value: 72 }), 900);
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages: document.pages.map(({ page, text }) => ({ page, text })), targetLanguage: language, level, documentName: document.name }) });
      const body = await response.json() as AnalysisResult & { error?: string };
      if (!response.ok) throw new Error(body.error || "The document could not be explained.");
      setAnalysis(body); setProgress({ message: "Explanation ready", value: 100 }); setStage("result"); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setError(err instanceof Error ? err.message : "The document could not be explained."); setStage("review"); }
    finally { window.clearTimeout(timer); }
  }

  function viewSource(deadline: Deadline) {
    setSourceOpen(true);
    window.setTimeout(() => { sourceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); window.document.getElementById(`source-${deadline.id}`)?.focus(); }, 120);
  }

  function reset() { setStage("start"); setDocument(null); setAnalysis(null); setError(""); setPastedText(""); setPasteOpen(false); }

  const rtl = language === "العربية";
  return (
    <main dir={rtl ? "rtl" : "ltr"}>
      <Header onReset={reset} compact={stage !== "start"} />
      {stage === "start" && <StartView dragging={dragging} setDragging={setDragging} onFile={handleFile} inputRef={fileInput} pasteOpen={pasteOpen} setPasteOpen={setPasteOpen} pastedText={pastedText} setPastedText={setPastedText} usePastedText={usePastedText} tryExample={tryExample} error={error} />}
      {stage === "review" && document && <ReviewView document={document} language={language} setLanguage={setLanguage} level={level} setLevel={setLevel} analyze={analyze} reset={reset} error={error} />}
      {stage === "processing" && <ProcessingView progress={progress} name={document?.name} />}
      {stage === "result" && analysis && document && <ResultView analysis={analysis} document={document} language={language} level={level} reset={reset} viewSource={viewSource} sourceOpen={sourceOpen} setSourceOpen={setSourceOpen} sourceRef={sourceRef} activeCalendar={activeCalendar} setActiveCalendar={setActiveCalendar} />}
      {activeCalendar && <CalendarModal deadline={activeCalendar} reminder={reminder} setReminder={setReminder} close={() => setActiveCalendar(null)} />}
      <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><BrandMark /><strong>Comprendoc</strong></div><p>Comprendoc helps you understand documents, but AI can make mistakes. Verify important dates, deadlines, and requirements against the original document.</p><span>Built for good · No accounts · No document storage</span></div></footer>
    </main>
  );
}

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><span /></span>; }

function Header({ onReset, compact }: { onReset: () => void; compact: boolean }) {
  return <header className={`topbar ${compact ? "compact" : ""}`}><button className="brand" onClick={onReset} aria-label="Comprendoc home"><BrandMark /><span>Comprendoc</span></button><nav aria-label="Main navigation"><a href="#privacy"><ShieldCheck size={16} />Privacy</a><a href="#how-it-works">How it works</a><span className="challenge-badge">Build for Good</span></nav></header>;
}

function StartView(props: { dragging: boolean; setDragging: (value: boolean) => void; onFile: (file?: File) => void; inputRef: React.RefObject<HTMLInputElement | null>; pasteOpen: boolean; setPasteOpen: (value: boolean) => void; pastedText: string; setPastedText: (value: string) => void; usePastedText: () => void; tryExample: (id: string) => void; error: string }) {
  return <>
    <section className="hero-shell">
      <div className="eyebrow"><span /><span>Comprehend the docs. Act on what matters.</span></div>
      <h1>Understand the paperwork.<br/><em>Know what to do next.</em></h1>
      <p className="hero-copy">Comprendoc turns complicated documents into clear explanations in your language — and helps you keep track of what matters.</p>
      <div className={`upload-card ${props.dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); props.setDragging(true); }} onDragLeave={() => props.setDragging(false)} onDrop={(e) => { e.preventDefault(); props.setDragging(false); props.onFile(e.dataTransfer.files[0]); }}>
        <input ref={props.inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => props.onFile(e.target.files?.[0])} className="visually-hidden" aria-label="Choose a PDF, DOCX, or TXT document" />
        <div className="upload-icon"><Upload size={27} strokeWidth={1.8} /></div>
        <h2>Drop a document here</h2><p>PDF, DOCX or TXT · up to 25 MB</p>
        <button className="primary-button" onClick={() => props.inputRef.current?.click()}>Choose a file <ArrowRight size={17}/></button>
        <div className="or"><span/>or<span/></div>
        <button className="text-button" onClick={() => props.setPasteOpen(!props.pasteOpen)}><FileText size={17}/>{props.pasteOpen ? "Close text box" : "Paste text instead"}<ChevronDown size={16}/></button>
        {props.pasteOpen && <div className="paste-box"><label htmlFor="paste-document">Paste your document text</label><textarea id="paste-document" value={props.pastedText} onChange={(e) => props.setPastedText(e.target.value)} placeholder="Paste the letter, notice, or form text here…"/><button className="primary-button small" onClick={props.usePastedText}>Use this text <ArrowRight size={16}/></button></div>}
      </div>
      {props.error && <ErrorMessage message={props.error} />}
      <div className="privacy-line" id="privacy"><LockKeyhole size={16}/><span><strong>Your file stays in your browser.</strong> Only extracted text is sent for AI analysis.</span></div>
    </section>
    <section className="examples-section" aria-labelledby="examples-title"><div className="section-label">TRY AN EXAMPLE</div><div className="examples-heading"><div><h2 id="examples-title">See Comprendoc in action</h2><p>Synthetic documents. No personal information.</p></div></div><div className="example-grid">{examples.map((example, index) => <button className="example-card" key={example.id} onClick={() => props.tryExample(example.id)}><div className={`example-icon e${index}`}><FileText size={23}/></div><div><h3>{example.label}</h3><p>{index === 0 ? "Forms, documents & orientation" : "Income verification request"}</p></div><span className="example-kicker"><Clock3 size={13}/>{example.kicker}</span><ArrowRight className="example-arrow" size={19}/></button>)}</div></section>
    <section className="how-section" id="how-it-works"><div className="section-label">HOW IT WORKS</div><h2>From red tape to a clear next step</h2><div className="steps"><Step number="01" icon={<FileText/>} title="Add your document" text="Upload or paste. Your original file never leaves your browser."/><Step number="02" icon={<Languages/>} title="Choose your language" text="Get a natural explanation at the level that works for you."/><Step number="03" icon={<CalendarDays/>} title="Act with confidence" text="See deadlines, verify sources, and add dates to your calendar."/></div></section>
  </>;
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) { return <article className="step"><span className="step-number">{number}</span><div className="step-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>; }

function ReviewView({ document: doc, language, setLanguage, level, setLevel, analyze, reset, error }: { document: ExtractedDocument; language: string; setLanguage: (value: string) => void; level: string; setLevel: (value: string) => void; analyze: () => void; reset: () => void; error: string }) {
  return <section className="workspace-shell narrow"><button className="back-button" onClick={reset}><ArrowLeft size={17}/>Start over</button><div className="review-head"><span className="success-icon"><Check size={22}/></span><div><span className="kicker">DOCUMENT READY</span><h1>How should we explain it?</h1><p>Your document text was extracted locally. Choose what feels most comfortable.</p></div></div>
    <div className="document-chip"><FileCheck2 size={23}/><div><strong>{doc.name}</strong><span>{doc.pages.length} {doc.pages.length === 1 ? "page" : "pages"} · {doc.text.length.toLocaleString()} characters {doc.hasOcr ? "· OCR used" : "· text extracted"}</span></div><button onClick={reset} aria-label="Remove document"><X size={18}/></button></div>
    {doc.lowConfidenceOcr && <div className="inline-warning"><AlertCircle size={19}/><span>Some text may have been read incorrectly. Double-check names, dates, amounts, and deadlines against the original.</span></div>}
    <div className="settings-card"><label><span><Globe2 size={18}/>Explanation language</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></label><fieldset><legend><Sparkles size={18}/>Explanation level</legend><div className="segment">{levels.map((item) => <button type="button" key={item} className={level === item ? "active" : ""} onClick={() => setLevel(item)}><strong>{item}</strong><span>{item === "Simple" ? "Short & clear" : item === "Standard" ? "Balanced" : "More context"}</span></button>)}</div></fieldset></div>
    <div className="send-disclosure"><ShieldCheck size={18}/><p><strong>Ready when you are.</strong><br/>Extracted document text—not the original file—will be sent to OpenAI for analysis.</p></div>
    {error && <ErrorMessage message={error}/>}<button className="primary-button explain-button" onClick={analyze}>Explain this document <ArrowRight size={18}/></button>
  </section>;
}

function ProcessingView({ progress, name }: { progress: { message: string; value: number }; name?: string }) {
  return <section className="processing-shell" aria-live="polite"><div className="processing-orbit"><div className="orbit-ring"/><FileText size={34}/></div><span className="kicker">COMPRENDOC IS WORKING LOCALLY</span><h1>{progress.message}</h1><p>{name || "Preparing your document"}</p><div className="progress-track"><span style={{ width: `${progress.value}%` }}/></div><div className="processing-steps"><span className={progress.value >= 10 ? "done" : ""}><Check size={15}/>Read document</span><span className={progress.value >= 38 ? "done" : ""}><Check size={15}/>Extract text</span><span className={progress.value >= 70 ? "done" : ""}><LoaderCircle size={15}/>Explain clearly</span></div><div className="privacy-note"><LockKeyhole size={18}/>Your original file is not uploaded or stored.</div></section>;
}

function ResultView(props: { analysis: AnalysisResult; document: ExtractedDocument; language: string; level: string; reset: () => void; viewSource: (deadline: Deadline) => void; sourceOpen: boolean; setSourceOpen: (value: boolean) => void; sourceRef: React.RefObject<HTMLDivElement | null>; activeCalendar: Deadline | null; setActiveCalendar: (deadline: Deadline | null) => void }) {
  const a = props.analysis;
  return <section className="result-shell"><div className="result-toolbar"><button className="back-button" onClick={props.reset}><ArrowLeft size={17}/>New document</button><div><span><Languages size={15}/>{props.language}</span><span>{props.level}</span></div></div>
    <div className="result-hero"><div className="document-type"><FileCheck2 size={15}/>{a.documentType}</div><h1>{a.title}</h1><p>{a.oneSentenceSummary}</p><div className="verified-line"><ShieldCheck size={16}/>Key details are linked to the original text</div></div>
    {(a.warnings.length > 0 || props.document.lowConfidenceOcr) && <div className="safety-banner"><AlertCircle size={21}/><div><strong>Take an extra look</strong><p>{a.warnings[0] || "OCR was used. Verify important names, dates, and amounts against the original."}</p></div></div>}
    <div className="result-grid"><div className="result-main">
      <ResultSection icon={<Info/>} eyebrow="WHAT IS THIS?" title="In plain language"><p className="summary-copy">{a.plainLanguageSummary}</p></ResultSection>
      <ResultSection icon={<Check/>} eyebrow="WHAT YOU NEED TO KNOW" title="The important points">{a.importantPoints.length ? <ul className="point-list">{a.importantPoints.map((point) => <li key={point}><span><Check size={15}/></span>{point}</li>)}</ul> : <p>No important points were found.</p>}</ResultSection>
      <section className="result-section deadlines-section"><div className="section-title-row"><div className="result-section-icon urgent"><Clock3/></div><div><span className="result-eyebrow">DEADLINES</span><h2>{a.deadlines.length ? `${a.deadlines.length} date${a.deadlines.length > 1 ? "s" : ""} to keep on your radar` : "No deadline found"}</h2></div></div>{a.deadlines.length ? <div className="deadline-list">{a.deadlines.map((deadline, index) => <DeadlineCard key={deadline.id} deadline={deadline} index={index} viewSource={props.viewSource} addCalendar={props.setActiveCalendar}/>)}</div> : <p className="empty-state">No actionable deadline was found in this document.</p>}</section>
      <ResultSection icon={<ArrowRight/>} eyebrow="WHAT YOU NEED TO DO" title={a.actionsRequired.length ? "Your next steps" : "No action found in this document"}>{a.actionsRequired.length > 0 && <ol className="action-list">{a.actionsRequired.map((action, index) => <li key={`${action.action}-${index}`}><span>{index + 1}</span><div><strong>{action.action}</strong><p>{action.details}</p>{action.sourceText && <button onClick={() => { const d = a.deadlines.find((item) => item.id === action.deadlineId); if (d) props.viewSource(d); }}>View source <ArrowRight size={13}/></button>}</div></li>)}</ol>}</ResultSection>
      {(a.importantDates.length > 0 || a.importantAmounts.length > 0) && <div className="split-sections">{a.importantDates.length > 0 && <ResultSection icon={<CalendarDays/>} eyebrow="IMPORTANT DATES" title="Other dates"><div className="mini-list">{a.importantDates.map((date) => <div key={date.sourceText}><strong>{date.normalizedDate || date.originalText}</strong><span>{date.meaning}</span></div>)}</div></ResultSection>}{a.importantAmounts.length > 0 && <ResultSection icon={<CircleDollarSign/>} eyebrow="MONEY / FEES" title="Amounts mentioned"><div className="mini-list">{a.importantAmounts.map((amount) => <div key={amount.sourceText}><strong>{amount.amount}</strong><span>{amount.meaning}</span></div>)}</div></ResultSection>}</div>}
      {a.jargon.length > 0 && <ResultSection icon={<Search/>} eyebrow="JARGON EXPLAINED" title="Words made simpler"><dl className="jargon-list">{a.jargon.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.simpleExplanation}</dd></div>)}</dl></ResultSection>}
      {(a.uncertaintyNotes.length > 0) && <ResultSection icon={<AlertCircle/>} eyebrow="THINGS TO DOUBLE-CHECK" title="Comprendoc is not certain about"><ul className="uncertainty-list">{a.uncertaintyNotes.map((note) => <li key={note}>{note}</li>)}</ul></ResultSection>}
      <SourceViewer analysis={a} document={props.document} open={props.sourceOpen} setOpen={props.setSourceOpen} sourceRef={props.sourceRef}/>
    </div><aside className="result-aside"><div className="aside-card"><span className="aside-icon"><ShieldCheck/></span><h3>Check the original</h3><p>AI can make mistakes. Verify important dates and requirements against your document.</p></div><div className="aside-card soft"><LockKeyhole size={19}/><div><strong>Private by design</strong><p>No account. No document history. Your original file stayed on this device.</p></div></div></aside></div>
  </section>;
}

function ResultSection({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) { return <section className="result-section"><div className="section-title-row"><div className="result-section-icon">{icon}</div><div><span className="result-eyebrow">{eyebrow}</span><h2>{title}</h2></div></div>{children}</section>; }

function DeadlineCard({ deadline, index, viewSource, addCalendar }: { deadline: Deadline; index: number; viewSource: (d: Deadline) => void; addCalendar: (d: Deadline) => void }) {
  const formatted = deadline.normalizedDate ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${deadline.normalizedDate}T12:00:00Z`)) : deadline.originalText;
  return <article className="deadline-card"><div className="deadline-index">{String(index + 1).padStart(2, "0")}</div><div className="deadline-content"><span className="deadline-label"><Clock3 size={14}/>DEADLINE · {deadline.certainty.toUpperCase()} CERTAINTY</span><h3>{formatted}</h3>{deadline.normalizedTime && <span className="deadline-time">{deadline.normalizedTime} · timezone not stated</span>}<p>{deadline.requiredAction}</p>{deadline.consequenceIfMissed && <div className="consequence"><AlertCircle size={15}/><span>If missed: {deadline.consequenceIfMissed}</span></div>} {!deadline.normalizedDate && <div className="date-unknown"><Info size={16}/><span>Exact date cannot be calculated yet.</span></div>}<div className="deadline-actions">{deadline.calendarSuggested && deadline.normalizedDate && <button className="calendar-button" onClick={() => addCalendar(deadline)}><CalendarDays size={16}/>Add to calendar</button>}<button className="source-button" onClick={() => viewSource(deadline)}><Search size={15}/>View source</button></div></div></article>;
}

function SourceViewer({ analysis, document: doc, open, setOpen, sourceRef }: { analysis: AnalysisResult; document: ExtractedDocument; open: boolean; setOpen: (v: boolean) => void; sourceRef: React.RefObject<HTMLDivElement | null> }) {
  return <section ref={sourceRef} className="source-viewer"><button className="source-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><div><span className="result-section-icon"><FileText/></span><span><small>ORIGINAL DOCUMENT TEXT</small><strong>Check the exact wording</strong></span></div><ChevronDown className={open ? "rotated" : ""}/></button>{open && <div className="source-pages">{doc.pages.map((page) => <article key={page.page}><div className="page-label">Page {page.page}<span>{page.method === "ocr" ? `OCR${page.confidence ? ` · ${Math.round(page.confidence)}% confidence` : ""}` : "Extracted text"}</span></div><HighlightedText text={page.text} page={page.page} deadlines={analysis.deadlines}/></article>)}</div>}</section>;
}

function HighlightedText({ text, page, deadlines }: { text: string; page: number; deadlines: Deadline[] }) {
  const matches = useMemo(() => deadlines.filter((d) => d.sourcePage === page && d.sourceText && text.includes(d.sourceText)).map((d) => ({ start: text.indexOf(d.sourceText), end: text.indexOf(d.sourceText) + d.sourceText.length, id: d.id })).sort((a, b) => a.start - b.start), [text, page, deadlines]);
  if (!matches.length) return <p className="source-text">{text}</p>;
  const nodes: React.ReactNode[] = []; let cursor = 0;
  matches.forEach((match) => { if (match.start < cursor) return; nodes.push(text.slice(cursor, match.start)); nodes.push(<mark id={`source-${match.id}`} tabIndex={-1} key={match.id}>{text.slice(match.start, match.end)}</mark>); cursor = match.end; }); nodes.push(text.slice(cursor));
  return <p className="source-text">{nodes}</p>;
}

function CalendarModal({ deadline, reminder, setReminder, close }: { deadline: Deadline; reminder: number | null; setReminder: (v: number | null) => void; close: () => void }) {
  const date = deadline.normalizedDate ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${deadline.normalizedDate}T12:00:00Z`)) : "Date unavailable";
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><div className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-title"><button className="modal-close" onClick={close} aria-label="Close calendar options"><X/></button><span className="modal-icon"><CalendarDays/></span><span className="kicker">ADD TO CALENDAR</span><h2 id="calendar-title">{deadline.calendarTitle || deadline.requiredAction}</h2><div className="modal-date"><Clock3/><div><strong>{date}</strong><span>{deadline.isAllDay ? "All-day event" : `${deadline.normalizedTime} · verify local timezone`}</span></div></div><label className="reminder-select"><span>Remind me</span><select value={reminder ?? "none"} onChange={(e) => setReminder(e.target.value === "none" ? null : Number(e.target.value))}><option value="0">On the day</option><option value="1440">1 day before</option><option value="4320">3 days before</option><option value="10080">1 week before</option><option value="none">No reminder</option></select></label><div className="calendar-options"><a href={googleCalendarUrl(deadline)} target="_blank" rel="noreferrer" onClick={close}><span className="calendar-logo google">G</span><span><strong>Google Calendar</strong><small>Open in a new tab</small></span><ArrowRight/></a><a href={outlookCalendarUrl(deadline)} target="_blank" rel="noreferrer" onClick={close}><span className="calendar-logo outlook">O</span><span><strong>Outlook Calendar</strong><small>Open in a new tab</small></span><ArrowRight/></a><button onClick={() => { downloadIcs(deadline, reminder); close(); }}><span className="calendar-logo ics"><Download/></span><span><strong>Apple / other calendar</strong><small>Download an .ics file</small></span><ArrowRight/></button></div><p className="modal-note">Only this event’s title, date, action, and source wording are added—not your whole document.</p></div></div>;
}

function ErrorMessage({ message }: { message: string }) { return <div className="error-message" role="alert"><AlertCircle size={19}/><span>{message}</span></div>; }
