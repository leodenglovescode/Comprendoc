import { providerDefinitions, type ProviderId } from "./providers";

type CredentialRow = { provider: ProviderId; encrypted_key: string; iv: string; model: string; is_default: number };

async function getBinding(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Database storage is unavailable. Configure the DB binding for this self-hosted instance.");
  return env.DB;
}

async function ensureTable() {
  const db = await getBinding();
  await db.prepare(`CREATE TABLE IF NOT EXISTS provider_credentials (
    provider TEXT PRIMARY KEY NOT NULL,
    encrypted_key TEXT NOT NULL,
    iv TEXT NOT NULL,
    model TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
}

function bytesToBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function encryptionKey() {
  const encoded = process.env.COMPRENDOC_MASTER_KEY?.trim();
  if (!encoded) throw new Error("COMPRENDOC_MASTER_KEY is not configured.");
  let raw: Uint8Array;
  try { raw = base64ToBytes(encoded); } catch { throw new Error("COMPRENDOC_MASTER_KEY must be valid base64."); }
  if (raw.byteLength !== 32) throw new Error("COMPRENDOC_MASTER_KEY must decode to exactly 32 bytes.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(provider: ProviderId, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(provider) }, await encryptionKey(), new TextEncoder().encode(secret));
  return { encryptedKey: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

async function decryptSecret(row: CredentialRow) {
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(row.iv), additionalData: new TextEncoder().encode(row.provider) }, await encryptionKey(), base64ToBytes(row.encrypted_key));
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error(`The saved ${providerDefinitions[row.provider].name} key cannot be decrypted. Check COMPRENDOC_MASTER_KEY.`); }
}

export async function listProviderStatuses() {
  await ensureTable();
  const db = await getBinding();
  const result = await db.prepare("SELECT provider, model, is_default FROM provider_credentials ORDER BY provider").all<{ provider: ProviderId; model: string; is_default: number }>();
  return Object.entries(providerDefinitions).map(([id, definition]) => {
    const row = result.results.find((item) => item.provider === id);
    return { id: id as ProviderId, name: definition.name, baseUrl: definition.baseUrl, defaultModel: definition.defaultModel, model: row?.model || definition.defaultModel, configured: Boolean(row), isDefault: Boolean(row?.is_default), docs: definition.docs };
  });
}

export async function saveProviderCredential(provider: ProviderId, apiKey: string, model: string, makeDefault: boolean) {
  await ensureTable();
  const encrypted = await encryptSecret(provider, apiKey);
  const now = new Date().toISOString();
  const db = await getBinding();
  const statements = [];
  if (makeDefault) statements.push(db.prepare("UPDATE provider_credentials SET is_default = 0"));
  statements.push(db.prepare(`INSERT INTO provider_credentials (provider, encrypted_key, iv, model, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET encrypted_key = excluded.encrypted_key, iv = excluded.iv, model = excluded.model, is_default = excluded.is_default, updated_at = excluded.updated_at`).bind(provider, encrypted.encryptedKey, encrypted.iv, model, makeDefault ? 1 : 0, now, now));
  await db.batch(statements);
}

export async function deleteProviderCredential(provider: ProviderId) {
  await ensureTable();
  const db = await getBinding();
  await db.prepare("DELETE FROM provider_credentials WHERE provider = ?").bind(provider).run();
}

export async function loadProviderCredential(requested?: string) {
  await ensureTable();
  const db = await getBinding();
  let row: CredentialRow | null = null;
  if (requested) row = await db.prepare("SELECT provider, encrypted_key, iv, model, is_default FROM provider_credentials WHERE provider = ?").bind(requested).first<CredentialRow>();
  else row = await db.prepare("SELECT provider, encrypted_key, iv, model, is_default FROM provider_credentials ORDER BY is_default DESC, provider LIMIT 1").first<CredentialRow>();
  if (!row) throw new Error("No API provider is configured. Open Settings to add one.");
  return { provider: row.provider, apiKey: await decryptSecret(row), model: row.model, definition: providerDefinitions[row.provider] };
}
