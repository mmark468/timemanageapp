import fs from "node:fs/promises";
import path from "node:path";
import { databaseFolder, localManifestPath, raw9709Folder } from "./sourceConfig.mjs";

async function main() {
  await fs.mkdir(raw9709Folder, { recursive: true });
  await fs.mkdir(databaseFolder, { recursive: true });

  const pdfPaths = await findPdfFiles(raw9709Folder);
  const resources = pdfPaths.map((pdfPath) => {
    const fileName = path.basename(pdfPath);
    return {
      fileName,
      savedPath: pdfPath,
      ...parseCambridgeFileName(fileName),
    };
  });

  const manifest = {
    syllabusCode: "9709",
    generatedAt: new Date().toISOString(),
    sourceFolder: raw9709Folder,
    resourceCount: resources.length,
    resources,
  };

  await fs.writeFile(localManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Indexed ${resources.length} PDFs.`);
  console.log(`Manifest: ${localManifestPath}`);
}

async function findPdfFiles(folder) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findPdfFiles(entryPath)));
    } else if (entry.name.toLowerCase().endsWith(".pdf")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function parseCambridgeFileName(fileName) {
  const lowerName = fileName.toLowerCase();
  const componentCode = extractComponentCode(lowerName);

  return {
    board: "CAIE",
    subjectName: "Mathematics",
    syllabusCode: "9709",
    kind: extractKind(lowerName),
    year: extractYear(lowerName),
    series: extractSeries(lowerName),
    componentCode,
    paperLabel: componentCode ? `Paper ${componentCode}` : "Unknown paper",
  };
}

function extractKind(fileName) {
  if (fileName.includes("mark-scheme") || /_ms_/.test(fileName)) return "markScheme";
  if (fileName.includes("question-paper") || /_qp_/.test(fileName)) return "questionPaper";
  if (fileName.includes("examiner-report") || /_er_/.test(fileName)) return "examinerReport";
  return "unknown";
}

function extractYear(fileName) {
  const fullYear = fileName.match(/\b(20\d{2})\b/);
  if (fullYear?.[1]) return Number(fullYear[1]);

  const shortYear = fileName.match(/(?:^|[_-])(?:m|s|w)(\d{2})(?:[_-]|$)/);
  if (shortYear?.[1]) return Number(`20${shortYear[1]}`);

  return null;
}

function extractSeries(fileName) {
  if (fileName.includes("feb") || fileName.includes("march") || /(?:^|[_-])m\d{2}(?:[_-]|$)/.test(fileName)) {
    return "February/March";
  }

  if (fileName.includes("may") || fileName.includes("june") || /(?:^|[_-])s\d{2}(?:[_-]|$)/.test(fileName)) {
    return "May/June";
  }

  if (fileName.includes("oct") || fileName.includes("nov") || /(?:^|[_-])w\d{2}(?:[_-]|$)/.test(fileName)) {
    return "October/November";
  }

  return null;
}

function extractComponentCode(fileName) {
  const paperText = fileName.match(/paper[-_ ]?([1-6][0-9]?)/);
  if (paperText?.[1]) return normaliseComponent(paperText[1]);

  const cambridgeCode = fileName.match(/9709[_/-](?:m|s|w)?\d{2}[_/-](?:qp|ms|er)[_/-]([1-6][0-9]?)/);
  if (cambridgeCode?.[1]) return normaliseComponent(cambridgeCode[1]);

  return null;
}

function normaliseComponent(componentCode) {
  return componentCode.length === 1 ? `${componentCode}1` : componentCode;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
