"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, CircleDollarSign, Clock3, Download, FileCheck2, FileText, Globe2, Info, Languages, LoaderCircle, LockKeyhole, Search, Settings2, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { extractDocument } from "../lib/extract";
import { examples } from "../lib/examples";
import { downloadIcs, googleCalendarUrl, outlookCalendarUrl } from "../lib/calendar";
import type { AnalysisResult, Deadline, ExtractedDocument } from "../lib/types";
import { detectLocale, messages, uiLanguages, type Locale } from "../lib/i18n";

const levels = ["Simple", "Standard", "Detailed"];
type Stage = "start" | "review" | "processing" | "result";
type ProviderOption = { id: string; name: string; model: string; isDefault: boolean };

export function ComprendocApp({ demoMode }: { demoMode: boolean }) {
  const [stage, setStage] = useState<Stage>("start");
  const [document, setDocument] = useState<ExtractedDocument | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
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
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [provider, setProvider] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const t = messages(locale);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("comprendoc-locale") as Locale | null;
      const next = saved && uiLanguages.some((item) => item.code === saved) ? saved : detectLocale(navigator.languages || [navigator.language]);
      setLocale(next);
      setLanguage(uiLanguages.find((item) => item.code === next)?.analysis || "English");
    }, 0);
    if (!demoMode) fetch("/api/providers/status").then((response) => response.json()).then((body: { providers?: ProviderOption[] }) => {
      const available = body.providers || []; setProviders(available); setProvider(available.find((item) => item.isDefault)?.id || available[0]?.id || "");
    }).catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, [demoMode]);

  useEffect(() => {
    const config = uiLanguages.find((item) => item.code === locale) || uiLanguages[0];
    window.localStorage.setItem("comprendoc-locale", locale);
    window.document.documentElement.lang = locale;
    window.document.documentElement.dir = config.dir;
  }, [locale]);

  function changeLocale(next: Locale) {
    setLocale(next);
    setLanguage(uiLanguages.find((item) => item.code === next)?.analysis || "English");
  }

  async function handleFile(file?: File) {
    if (!file || demoMode) return;
    setError(""); setStage("processing"); setProgress({ message: "Reading document", value: 7 });
    try {
      const extracted = await extractDocument(file, (message, value) => setProgress({ message, value }));
      setDocument(extracted); setProgress({ message: "Ready to explain", value: 100 }); setStage("review");
    } catch (err) { setError(err instanceof Error ? err.message : "This document could not be read."); setStage("start"); }
  }

  function usePastedText() {
    if (demoMode) return;
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
    if (!provider) { setError("No AI provider is configured. Open Settings to add one."); return; }
    setStage("processing"); setProgress({ message: "Looking for important dates", value: 42 }); setError("");
    const timer = window.setTimeout(() => setProgress({ message: language === "English" ? "Simplifying document" : `Translating to ${language}`, value: 72 }), 900);
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages: document.pages.map(({ page, text }) => ({ page, text })), targetLanguage: language, level, documentName: document.name, provider }) });
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

  const rtl = (uiLanguages.find((item) => item.code === locale)?.dir || "ltr") === "rtl";
  return (
    <main dir={rtl ? "rtl" : "ltr"}>
      <Header onReset={reset} compact={stage !== "start"} demoMode={demoMode} locale={locale} changeLocale={changeLocale} t={t} />
      {stage === "start" && <StartView demoMode={demoMode} dragging={dragging} setDragging={setDragging} onFile={handleFile} inputRef={fileInput} pasteOpen={pasteOpen} setPasteOpen={setPasteOpen} pastedText={pastedText} setPastedText={setPastedText} usePastedText={usePastedText} tryExample={tryExample} error={error} t={t} />}
      {stage === "review" && document && <ReviewView document={document} language={language} setLanguage={setLanguage} level={level} setLevel={setLevel} analyze={analyze} reset={reset} error={error} t={t} providers={providers} provider={provider} setProvider={setProvider} />}
      {stage === "processing" && <ProcessingView progress={progress} name={document?.name} t={t} />}
      {stage === "result" && analysis && document && <ResultView analysis={analysis} document={document} language={language} level={level} reset={reset} viewSource={viewSource} sourceOpen={sourceOpen} setSourceOpen={setSourceOpen} sourceRef={sourceRef} activeCalendar={activeCalendar} setActiveCalendar={setActiveCalendar} demoMode={demoMode} t={t} />}
      {activeCalendar && <CalendarModal deadline={activeCalendar} reminder={reminder} setReminder={setReminder} close={() => setActiveCalendar(null)} />}
      <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><BrandMark /><strong>Comprendoc</strong></div><p>{t.footer}</p><span>{demoMode ? `${t.demo} · ${t.footerMeta}` : t.footerMeta}</span></div></footer>
    </main>
  );
}

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><span /></span>; }

function Header({ onReset, compact, demoMode, locale, changeLocale, t }: { onReset: () => void; compact: boolean; demoMode: boolean; locale: Locale; changeLocale: (locale: Locale) => void; t: ReturnType<typeof messages> }) {
  return <header className={`topbar ${compact ? "compact" : ""}`}><button className="brand" onClick={onReset} aria-label="Comprendoc home"><BrandMark /><span>Comprendoc</span></button><nav aria-label="Main navigation"><a href="#privacy"><ShieldCheck size={16} />{t.privacy}</a><a href="#how-it-works">{t.how}</a>{!demoMode && <Link className="nav-button" href="/settings"><Settings2 size={15}/>{t.settings}</Link>}<label className="locale-picker"><Globe2 size={15}/><span className="visually-hidden">Interface language</span><select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>{uiLanguages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><span className="challenge-badge">{demoMode ? t.demo : "Build for Good"}</span></nav></header>;
}

function StartView({ demoMode, dragging, setDragging, onFile, inputRef, pasteOpen, setPasteOpen, pastedText, setPastedText, usePastedText, tryExample, error, t }: { demoMode: boolean; dragging: boolean; setDragging: (value: boolean) => void; onFile: (file?: File) => void; inputRef: React.RefObject<HTMLInputElement | null>; pasteOpen: boolean; setPasteOpen: (value: boolean) => void; pastedText: string; setPastedText: (value: string) => void; usePastedText: () => void; tryExample: (id: string) => void; error: string; t: ReturnType<typeof messages> }) {
  return <>
    <section className="hero-shell">
      <div className="eyebrow"><span /><span>{t.tagline}</span></div>
      <h1>{t.hero1}<br/><em>{t.hero2}</em></h1>
      <p className="hero-copy">{t.heroCopy}</p>
      {demoMode ? <div className="demo-card"><span className="demo-icon"><Sparkles size={26}/></span><div><span className="kicker">{t.demo}</span><h2>{t.demoTitle}</h2><p>{t.demoCopy}</p></div><button className="primary-button" onClick={() => tryExample(examples[0].id)}>{t.demoButton}<ArrowRight size={17}/></button></div> : <div className={`upload-card ${dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}>
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => onFile(e.target.files?.[0])} className="visually-hidden" aria-label="Choose a PDF, DOCX, or TXT document" />
        <div className="upload-icon"><Upload size={27} strokeWidth={1.8} /></div>
        <h2>{t.drop}</h2><p>{t.formats}</p>
        <button className="primary-button" onClick={() => inputRef.current?.click()}>{t.choose} <ArrowRight size={17}/></button>
        <div className="or"><span/>{t.or}<span/></div>
        <button className="text-button" onClick={() => setPasteOpen(!pasteOpen)}><FileText size={17}/>{pasteOpen ? t.closePaste : t.paste}<ChevronDown size={16}/></button>
        {pasteOpen && <div className="paste-box"><label htmlFor="paste-document">{t.pasteLabel}</label><textarea id="paste-document" value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder={t.pastePlaceholder}/><button className="primary-button small" onClick={usePastedText}>{t.useText} <ArrowRight size={16}/></button></div>}
      </div>}
      {error && <ErrorMessage message={error} />}
      <div className="privacy-line" id="privacy"><LockKeyhole size={16}/><span><strong>{demoMode ? t.demoCopy : t.filePrivate}</strong>{!demoMode && ` ${t.filePrivate2}`}</span></div>
    </section>
    <section className="examples-section" aria-labelledby="examples-title"><div className="section-label">{t.tryExample}</div><div className="examples-heading"><div><h2 id="examples-title">{t.seeAction}</h2><p>{t.synthetic}</p></div></div><div className="example-grid">{examples.map((example, index) => <button className="example-card" key={example.id} onClick={() => tryExample(example.id)}><div className={`example-icon e${index}`}><FileText size={23}/></div><div><h3>{example.label}</h3><p>{index === 0 ? "Forms, documents & orientation" : "Income verification request"}</p></div><span className="example-kicker"><Clock3 size={13}/>{example.kicker}</span><ArrowRight className="example-arrow" size={19}/></button>)}</div></section>
    <section className="how-section" id="how-it-works"><div className="section-label">{t.howLabel}</div><h2>{t.howTitle}</h2><div className="steps"><Step number="01" icon={<FileText/>} title={t.step1} text={t.step1Copy}/><Step number="02" icon={<Languages/>} title={t.step2} text={t.step2Copy}/><Step number="03" icon={<CalendarDays/>} title={t.step3} text={t.step3Copy}/></div></section>
  </>;
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) { return <article className="step"><span className="step-number">{number}</span><div className="step-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>; }

function ReviewView({ document: doc, language, setLanguage, level, setLevel, analyze, reset, error, t, providers, provider, setProvider }: { document: ExtractedDocument; language: string; setLanguage: (value: string) => void; level: string; setLevel: (value: string) => void; analyze: () => void; reset: () => void; error: string; t: ReturnType<typeof messages>; providers: ProviderOption[]; provider: string; setProvider: (value: string) => void }) {
  return <section className="workspace-shell narrow"><button className="back-button" onClick={reset}><ArrowLeft size={17}/>{t.startOver}</button><div className="review-head"><span className="success-icon"><Check size={22}/></span><div><span className="kicker">{t.ready}</span><h1>{t.explainHow}</h1><p>{t.extracted}</p></div></div>
    <div className="document-chip"><FileCheck2 size={23}/><div><strong>{doc.name}</strong><span>{doc.pages.length} {doc.pages.length === 1 ? t.page : t.pages} · {doc.text.length.toLocaleString()} {t.characters} {doc.hasOcr ? `· ${t.ocrUsed}` : `· ${t.textExtracted}`}</span></div><button onClick={reset} aria-label="Remove document"><X size={18}/></button></div>
    {doc.lowConfidenceOcr && <div className="inline-warning"><AlertCircle size={19}/><span>{t.ocrWarning}</span></div>}
    <div className="settings-card"><label><span><Sparkles size={18}/>AI provider</span><select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">Configure a provider in Settings</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.model}</option>)}</select></label><label className="settings-field-gap"><span><Globe2 size={18}/>{t.explanationLanguage}</span><select value={language} onChange={(e) => setLanguage(e.target.value)}>{uiLanguages.map((item) => <option key={item.code} value={item.analysis}>{item.label}</option>)}</select></label><fieldset><legend><Sparkles size={18}/>{t.explanationLevel}</legend><div className="segment">{levels.map((item) => <button type="button" key={item} className={level === item ? "active" : ""} onClick={() => setLevel(item)}><strong>{item === "Simple" ? t.simple : item === "Standard" ? t.standard : t.detailed}</strong><span>{item === "Simple" ? t.simpleHint : item === "Standard" ? t.standardHint : t.detailedHint}</span></button>)}</div></fieldset></div>
    <div className="send-disclosure"><ShieldCheck size={18}/><p><strong>{t.readyWhen}</strong><br/>{t.disclosure}</p></div>
    {error && <ErrorMessage message={error}/>}<button className="primary-button explain-button" onClick={analyze}>{t.explain} <ArrowRight size={18}/></button>
  </section>;
}

function ProcessingView({ progress, name, t }: { progress: { message: string; value: number }; name?: string; t: ReturnType<typeof messages> }) {
  return <section className="processing-shell" aria-live="polite"><div className="processing-orbit"><div className="orbit-ring"/><FileText size={34}/></div><span className="kicker">{t.localWork}</span><h1>{progress.message}</h1><p>{name || t.preparing}</p><div className="progress-track"><span style={{ width: `${progress.value}%` }}/></div><div className="processing-steps"><span className={progress.value >= 10 ? "done" : ""}><Check size={15}/>{t.read}</span><span className={progress.value >= 38 ? "done" : ""}><Check size={15}/>{t.extract}</span><span className={progress.value >= 70 ? "done" : ""}><LoaderCircle size={15}/>{t.explainClearly}</span></div><div className="privacy-note"><LockKeyhole size={18}/>{t.originalPrivate}</div></section>;
}

function ResultView(props: { analysis: AnalysisResult; document: ExtractedDocument; language: string; level: string; reset: () => void; viewSource: (deadline: Deadline) => void; sourceOpen: boolean; setSourceOpen: (value: boolean) => void; sourceRef: React.RefObject<HTMLDivElement | null>; activeCalendar: Deadline | null; setActiveCalendar: (deadline: Deadline | null) => void; demoMode: boolean; t: ReturnType<typeof messages> }) {
  const a = props.analysis;
  const t = props.t;
  return <section className="result-shell"><div className="result-toolbar"><button className="back-button" onClick={props.reset}><ArrowLeft size={17}/>{t.newDocument}</button><div><span><Languages size={15}/>{props.language}</span><span>{props.level}</span>{props.demoMode && <span>{t.demo}</span>}</div></div>
    <div className="result-hero"><div className="document-type"><FileCheck2 size={15}/>{a.documentType}</div><h1>{a.title}</h1><p>{a.oneSentenceSummary}</p><div className="verified-line"><ShieldCheck size={16}/>{t.linked}</div></div>
    {(a.warnings.length > 0 || props.document.lowConfidenceOcr) && <div className="safety-banner"><AlertCircle size={21}/><div><strong>{t.extraLook}</strong><p>{a.warnings[0] || t.ocrWarning}</p></div></div>}
    <div className="result-grid"><div className="result-main">
      <ResultSection icon={<Info/>} eyebrow={t.whatIs} title={t.plain}><p className="summary-copy">{a.plainLanguageSummary}</p></ResultSection>
      <ResultSection icon={<Check/>} eyebrow={t.needKnow} title={t.important}>{a.importantPoints.length ? <ul className="point-list">{a.importantPoints.map((point) => <li key={point}><span><Check size={15}/></span>{point}</li>)}</ul> : <p>{t.noPoints}</p>}</ResultSection>
      <section className="result-section deadlines-section"><div className="section-title-row"><div className="result-section-icon urgent"><Clock3/></div><div><span className="result-eyebrow">{t.deadlines}</span><h2>{a.deadlines.length ? `${a.deadlines.length} ${t.dateRadar}` : t.noDeadline}</h2></div></div>{a.deadlines.length ? <div className="deadline-list">{a.deadlines.map((deadline, index) => <DeadlineCard key={deadline.id} deadline={deadline} index={index} viewSource={props.viewSource} addCalendar={props.setActiveCalendar} demoMode={props.demoMode} t={t}/>)}</div> : <p className="empty-state">{t.noActionable}</p>}</section>
      <ResultSection icon={<ArrowRight/>} eyebrow={t.needDo} title={a.actionsRequired.length ? t.nextSteps : t.noAction}>{a.actionsRequired.length > 0 && <ol className="action-list">{a.actionsRequired.map((action, index) => <li key={`${action.action}-${index}`}><span>{index + 1}</span><div><strong>{action.action}</strong><p>{action.details}</p>{action.sourceText && <button onClick={() => { const d = a.deadlines.find((item) => item.id === action.deadlineId); if (d) props.viewSource(d); }}>{t.viewSource} <ArrowRight size={13}/></button>}</div></li>)}</ol>}</ResultSection>
      {(a.importantDates.length > 0 || a.importantAmounts.length > 0) && <div className="split-sections">{a.importantDates.length > 0 && <ResultSection icon={<CalendarDays/>} eyebrow={t.dates} title={t.otherDates}><div className="mini-list">{a.importantDates.map((date) => <div key={date.sourceText}><strong>{date.normalizedDate || date.originalText}</strong><span>{date.meaning}</span></div>)}</div></ResultSection>}{a.importantAmounts.length > 0 && <ResultSection icon={<CircleDollarSign/>} eyebrow={t.money} title={t.amounts}><div className="mini-list">{a.importantAmounts.map((amount) => <div key={amount.sourceText}><strong>{amount.amount}</strong><span>{amount.meaning}</span></div>)}</div></ResultSection>}</div>}
      {a.jargon.length > 0 && <ResultSection icon={<Search/>} eyebrow={t.jargon} title={t.simpler}><dl className="jargon-list">{a.jargon.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.simpleExplanation}</dd></div>)}</dl></ResultSection>}
      {(a.uncertaintyNotes.length > 0) && <ResultSection icon={<AlertCircle/>} eyebrow={t.doubleCheck} title={t.uncertain}><ul className="uncertainty-list">{a.uncertaintyNotes.map((note) => <li key={note}>{note}</li>)}</ul></ResultSection>}
      <SourceViewer analysis={a} document={props.document} open={props.sourceOpen} setOpen={props.setSourceOpen} sourceRef={props.sourceRef} t={t}/>
    </div><aside className="result-aside"><div className="aside-card"><span className="aside-icon"><ShieldCheck/></span><h3>{t.checkOriginal}</h3><p>{t.checkCopy}</p></div><div className="aside-card soft"><LockKeyhole size={19}/><div><strong>{t.privateDesign}</strong><p>{props.demoMode ? t.demoCopy : t.privateCopy}</p></div></div></aside></div>
  </section>;
}

function ResultSection({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) { return <section className="result-section"><div className="section-title-row"><div className="result-section-icon">{icon}</div><div><span className="result-eyebrow">{eyebrow}</span><h2>{title}</h2></div></div>{children}</section>; }

function DeadlineCard({ deadline, index, viewSource, addCalendar, demoMode, t }: { deadline: Deadline; index: number; viewSource: (d: Deadline) => void; addCalendar: (d: Deadline) => void; demoMode: boolean; t: ReturnType<typeof messages> }) {
  const formatted = deadline.normalizedDate ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${deadline.normalizedDate}T12:00:00Z`)) : deadline.originalText;
  return <article className="deadline-card"><div className="deadline-index">{String(index + 1).padStart(2, "0")}</div><div className="deadline-content"><span className="deadline-label"><Clock3 size={14}/>{t.deadlines} · {deadline.certainty.toUpperCase()} {t.certainty}</span><h3>{formatted}</h3>{deadline.normalizedTime && <span className="deadline-time">{deadline.normalizedTime} · timezone not stated</span>}<p>{deadline.requiredAction}</p>{deadline.consequenceIfMissed && <div className="consequence"><AlertCircle size={15}/><span>{t.ifMissed}: {deadline.consequenceIfMissed}</span></div>} {!deadline.normalizedDate && <div className="date-unknown"><Info size={16}/><span>{t.exactUnknown}</span></div>}<div className="deadline-actions">{!demoMode && deadline.calendarSuggested && deadline.normalizedDate && <button className="calendar-button" onClick={() => addCalendar(deadline)}><CalendarDays size={16}/>{t.addCalendar}</button>}<button className="source-button" onClick={() => viewSource(deadline)}><Search size={15}/>{t.viewSource}</button></div></div></article>;
}

function SourceViewer({ analysis, document: doc, open, setOpen, sourceRef, t }: { analysis: AnalysisResult; document: ExtractedDocument; open: boolean; setOpen: (v: boolean) => void; sourceRef: React.RefObject<HTMLDivElement | null>; t: ReturnType<typeof messages> }) {
  return <section ref={sourceRef} className="source-viewer"><button className="source-toggle" onClick={() => setOpen(!open)} aria-expanded={open}><div><span className="result-section-icon"><FileText/></span><span><small>{t.sourceText}</small><strong>{t.exactWording}</strong></span></div><ChevronDown className={open ? "rotated" : ""}/></button>{open && <div className="source-pages">{doc.pages.map((page) => <article key={page.page}><div className="page-label">{t.page} {page.page}<span>{page.method === "ocr" ? `OCR${page.confidence ? ` · ${Math.round(page.confidence)}% confidence` : ""}` : t.textExtracted}</span></div><HighlightedText text={page.text} page={page.page} deadlines={analysis.deadlines}/></article>)}</div>}</section>;
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
