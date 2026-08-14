import type { AnalysisResult, ExtractedDocument } from "./types";

export type SavedDocumentPayload = {
  document: ExtractedDocument;
  analysis: AnalysisResult;
  language: string;
  level: string;
};

export type SavedDocument = SavedDocumentPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type SavedRow = { id: string; encrypted_payload: string; iv: string; created_at: string; updated_at: string };

async function getBinding(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Database storage is unavailable. Configure the DB binding for this self-hosted instance.");
  return env.DB;
}

async function ensureTable() {
  const db = await getBinding();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS saved_documents (
      id TEXT PRIMARY KEY NOT NULL,
      encrypted_payload TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_saved_documents_created_at ON saved_documents(created_at DESC)"),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

function bytesToBase64(value: Uint8Array) { return btoa(String.fromCharCode(...value)); }
function base64ToBytes(value: string) { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }

async function encryptionKey() {
  const encoded = process.env.COMPRENDOC_MASTER_KEY?.trim();
  if (!encoded) throw new Error("COMPRENDOC_MASTER_KEY is not configured.");
  let raw: Uint8Array;
  try { raw = base64ToBytes(encoded); } catch { throw new Error("COMPRENDOC_MASTER_KEY must be valid base64."); }
  if (raw.byteLength !== 32) throw new Error("COMPRENDOC_MASTER_KEY must decode to exactly 32 bytes.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptPayload(id: string, payload: SavedDocumentPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(`saved-document:${id}`) },
    await encryptionKey(),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return { encryptedPayload: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

async function decryptRow(row: SavedRow): Promise<SavedDocument> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(row.iv), additionalData: new TextEncoder().encode(`saved-document:${row.id}`) },
      await encryptionKey(),
      base64ToBytes(row.encrypted_payload),
    );
    return { id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, ...JSON.parse(new TextDecoder().decode(decrypted)) as SavedDocumentPayload };
  } catch { throw new Error("A saved document could not be decrypted. Check COMPRENDOC_MASTER_KEY."); }
}

export async function listSavedDocuments() {
  await ensureTable();
  const db = await getBinding();
  const result = await db.prepare("SELECT id, encrypted_payload, iv, created_at, updated_at FROM saved_documents ORDER BY created_at DESC").all<SavedRow>();
  return Promise.all(result.results.map(decryptRow));
}

export async function getSavedDocument(id: string) {
  await ensureTable();
  const db = await getBinding();
  const row = await db.prepare("SELECT id, encrypted_payload, iv, created_at, updated_at FROM saved_documents WHERE id = ?").bind(id).first<SavedRow>();
  return row ? decryptRow(row) : null;
}

export async function saveDocument(payload: SavedDocumentPayload) {
  await ensureTable();
  const db = await getBinding();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const encrypted = await encryptPayload(id, payload);
  await db.prepare("INSERT INTO saved_documents (id, encrypted_payload, iv, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, encrypted.encryptedPayload, encrypted.iv, now, now).run();
  return { id, createdAt: now };
}

export async function deleteSavedDocument(id: string) {
  await ensureTable();
  const db = await getBinding();
  await db.prepare("DELETE FROM saved_documents WHERE id = ?").bind(id).run();
}
