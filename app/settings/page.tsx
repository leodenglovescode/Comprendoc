import { headers } from "next/headers";
import { ProviderSettings } from "../../components/provider-settings";

export default async function SettingsPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const demoMode = process.env.COMPRENDOC_MODE === "demo" || host.split(":")[0].endsWith(".chatgpt.site");
  return <ProviderSettings demoMode={demoMode} />;
}
