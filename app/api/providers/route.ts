import { deleteProviderCredential, listProviderStatuses, saveProviderCredential, verifyAdminToken } from "../../../lib/provider-storage";
import { isProviderId, providerDefinitions } from "../../../lib/providers";

export const runtime = "edge";

function isDemo(request: Request) {
  return process.env.COMPRENDOC_MODE === "demo" || new URL(request.url).hostname.endsWith(".chatgpt.site");
}

async function authorize(request: Request) {
  if (isDemo(request)) return Response.json({ error: "Provider settings are disabled on the public demo." }, { status: 403 });
  if (!process.env.COMPRENDOC_ADMIN_TOKEN) return Response.json({ error: "COMPRENDOC_ADMIN_TOKEN is not configured on this server." }, { status: 503 });
  if (!await verifyAdminToken(request)) return Response.json({ error: "The administrator token is incorrect." }, { status: 401 });
  return null;
}

export async function GET(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  try { return Response.json({ providers: await listProviderStatuses() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Provider storage is unavailable." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  try {
    const body = await request.json() as { provider?: string; apiKey?: string; model?: string; makeDefault?: boolean };
    if (!body.provider || !isProviderId(body.provider)) return Response.json({ error: "Unknown provider." }, { status: 400 });
    const apiKey = body.apiKey?.trim() || ""; const model = body.model?.trim() || providerDefinitions[body.provider].defaultModel;
    if (apiKey.length < 8 || apiKey.length > 4096) return Response.json({ error: "Enter a valid API key." }, { status: 400 });
    if (!/^[A-Za-z0-9._:/-]{1,160}$/.test(model)) return Response.json({ error: "Enter a valid model ID." }, { status: 400 });
    await saveProviderCredential(body.provider, apiKey, model, Boolean(body.makeDefault));
    return Response.json({ ok: true, providers: await listProviderStatuses() });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "The provider could not be saved." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  try {
    const provider = new URL(request.url).searchParams.get("provider") || "";
    if (!isProviderId(provider)) return Response.json({ error: "Unknown provider." }, { status: 400 });
    await deleteProviderCredential(provider);
    return Response.json({ ok: true, providers: await listProviderStatuses() });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "The provider could not be removed." }, { status: 500 }); }
}
