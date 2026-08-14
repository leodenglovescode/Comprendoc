import { ComprendocApp } from "../components/comprendoc-app";
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const demoMode = process.env.COMPRENDOC_MODE === "demo" || host.split(":")[0].endsWith(".chatgpt.site");
  return <ComprendocApp demoMode={demoMode} />;
}
