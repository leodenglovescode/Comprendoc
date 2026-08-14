import { deleteSavedDocument, getSavedDocument, listSavedDocuments, saveDocument } from "../../../lib/saved-document-storage";
import { verifyAdminToken } from "../../../lib/provider-storage";
import { analysisSchema } from "../../../lib/schema";
import { z } from "zod";

export const runtime = "edge";

function isDemo(request: Request) {
  return process.env.COMPRENDOC_MODE === "demo" || new URL(request.url).hostname.endsWith(".chatgpt.site");
}

async function authorize(request: Request) {
  if (isDemo(request)) return Response.json({ error: "Saved documents are disabled on the public demo." }, { status: 403 });
  if (!process.env.COMPRENDOC_ADMIN_TOKEN) return Response.json({ error: "COMPRENDOC_ADMIN_TOKEN is not configured on this server." }, { status: 503 });
  if (!await verifyAdminToken(request)) return Response.json({ error: "The administrator token is incorrect." }, { status: 401 });
  return null;
}

function validId(id: string) { return /^[0-9a-f-]{36}$/i.test(id); }

const savedDocumentSchema = z.object({
  document: z.object({
    name: z.string().min(1).max(500),
    pages: z.array(z.object({ page: z.number().int().positive(), text: z.string(), method: z.enum(["text", "ocr", "paste", "docx", "txt"]), confidence: z.number().optional() })).min(1),
    text: z.string(),
    hasOcr: z.boolean(),
    lowConfidenceOcr: z.boolean(),
  }),
  analysis: analysisSchema,
  language: z.string().min(1).max(100),
  level: z.enum(["Simple", "Standard", "Detailed"]),
});

export async function GET(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      if (!validId(id)) return Response.json({ error: "Invalid document ID." }, { status: 400 });
      const document = await getSavedDocument(id);
      return document ? Response.json({ document }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Document not found." }, { status: 404 });
    }
    return Response.json({ documents: await listSavedDocuments() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Saved documents are unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  try {
    const body = await request.json();
    const encoded = JSON.stringify(body);
    if (encoded.length > 2_000_000) return Response.json({ error: "This processed document is too large to save." }, { status: 413 });
    const parsed = savedDocumentSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: "Incomplete document data." }, { status: 400 });
    const saved = await saveDocument(parsed.data);
    return Response.json({ ok: true, ...saved }, { status: 201 });
  } catch { return Response.json({ error: "The document could not be saved." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!validId(id)) return Response.json({ error: "Invalid document ID." }, { status: 400 });
    await deleteSavedDocument(id);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "The document could not be deleted." }, { status: 500 }); }
}
