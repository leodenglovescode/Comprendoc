export const runtime = "edge";

export async function GET(request: Request) {
  const host = new URL(request.url).hostname;
  const demoMode = process.env.COMPRENDOC_MODE === "demo" || host.endsWith(".chatgpt.site");
  return Response.json({
    demoMode,
    hasServerKey: !demoMode && Boolean(process.env.OPENAI_API_KEY),
  }, { headers: { "Cache-Control": "no-store" } });
}
