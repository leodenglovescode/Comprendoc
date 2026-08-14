"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Database, ExternalLink, LockKeyhole, Save, ShieldCheck, Trash2 } from "lucide-react";
import { providerDefinitions, type ProviderId } from "../lib/providers";
import { detectLocale, formatMessage, interfaceLanguages, messages, type Locale } from "../lib/i18n";

type ProviderStatus = { id: ProviderId; name: string; baseUrl: string; defaultModel: string; model: string; configured: boolean; isDefault: boolean; docs: string };

export function ProviderSettings({ demoMode }: { demoMode: boolean }) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { apiKey: string; model: string; makeDefault: boolean }>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const t = messages(locale);

  useEffect(() => { const timer = window.setTimeout(() => {
    const saved = window.localStorage.getItem("comprendoc-locale") as Locale | null;
    const next = saved && interfaceLanguages.some((item) => item.code === saved) ? saved : detectLocale(navigator.languages || [navigator.language]);
    setLocale(next); window.document.documentElement.lang = next;
    window.document.documentElement.dir = interfaceLanguages.find((item) => item.code === next)?.dir || "ltr";
  }, 0); return () => window.clearTimeout(timer); }, []);

  const load = useCallback(async () => {
    setMessage("");
    const response = await fetch("/api/providers");
    const body = await response.json() as { providers?: ProviderStatus[]; error?: string };
    if (!response.ok) { setMessage(t.loadSettingsError); return; }
    setProviders(body.providers || []);
    setDrafts(Object.fromEntries((body.providers || []).map((provider) => [provider.id, { apiKey: "", model: provider.model, makeDefault: provider.isDefault }])));
  }, [t.loadSettingsError]);

  useEffect(() => {
    if (demoMode) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [demoMode, load]);

  function update(id: string, patch: Partial<{ apiKey: string; model: string; makeDefault: boolean }>) {
    setDrafts((current) => {
      const next = patch.makeDefault ? Object.fromEntries(Object.entries(current).map(([key, value]) => [key, { ...value, makeDefault: false }])) : { ...current };
      return { ...next, [id]: { ...(next[id] || { apiKey: "", model: providerDefinitions[id as ProviderId].defaultModel, makeDefault: false }), ...patch } };
    });
  }

  async function save(provider: ProviderStatus) {
    const draft = drafts[provider.id]; if (!draft?.apiKey.trim()) { setMessage(formatMessage(t.enterProviderKey, { provider: provider.name })); return; }
    setBusy(provider.id); setMessage("");
    const response = await fetch("/api/providers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: provider.id, apiKey: draft.apiKey, model: draft.model, makeDefault: draft.makeDefault }) });
    await response.json();
    setBusy(""); if (!response.ok) { setMessage(t.saveProviderError); return; }
    setMessage(formatMessage(t.providerSaved, { provider: provider.name })); await load();
  }

  async function remove(provider: ProviderStatus) {
    if (!window.confirm(formatMessage(t.removeProviderConfirm, { provider: provider.name }))) return;
    setBusy(provider.id); setMessage("");
    const response = await fetch(`/api/providers?provider=${encodeURIComponent(provider.id)}`, { method: "DELETE" });
    await response.json(); setBusy("");
    if (!response.ok) { setMessage(t.removeProviderError); return; }
    setMessage(formatMessage(t.providerRemoved, { provider: provider.name })); await load();
  }

  if (demoMode) return <main className="settings-page"><Link className="back-button" href="/"><ArrowLeft size={17}/>{t.backToDemo}</Link><div className="settings-empty"><LockKeyhole/><h1>{t.settingsUnavailable}</h1><p>{t.settingsUnavailableCopy}</p></div></main>;

  return <main className="settings-page"><div className="settings-page-head"><Link className="back-button" href="/"><ArrowLeft size={17}/>{t.backToComprendoc}</Link><div className="settings-title"><span className="settings-title-icon"><Database/></span><div><span className="kicker">{t.selfHostedConfiguration}</span><h1>{t.providerVault}</h1><p>{t.providerVaultCopy}</p></div></div><div className="vault-notice"><ShieldCheck/><div><strong>{t.encryptedAtRest}</strong><p>{t.encryptedAtRestCopy}</p></div></div></div>
    <div className="provider-toolbar"><div><strong>{formatMessage(t.configuredCount, { configured: providers.filter((provider) => provider.configured).length, total: providers.length })}</strong><span>{t.replaceKeyWarning}</span></div></div>{message && <p className="settings-message">{message}</p>}<section className="provider-grid">{providers.map((provider) => { const draft = drafts[provider.id] || { apiKey: "", model: provider.model, makeDefault: provider.isDefault }; return <article className={`provider-card ${provider.configured ? "configured" : ""}`} key={provider.id}><div className="provider-card-head"><span className={`provider-logo provider-${provider.id}`}>{provider.name.slice(0, 1)}</span><div><h2>{provider.name}</h2><span className={provider.configured ? "status-ready" : "status-empty"}>{provider.configured ? <><Check size={13}/>{t.configured}{provider.isDefault ? ` · ${t.defaultProvider}` : ""}</> : t.notConfigured}</span></div><a href={provider.docs} target="_blank" rel="noreferrer" aria-label={formatMessage(t.providerDocumentation, { provider: provider.name })}><ExternalLink size={16}/></a></div><dl><div><dt>{t.endpoint}</dt><dd>{provider.baseUrl}</dd></div></dl><label><span>{t.modelId}</span><input value={draft.model} onChange={(event) => update(provider.id, { model: event.target.value })}/></label><label><span>{provider.configured ? t.newApiKey : t.apiKeyLabel}</span><input type="password" value={draft.apiKey} onChange={(event) => update(provider.id, { apiKey: event.target.value })} placeholder={provider.configured ? t.savedKeyHidden : t.pasteKey} autoComplete="new-password" spellCheck={false}/></label><label className="default-check"><input type="checkbox" checked={draft.makeDefault} onChange={(event) => update(provider.id, { makeDefault: event.target.checked })}/><span>{t.makeDefault}</span></label><div className="provider-actions"><button className="primary-button" disabled={busy === provider.id || !draft.apiKey.trim()} onClick={() => save(provider)}><Save size={16}/>{provider.configured ? t.replaceKey : t.saveProvider}</button>{provider.configured && <button className="danger-button" disabled={busy === provider.id} onClick={() => remove(provider)}><Trash2 size={16}/>{t.removeProvider}</button>}</div></article>; })}</section>
  </main>;
}
