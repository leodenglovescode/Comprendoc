"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Clock3, FileText, KeyRound, Library, LockKeyhole, Trash2 } from "lucide-react";
import { detectLocale, formatMessage, interfaceLanguages, messages, type Locale } from "../lib/i18n";
import type { SavedDocument } from "../lib/saved-document-storage";

export function SavedDocumentLibrary({ demoMode }: { demoMode: boolean }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [adminToken, setAdminToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const t = messages(locale);

  useEffect(() => { const timer = window.setTimeout(() => {
    const saved = window.localStorage.getItem("comprendoc-locale") as Locale | null;
    const next = saved && interfaceLanguages.some((item) => item.code === saved) ? saved : detectLocale(navigator.languages || [navigator.language]);
    setLocale(next); setAdminToken(window.sessionStorage.getItem("comprendoc-admin-token") || "");
    window.document.documentElement.lang = next;
  }, 0); return () => window.clearTimeout(timer); }, []);

  const load = useCallback(async (token: string) => {
    setLoading(true); setMessage("");
    const response = await fetch("/api/documents", { headers: { "X-Comprendoc-Admin-Token": token } });
    const body = await response.json() as { documents?: SavedDocument[] };
    setLoading(false);
    if (!response.ok) { setMessage(t.loadDocumentsError); if (response.status === 401) setAdminToken(""); return; }
    setDocuments(body.documents || []);
  }, [t.loadDocumentsError]);

  useEffect(() => { if (!adminToken || demoMode) return; const timer = window.setTimeout(() => void load(adminToken), 0); return () => window.clearTimeout(timer); }, [adminToken, demoMode, load]);

  function unlock() {
    const token = tokenDraft.trim(); if (!token) return;
    window.sessionStorage.setItem("comprendoc-admin-token", token); setAdminToken(token); setTokenDraft("");
  }

  async function remove(item: SavedDocument) {
    if (!window.confirm(formatMessage(t.deleteDocumentConfirm, { title: item.analysis.title }))) return;
    const response = await fetch(`/api/documents?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers: { "X-Comprendoc-Admin-Token": adminToken } });
    if (!response.ok) { setMessage(t.deleteDocumentError); return; }
    setDocuments((current) => current.filter((document) => document.id !== item.id)); setMessage(t.documentDeleted);
  }

  if (demoMode) return <main className="settings-page"><Link className="back-button" href="/"><ArrowLeft size={17}/>{t.backToDemo}</Link><div className="settings-empty"><LockKeyhole/><h1>{t.libraryUnavailable}</h1><p>{t.libraryUnavailableCopy}</p></div></main>;

  return <main className="library-page"><Link className="back-button" href="/"><ArrowLeft size={17}/>{t.backToComprendoc}</Link><header className="library-head"><span><Library/></span><div><span className="kicker">{t.savedDocuments}</span><h1>{t.yourLibrary}</h1><p>{t.libraryCopy}</p></div></header>
    {!adminToken ? <section className="unlock-card"><KeyRound/><h2>{t.unlockLibrary}</h2><p>{t.unlockLibraryCopy}</p><label><span>{t.administratorToken}</span><input type="password" value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") unlock(); }} autoComplete="off"/></label><button className="primary-button" onClick={unlock}>{t.unlockLibraryButton}</button></section> : <>
      <div className="library-toolbar"><strong>{formatMessage(t.savedCount, { count: documents.length })}</strong><button className="secondary-button" onClick={() => { window.sessionStorage.removeItem("comprendoc-admin-token"); setAdminToken(""); setDocuments([]); }}>{t.lockLibrary}</button></div>
      {message && <p className="settings-message">{message}</p>}
      {loading ? <div className="library-empty"><Clock3/>{t.loadingDocuments}</div> : documents.length === 0 ? <div className="library-empty"><FileText/><h2>{t.noSavedDocuments}</h2><p>{t.noSavedDocumentsCopy}</p><Link className="primary-button" href="/">{t.addDocument}<ArrowRight size={16}/></Link></div> : <section className="library-grid">{documents.map((item) => <article className="library-card" key={item.id}><div className="library-card-icon"><FileText/></div><div className="library-card-copy"><span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.createdAt))} · {item.document.name}</span><h2>{item.analysis.title}</h2><p>{item.analysis.oneSentenceSummary}</p><div>{item.analysis.deadlines.length > 0 && <span><Clock3 size={13}/>{formatMessage(t.deadlineCount, { count: item.analysis.deadlines.length })}</span>}</div></div><div className="library-card-actions"><Link className="primary-button small" href={`/?saved=${encodeURIComponent(item.id)}`}>{t.openDocument}<ArrowRight size={15}/></Link><button className="danger-button" onClick={() => remove(item)} aria-label={formatMessage(t.deleteDocumentLabel, { title: item.analysis.title })}><Trash2 size={16}/>{t.deleteDocument}</button></div></article>)}</section>}
    </>}
  </main>;
}
