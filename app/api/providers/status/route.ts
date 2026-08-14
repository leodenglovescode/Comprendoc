import { listProviderStatuses } from "../../../../lib/provider-storage";

export const runtime = "edge";

function isDemo(request: Request) {
  return process.env.COMPRENDOC_MODE === "demo" || new URL(request.url).hostname.endsWith(".chatgpt.site");
}

export async function GET(request: Request) {
  if (isDemo(request)) return Response.json({ providers: [] });
  try {
    const providers = await listProviderStatuses();
    return Response.json({ providers: providers.filter((provider) => provider.configured).map(({ id, name, model, isDefault }) => ({ id, name, model, isDefault })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ providers: [], error: error instanceof Error ? error.message : "Provider storage is unavailable." }, { status: 503 });
  }
}
