import { headers } from "next/headers";
import { SavedDocumentLibrary } from "../../components/saved-document-library";

export default async function LibraryPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const demoMode = process.env.COMPRENDOC_MODE === "demo" || host.split(":")[0].endsWith(".chatgpt.site");
  return <SavedDocumentLibrary demoMode={demoMode} />;
}
