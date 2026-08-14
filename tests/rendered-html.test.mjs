import assert from "node:assert/strict";
import test from "node:test";
import { detectLocale, interfaceLanguages, languageLabel, messages, missingTranslationKeys, providerDisclosure, uiLanguages } from "../lib/i18n.ts";

async function render(host = "localhost") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://${host}/`, {
      headers: { accept: "text/html", host, "x-forwarded-host": host, "x-forwarded-proto": "https" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Comprendoc product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Comprendoc — Turn red tape into plain language<\/title>/i);
  assert.match(html, /Understand the paperwork/);
  assert.match(html, /Drop a document here/);
  assert.match(html, /Your file stays in your browser/);
  assert.match(html, /Try an example/i);
  assert.match(html, /No accounts/);
});

test("hosted Sites build is a synthetic-only demo", async () => {
  const response = await render("comprendoc.example.chatgpt.site");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Explore the Comprendoc demo/);
  assert.doesNotMatch(html, /Drop a document here/);

  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test-demo-api", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const apiResponse = await worker.fetch(new Request("https://comprendoc.example.chatgpt.site/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages: [{ page: 1, text: "Example" }] }) }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(apiResponse.status, 403);
});

test("API route rejects empty input without exposing internals", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test-api", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages: [] }) }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "No readable document text was provided." });
});

test("public demo blocks provider settings and exposes no configured providers", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test-provider-api", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const environment = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const status = await worker.fetch(new Request("https://comprendoc.example.chatgpt.site/api/providers/status"), environment, context);
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { providers: [] });
  const settings = await worker.fetch(new Request("https://comprendoc.example.chatgpt.site/api/providers"), environment, context);
  assert.equal(settings.status, 403);
  const documents = await worker.fetch(new Request("https://comprendoc.example.chatgpt.site/api/documents"), environment, context);
  assert.equal(documents.status, 403);
});

test("local-first settings and library APIs do not require a browser token", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test-local-first-api", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const environment = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const providerResponse = await worker.fetch(new Request("http://localhost/api/providers", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "unknown" }) }), environment, context);
  assert.equal(providerResponse.status, 400);
  const documentResponse = await worker.fetch(new Request("http://localhost/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }), environment, context);
  assert.equal(documentResponse.status, 400);
});

test("supports requested interface and explanation languages", () => {
  const languages = new Map(uiLanguages.map((language) => [language.code, language.analysis]));
  assert.equal(languages.get("ko"), "Korean");
  assert.equal(languages.get("fr"), "French");
  assert.equal(languages.get("de"), "German");
  assert.equal(languages.get("zh-TW"), "Traditional Chinese");
  assert.deepEqual(interfaceLanguages.map((language) => language.code), ["en", "zh-CN", "zh-TW", "fr", "de", "ko"]);
});

test("every selectable interface locale has complete site-wide copy", () => {
  for (const locale of interfaceLanguages.map((language) => language.code)) {
    assert.deepEqual(missingTranslationKeys(locale), [], `${locale} contains English fallbacks`);
  }
  assert.equal(languageLabel("zh-CN", "en"), "英语");
  assert.equal(languageLabel("de", "ko"), "Koreanisch");
});

test("detects Traditional Chinese variants without falling back to Simplified Chinese", () => {
  assert.equal(detectLocale(["zh-TW"]), "zh-TW");
  assert.equal(detectLocale(["zh-Hant-HK"]), "zh-TW");
  assert.equal(detectLocale(["zh_Hant"]), "zh-TW");
  assert.equal(detectLocale(["zh-CN"]), "zh-CN");
  assert.equal(detectLocale(["de-DE"]), "de");
});

test("disclosure names the provider that receives extracted text", () => {
  assert.equal(providerDisclosure(messages("zh-CN").disclosure, "DeepSeek"), "提取的文本（不是原文件）将发送给 DeepSeek 分析。");
  assert.match(providerDisclosure(messages("de").disclosure, "Mistral"), /Mistral/);
  assert.doesNotMatch(providerDisclosure(messages("fr").disclosure, "Anthropic"), /OpenAI/);
});
