import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(distDir, "assets");
const cssOutputPath = path.join(assetsDir, "time-planning-preview.css");
const jsOutputPath = path.join(assetsDir, "time-planning-preview.js");
const htmlOutputPath = path.join(distDir, "index.html");

const ignoreCssImports = {
  name: "ignore-css-imports",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, () => ({
      contents: "",
      loader: "js",
    }));
  },
};

await mkdir(assetsDir, { recursive: true });

const cssSource = await readFile(path.join(rootDir, "src/styles.css"), "utf8");
const customCss = extractCustomCss(cssSource);
const shouldRefreshCss = process.env.REFRESH_TAILWIND === "1" || !(await fileExists(cssOutputPath));
let css;

if (shouldRefreshCss) {
  const [{ default: postcss }, { default: tailwindcss }, { default: autoprefixer }] = await Promise.all([
    import("postcss"),
    import("tailwindcss"),
    import("autoprefixer"),
  ]);
  const cssResult = await postcss([tailwindcss(path.join(rootDir, "tailwind.config.cjs")), autoprefixer]).process(
    cssSource,
    {
      from: path.join(rootDir, "src/styles.css"),
      to: cssOutputPath,
    },
  );
  css = cssResult.css;
} else {
  css = await readFile(cssOutputPath, "utf8");
}

if (customCss) {
  css = css.replace(/\/\* preview-custom-start \*\/[\s\S]*?\/\* preview-custom-end \*\//g, "").trimEnd();
  css = `${css}\n${customCss}\n`;
}

await writeFile(cssOutputPath, css, "utf8");

await esbuild.build({
  entryPoints: [path.join(rootDir, "src/main.tsx")],
  bundle: true,
  outfile: jsOutputPath,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  sourcemap: false,
  minify: true,
  plugins: [ignoreCssImports],
});

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#F6F8FB" />
    <title>时间规划</title>
    <link rel="stylesheet" href="/assets/time-planning-preview.css" />
  </head>
  <body>
    <div id="root"></div>
    <script src="/assets/time-planning-preview.js"></script>
  </body>
</html>
`;

await writeFile(htmlOutputPath, html, "utf8");

console.log("Built dist/index.html");

async function fileExists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

function extractCustomCss(cssText) {
  const match = cssText.match(/\/\* preview-custom-start \*\/[\s\S]*?\/\* preview-custom-end \*\//);
  return match?.[0] ?? "";
}
