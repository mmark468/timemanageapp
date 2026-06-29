import type { CieMathQuestion, ParsedPaperReference } from "./types";

const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "into", "paper", "question", "math", "maths"]);

export function normaliseSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}/.\-+\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSearchTerms(value: string): string[] {
  const normalisedValue = normaliseSearchText(value);
  if (!normalisedValue) return [];

  return Array.from(new Set(normalisedValue.split(" ").filter((term) => term.length > 1 && !STOP_WORDS.has(term))));
}

export function getQuestionSearchText(question: CieMathQuestion): string {
  return normaliseSearchText(
    [
      question.id,
      question.board,
      question.subjectName,
      question.syllabusCode,
      question.year,
      question.series,
      question.componentCode,
      question.paperLabel,
      question.variant,
      question.questionNumber,
      question.title,
      question.topic,
      question.questionSummary,
      question.markSchemeSummary,
      ...question.tags,
    ].join(" "),
  );
}

export function extractPaperReferences(value: string): ParsedPaperReference[] {
  const normalisedValue = normaliseSearchText(value);
  if (!normalisedValue) return [];

  const references: ParsedPaperReference[] = [];
  const year = extractYear(normalisedValue);
  const series = extractSeries(normalisedValue);
  const questionNumber = extractQuestionNumber(normalisedValue);
  const componentCode = extractComponentCode(normalisedValue);
  const syllabusCode = normalisedValue.includes("9709") ? "9709" : undefined;

  if (syllabusCode || componentCode || year || series || questionNumber) {
    references.push({
      syllabusCode,
      componentCode,
      year,
      series,
      questionNumber,
    });
  }

  return references;
}

function extractYear(value: string): number | undefined {
  const fullYear = value.match(/\b(20\d{2})\b/);
  if (fullYear?.[1]) return Number(fullYear[1]);

  const cambridgeShortYear = value.match(/\b[msw](\d{2})\b/);
  if (cambridgeShortYear?.[1]) return Number(`20${cambridgeShortYear[1]}`);

  return undefined;
}

function extractSeries(value: string): ParsedPaperReference["series"] | undefined {
  if (/\bm\d{2}\b/.test(value) || value.includes("feb") || value.includes("march")) return "February/March";
  if (/\bs\d{2}\b/.test(value) || value.includes("may") || value.includes("june")) return "May/June";
  if (/\bw\d{2}\b/.test(value) || value.includes("oct") || value.includes("nov")) return "October/November";
  return undefined;
}

function extractQuestionNumber(value: string): string | undefined {
  const labelledQuestion = value.match(/\b(?:q|question)\s*([0-9]{1,2}[a-z]?)\b/);
  return labelledQuestion?.[1]?.toUpperCase();
}

function extractComponentCode(value: string): string | undefined {
  const slashReference = value.match(/\b9709\s*[/_\-]?\s*([1-6][0-9])\b/);
  if (slashReference?.[1]) return slashReference[1];

  const componentReference = value.match(/\b(?:paper|p|component)\s*([1-6][0-9]?)\b/);
  const rawComponent = componentReference?.[1];
  if (!rawComponent) return undefined;

  return rawComponent.length === 1 ? `${rawComponent}1` : rawComponent;
}
