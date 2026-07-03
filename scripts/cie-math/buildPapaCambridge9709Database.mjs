import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsFolder = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsFolder, "../..");
const outputPath = path.join(workspaceRoot, "src/features/questionSearch/math9709PaperDatabase.ts");
const baseUrl = "https://pastpapers.papacambridge.com/";
const indexUrl = `${baseUrl}papers/caie/as-and-a-level-mathematics-9709`;
const fromYear = 2018;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const seriesMeta = {
  "feb-march": { code: "m", name: "February/March", label: "Feb/March" },
  march: { code: "m", name: "February/March", label: "March" },
  "may-june": { code: "s", name: "May/June", label: "May/June" },
  "oct-nov": { code: "w", name: "October/November", label: "Oct/Nov" },
};

const currentSyllabusPaperNames = {
  1: "Paper 1 Pure Mathematics 1",
  2: "Paper 2 Pure Mathematics 2",
  3: "Paper 3 Pure Mathematics 3",
  4: "Paper 4 Mechanics",
  5: "Paper 5 Probability & Statistics 1",
  6: "Paper 6 Probability & Statistics 2",
};

const legacySyllabusPaperNames = {
  1: "Paper 1 Pure Mathematics 1",
  2: "Paper 2 Pure Mathematics 2",
  3: "Paper 3 Pure Mathematics 3",
  4: "Paper 4 Mechanics 1",
  5: "Paper 5 Mechanics 2",
  6: "Paper 6 Probability & Statistics 1",
  7: "Paper 7 Probability & Statistics 2",
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { agent: httpsAgent, headers: { "user-agent": "time-planning-app/9709-indexer" } }, (response) => {
        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
          response.resume();
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function discoverSessionLinks(indexHtml) {
  const matches = indexHtml.matchAll(/href="(papers\/caie\/as-and-a-level-mathematics-9709-[^"]+)"/g);
  const sessions = new Map();

  for (const match of matches) {
    const href = match[1];
    const meta = parseSessionHref(href);
    if (!meta || meta.year < fromYear) continue;

    sessions.set(`${meta.year}-${meta.seriesCode}`, {
      ...meta,
      url: new URL(href, baseUrl).toString(),
      pagePath: href,
    });
  }

  return Array.from(sessions.values()).sort(
    (left, right) => right.year - left.year || seriesSortValue(left.seriesCode) - seriesSortValue(right.seriesCode),
  );
}

function parseSessionHref(href) {
  const normalized = href.toLowerCase();

  const yearFirst = normalized.match(/9709-(20\d{2})-(feb-march|march|may-june|oct-nov)$/);
  if (yearFirst) {
    const year = Number(yearFirst[1]);
    const series = seriesMeta[yearFirst[2]];
    return { year, seriesCode: series.code, seriesName: series.name, sessionLabel: series.label };
  }

  const mayJune2020 = normalized.match(/9709-may-june-(20\d{2})$/);
  if (mayJune2020) {
    const year = Number(mayJune2020[1]);
    const series = seriesMeta["may-june"];
    return { year, seriesCode: series.code, seriesName: series.name, sessionLabel: series.label };
  }

  return null;
}

function parsePaperResources(session, html) {
  const resources = new Map();
  const directPdfMatches = html.matchAll(/https:\/\/pastpapers\.papacambridge\.com\/directories\/CAIE\/CAIE-pastpapers\/upload\/9709_[msw]\d{2}_(?:qp|ms)_\d{2}\.pdf/g);

  for (const match of directPdfMatches) {
    const url = match[0];
    const fileName = path.basename(new URL(url).pathname);
    const meta = fileName.match(/^9709_([msw])(\d{2})_(qp|ms)_(\d{2})\.pdf$/);
    if (!meta) continue;

    const [, cambridgeSeriesCode, yearShort, kind, componentCode] = meta;
    const year = Number(`20${yearShort}`);
    if (year !== session.year || cambridgeSeriesCode !== session.seriesCode) continue;

    const id = `9709-${year}-${session.seriesCode}-${componentCode}`;
    const current =
      resources.get(id) ??
      {
        id,
        syllabusCode: "9709",
        year,
        seriesCode: session.seriesCode,
        seriesName: session.seriesName,
        sessionLabel: session.sessionLabel,
        componentCode,
        componentGroup: getComponentGroup(year, componentCode),
        paperLabel: getPaperLabel(year, componentCode),
        sourcePageUrl: session.url,
      };

    const resource = {
      label: `${session.sessionLabel} ${year} ${kind === "qp" ? "Question Paper" : "Mark Scheme"} ${componentCode}`,
      url,
      fileName,
    };

    if (kind === "qp") {
      current.questionPaper = resource;
    } else {
      current.markScheme = resource;
    }

    resources.set(id, current);
  }

  return Array.from(resources.values())
    .filter((resource) => resource.questionPaper || resource.markScheme)
    .sort((left, right) => Number(left.componentCode) - Number(right.componentCode));
}

function getPaperLabel(year, componentCode) {
  const paperNumber = Number(componentCode[0]);
  const labels = year <= 2019 ? legacySyllabusPaperNames : currentSyllabusPaperNames;
  return labels[paperNumber] ?? `Paper ${componentCode}`;
}

function getComponentGroup(year, componentCode) {
  const paperNumber = Number(componentCode[0]);
  if (paperNumber <= 3) return "pure";
  if (year <= 2019 && paperNumber <= 5) return "mechanics";
  if (year >= 2020 && paperNumber === 4) return "mechanics";
  return "statistics";
}

function seriesSortValue(seriesCode) {
  if (seriesCode === "m") return 1;
  if (seriesCode === "s") return 2;
  return 3;
}

function buildTypeScript(resources, sessions) {
  const generatedAt = new Date().toISOString();
  const completePairs = resources.filter((resource) => resource.questionPaper && resource.markScheme).length;
  const dataLiteral = JSON.stringify(resources, null, 2);

  return `// Generated by scripts/cie-math/buildPapaCambridge9709Database.mjs
// Source: ${indexUrl}
// Generated at: ${generatedAt}

import type { CieMathComponentGroup } from "./types";

export type Math9709SeriesCode = "m" | "s" | "w";
export type Math9709SeriesName = "February/March" | "May/June" | "October/November";

export interface Math9709PaperLink {
  label: string;
  url: string;
  fileName: string;
}

export interface Math9709PaperResource {
  id: string;
  syllabusCode: "9709";
  year: number;
  seriesCode: Math9709SeriesCode;
  seriesName: Math9709SeriesName;
  sessionLabel: string;
  componentCode: string;
  componentGroup: Exclude<CieMathComponentGroup, "all">;
  paperLabel: string;
  sourcePageUrl: string;
  questionPaper?: Math9709PaperLink;
  markScheme?: Math9709PaperLink;
}

export const math9709PaperDatabaseGeneratedAt = "${generatedAt}";
export const math9709PaperDatabaseSourceUrl = "${indexUrl}";
export const math9709PaperDatabaseStats = {
  fromYear: ${fromYear},
  sessionCount: ${sessions.length},
  paperCount: ${resources.length},
  completePairCount: ${completePairs},
  questionPaperCount: ${resources.filter((resource) => resource.questionPaper).length},
  markSchemeCount: ${resources.filter((resource) => resource.markScheme).length},
} as const;

export const math9709PaperDatabase = ${dataLiteral} satisfies Math9709PaperResource[];
`;
}

async function main() {
  const indexHtml = await fetchText(indexUrl);
  const sessions = discoverSessionLinks(indexHtml);
  const resources = [];

  for (const session of sessions) {
    const html = await fetchText(session.url);
    const sessionResources = parsePaperResources(session, html);
    resources.push(...sessionResources);
    console.log(`${session.year} ${session.sessionLabel}: ${sessionResources.length} papers`);
  }

  await fs.writeFile(outputPath, buildTypeScript(resources, sessions));
  console.log(`Wrote ${resources.length} paper resources to ${path.relative(workspaceRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
