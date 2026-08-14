import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
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

test("API route rejects empty input without exposing internals", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test-api", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages: [] }) }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "No readable document text was provided." });
});
