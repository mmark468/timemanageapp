import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const shareDir = path.join(rootDir, "share");
const sourceHtmlPath = path.join(distDir, "index.html");
const outputHtmlPath = path.join(shareDir, "time-planning-demo.html");

function resolveDistAsset(assetPath) {
  return path.join(distDir, assetPath.replace(/^\//, ""));
}

let html = await readFile(sourceHtmlPath, "utf8");

html = await replaceAsync(
  html,
  /<link rel="stylesheet"(?: crossorigin)? href="([^"]+)"\s*\/?>/g,
  async (_match, href) => {
    const css = await readFile(resolveDistAsset(href), "utf8");
    return `<style>\n${css}\n</style>`;
  },
);

html = await replaceAsync(
  html,
  /<script(?: type="module")?(?: crossorigin)? src="([^"]+)"><\/script>/g,
  async (_match, src) => {
    const js = await readFile(resolveDistAsset(src), "utf8");
    return `<script>\n${js}\n</script>`;
  },
);

await mkdir(shareDir, { recursive: true });
await writeFile(outputHtmlPath, html, "utf8");

console.log(`Exported ${path.relative(rootDir, outputHtmlPath)}`);

async function replaceAsync(value, pattern, replacer) {
  const matches = [...value.matchAll(pattern)];
  let nextValue = value;

  for (const match of matches) {
    const replacement = await replacer(...match);
    nextValue = nextValue.replace(match[0], () => replacement);
  }

  return nextValue;
}
