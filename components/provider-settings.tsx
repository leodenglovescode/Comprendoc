"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Database, ExternalLink, KeyRound, LockKeyhole, Save, ShieldCheck, Trash2 } from "lucide-react";
import { providerDefinitions, type ProviderId } from "../lib/providers";

type ProviderStatus = { id: ProviderId; name: string; baseUrl: string; defaultModel: string; model: string; configured: boolean; isDefault: boolean; docs: string };

export function ProviderSettings({ demoMode }: { demoMode: boolean }) {
  const [adminToken, setAdminToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { apiKey: string; model: string; makeDefault: boolean }>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => { const timer = window.setTimeout(() => setAdminToken(window.sessionStorage.getItem("comprendoc-admin-token") || ""), 0); return () => window.clearTimeout(timer); }, []);

  const load = useCallback(async (token = adminToken) => {
    setMessage("");
    const response = await fetch("/api/providers", { headers: { "X-Comprendoc-Admin-Token": token } });
    const body = await response.json() as { providers?: ProviderStatus[]; error?: string };
    if (!response.ok) { setMessage(body.error || "Could not load provider settings."); if (response.status === 401) setAdminToken(""); return; }
    setProviders(body.providers || []);
    setDrafts(Object.fromEntries((body.providers || []).map((provider) => [provider.id, { apiKey: "", model: provider.model, makeDefault: provider.isDefault }])));
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken || demoMode) return;
    const timer = window.setTimeout(() => void load(adminToken), 0);
    return () => window.clearTimeout(timer);
  }, [adminToken, demoMode, load]);

  function unlock() {
    const token = tokenDraft.trim(); if (!token) return;
    window.sessionStorage.setItem("comprendoc-admin-token", token); setAdminToken(token); setTokenDraft("");
  }

  function update(id: string, patch: Partial<{ apiKey: string; model: string; makeDefault: boolean }>) {
    setDrafts((current) => {
      const next = patch.makeDefault ? Object.fromEntries(Object.entries(current).map(([key, value]) => [key, { ...value, makeDefault: false }])) : { ...current };
      return { ...next, [id]: { ...(next[id] || { apiKey: "", model: providerDefinitions[id as ProviderId].defaultModel, makeDefault: false }), ...patch } };
    });
  }

  async function save(provider: ProviderStatus) {
    const draft = drafts[provider.id]; if (!draft?.apiKey.trim()) { setMessage(`Enter a new ${provider.name} API key.`); return; }
    setBusy(provider.id); setMessage("");
    const response = await fetch("/api/providers", { method: "PUT", headers: { "Content-Type": "application/json", "X-Comprendoc-Admin-Token": adminToken }, body: JSON.stringify({ provider: provider.id, apiKey: draft.apiKey, model: draft.model, makeDefault: draft.makeDefault }) });
    const body = await response.json() as { error?: string };
    setBusy(""); if (!response.ok) { setMessage(body.error || "Could not save this provider."); return; }
    setMessage(`${provider.name} saved. The key is encrypted and cannot be displayed.`); await load();
  }

  async function remove(provider: ProviderStatus) {
    if (!window.confirm(`Remove the saved ${provider.name} key? This cannot be undone.`)) return;
    setBusy(provider.id); setMessage("");
    const response = await fetch(`/api/providers?provider=${encodeURIComponent(provider.id)}`, { method: "DELETE", headers: { "X-Comprendoc-Admin-Token": adminToken } });
    const body = await response.json() as { error?: string }; setBusy("");
    if (!response.ok) { setMessage(body.error || "Could not remove this provider."); return; }
    setMessage(`${provider.name} removed.`); await load();
  }

  if (demoMode) return <main className="settings-page"><Link className="back-button" href="/"><ArrowLeft size={17}/>Back to demo</Link><div className="settings-empty"><LockKeyhole/><h1>Settings are unavailable on the public demo</h1><p>Clone and self-host Comprendoc to configure your own providers.</p></div></main>;

  return <main className="settings-page"><div className="settings-page-head"><Link className="back-button" href="/"><ArrowLeft size={17}/>Back to Comprendoc</Link><div className="settings-title"><span className="settings-title-icon"><Database/></span><div><span className="kicker">SELF-HOSTED CONFIGURATION</span><h1>AI provider vault</h1><p>Store multiple provider keys encrypted at rest and choose which model handles each document.</p></div></div><div className="vault-notice"><ShieldCheck/><div><strong>AES-256-GCM encrypted</strong><p>Keys are never returned to this page after saving. The database contains ciphertext; the master key remains in your server environment.</p></div></div></div>
    {!adminToken ? <section className="unlock-card"><KeyRound/><h2>Unlock provider settings</h2><p>Enter the administrator token configured as <code>COMPRENDOC_ADMIN_TOKEN</code>. It stays in this browser session only.</p><label><span>Administrator token</span><input type="password" value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") unlock(); }} autoComplete="off"/></label><button className="primary-button" onClick={unlock}>Unlock settings</button>{message && <p className="settings-message error">{message}</p>}</section> : <><div className="provider-toolbar"><div><strong>{providers.filter((provider) => provider.configured).length} of {providers.length} configured</strong><span>Saving a new key replaces the previous key permanently.</span></div><button className="secondary-button" onClick={() => { window.sessionStorage.removeItem("comprendoc-admin-token"); setAdminToken(""); setProviders([]); }}>Lock settings</button></div>{message && <p className="settings-message">{message}</p>}<section className="provider-grid">{providers.map((provider) => { const draft = drafts[provider.id] || { apiKey: "", model: provider.model, makeDefault: provider.isDefault }; return <article className={`provider-card ${provider.configured ? "configured" : ""}`} key={provider.id}><div className="provider-card-head"><span className={`provider-logo provider-${provider.id}`}>{provider.name.slice(0, 1)}</span><div><h2>{provider.name}</h2><span className={provider.configured ? "status-ready" : "status-empty"}>{provider.configured ? <><Check size={13}/>Configured{provider.isDefault ? " · default" : ""}</> : "Not configured"}</span></div><a href={provider.docs} target="_blank" rel="noreferrer" aria-label={`${provider.name} documentation`}><ExternalLink size={16}/></a></div><dl><div><dt>Endpoint</dt><dd>{provider.baseUrl}</dd></div></dl><label><span>Model ID</span><input value={draft.model} onChange={(event) => update(provider.id, { model: event.target.value })}/></label><label><span>{provider.configured ? "New API key (replaces saved key)" : "API key"}</span><input type="password" value={draft.apiKey} onChange={(event) => update(provider.id, { apiKey: event.target.value })} placeholder={provider.configured ? "Saved key is hidden" : "Paste key"} autoComplete="new-password" spellCheck={false}/></label><label className="default-check"><input type="checkbox" checked={draft.makeDefault} onChange={(event) => update(provider.id, { makeDefault: event.target.checked })}/><span>Make default provider</span></label><div className="provider-actions"><button className="primary-button" disabled={busy === provider.id || !draft.apiKey.trim()} onClick={() => save(provider)}><Save size={16}/>{provider.configured ? "Replace key" : "Save provider"}</button>{provider.configured && <button className="danger-button" disabled={busy === provider.id} onClick={() => remove(provider)}><Trash2 size={16}/>Remove</button>}</div></article>; })}</section></>}
  </main>;
}
