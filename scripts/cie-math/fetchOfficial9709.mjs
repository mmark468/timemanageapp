import fs from "node:fs/promises";
import path from "node:path";
import {
  allowedOfficialHosts,
  databaseFolder,
  downloadedManifestPath,
  official9709PageUrl,
  raw9709Folder,
} from "./sourceConfig.mjs";

async function main() {
  await fs.mkdir(raw9709Folder, { recursive: true });
  await fs.mkdir(databaseFolder, { recursive: true });

  const pageHtml = await downloadText(official9709PageUrl);
  const resources = extractOfficialPdfLinks(pageHtml);

  if (resources.length === 0) {
    throw new Error("No official CAIE Mathematics 9709 PDF links were found on the public page.");
  }

  const downloadedResources = [];
  for (const resource of resources) {
    const savedPath = await downloadPdf(resource);
    downloadedResources.push({ ...resource, savedPath });
  }

  const manifest = {
    sourcePage: official9709PageUrl,
    generatedAt: new Date().toISOString(),
    note: "This manifest contains only public PDFs exposed by the official Cambridge International 9709 page.",
    resources: downloadedResources,
  };

  await fs.writeFile(downloadedManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Downloaded ${downloadedResources.length} official PDFs.`);
  console.log(`Manifest: ${downloadedManifestPath}`);
}

async function downloadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractOfficialPdfLinks(pageHtml) {
  const links = [];
  const linkPattern = /<a[^>]+href=(["'])(?<href>[^"']+\.pdf)\1[^>]*>(?<label>[\s\S]*?)<\/a>/gi;

  for (const match of pageHtml.matchAll(linkPattern)) {
    const href = match.groups?.href;
    const label = cleanHtmlText(match.groups?.label ?? "");
    if (!href || !isMath9709Resource(label)) continue;

    const url = new URL(href, official9709PageUrl);
    if (!allowedOfficialHosts.has(url.hostname)) continue;

    links.push({
      label,
      url: url.toString(),
      fileName: path.basename(url.pathname),
      kind: label.toLowerCase().includes("mark scheme") ? "markScheme" : "questionPaper",
    });
  }

  return dedupeByUrl(links);
}

function cleanHtmlText(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isMath9709Resource(label) {
  const lowerLabel = label.toLowerCase();
  return (
    lowerLabel.includes("question paper") ||
    lowerLabel.includes("mark scheme") ||
    lowerLabel.includes("specimen paper") ||
    lowerLabel.includes("specimen mark scheme")
  );
}

function dedupeByUrl(resources) {
  const seenUrls = new Set();
  return resources.filter((resource) => {
    if (seenUrls.has(resource.url)) return false;
    seenUrls.add(resource.url);
    return true;
  });
}

async function downloadPdf(resource) {
  const response = await fetch(resource.url);
  if (!response.ok) {
    throw new Error(`Failed to download ${resource.url}: ${response.status} ${response.statusText}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const savedPath = path.join(raw9709Folder, resource.fileName);
  await fs.writeFile(savedPath, bytes);
  return savedPath;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
