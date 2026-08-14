import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
const assets = ["index.html", "styles.css", "app.js", "robots.txt"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(assets.map((asset) => cp(resolve(root, asset), resolve(output, asset))));

console.log(`Built ${assets.length} static assets in demo/dist`);
