import { getHashDistance } from "./imageFingerprint";
import { cieMathQuestionBank } from "./cieMathQuestionBank";
import { extractPaperReferences, getQuestionSearchText, getSearchTerms, normaliseSearchText } from "./textTools";
import type { CieMathQuestion, QuestionSearchRequest, QuestionSearchResult, QuestionSearchSignal } from "./types";

const SCORE_LIMIT = 99;

export interface QuestionSearchDataSource {
  kind: "local-seed" | "remote-database";
  questions: CieMathQuestion[];
}

export const localCieMathQuestionSource: QuestionSearchDataSource = {
  kind: "local-seed",
  questions: cieMathQuestionBank,
};

export function buildQuestionSearchSignal(request: Omit<QuestionSearchRequest, "componentGroup">): QuestionSearchSignal {
  const rawText = [request.query, request.fileName].filter(Boolean).join(" ");
  const keyword = normaliseSearchText(request.query);

  return {
    rawText,
    keyword,
    terms: getSearchTerms(rawText),
    fileName: request.fileName,
    fingerprint: request.fingerprint,
    paperRefs: extractPaperReferences(rawText),
  };
}

export function hasQuestionSearchInput(request: Omit<QuestionSearchRequest, "componentGroup">) {
  return Boolean(request.query?.trim() || request.fileName || request.fingerprint);
}

export function searchCieMathQuestions(
  request: QuestionSearchRequest,
  source: QuestionSearchDataSource = localCieMathQuestionSource,
): QuestionSearchResult[] {
  const signal = buildQuestionSearchSignal(request);
  if (!hasQuestionSearchInput(request)) return [];

  const filteredQuestions = source.questions.filter((question) => {
    return request.componentGroup === "all" || question.componentGroup === request.componentGroup;
  });

  return filteredQuestions
    .map((question) => scoreQuestion(question, signal))
    .filter((result) => shouldShowResult(result, signal))
    .sort((left, right) => right.score - left.score || left.question.id.localeCompare(right.question.id));
}

export function getCieMathDatabaseStats(source: QuestionSearchDataSource = localCieMathQuestionSource) {
  const components = Array.from(new Set(source.questions.map((question) => question.componentCode))).sort();
  const years = Array.from(new Set(source.questions.map((question) => question.year))).sort((left, right) => right - left);

  return {
    sourceKind: source.kind,
    questionCount: source.questions.length,
    componentCount: components.length,
    components,
    years,
  };
}

function scoreQuestion(question: CieMathQuestion, signal: QuestionSearchSignal): QuestionSearchResult {
  const reasons: string[] = [];
  const haystack = getQuestionSearchText(question);
  let score = 0;

  if (!signal.keyword && !signal.fileName && !signal.fingerprint) {
    score += 10;
    reasons.push("题库推荐");
  }

  for (const term of signal.terms) {
    if (haystack.includes(term)) {
      score += term.length >= 4 ? 10 : 6;
      reasons.push(`关键词 ${term}`);
    }
  }

  if (signal.keyword && haystack.includes(signal.keyword)) {
    score += 24;
    reasons.push("完整关键词命中");
  }

  for (const paperRef of signal.paperRefs) {
    if (paperRef.syllabusCode === question.syllabusCode) {
      score += 14;
      reasons.push("9709 编号命中");
    }

    if (paperRef.componentCode === question.componentCode) {
      score += 28;
      reasons.push(`Paper ${question.componentCode}`);
    }

    if (paperRef.year === question.year) {
      score += 12;
      reasons.push(`${question.year}`);
    }

    if (paperRef.series === question.series) {
      score += 10;
      reasons.push(question.series);
    }

    if (paperRef.questionNumber === question.questionNumber.toUpperCase()) {
      score += 30;
      reasons.push(`Q${question.questionNumber}`);
    }
  }

  const imageDistance = getHashDistance(signal.fingerprint?.hash, question.imageHash);
  if (imageDistance !== null) {
    const imageScore = Math.max(0, 34 - imageDistance);
    if (imageScore > 0) {
      score += imageScore;
      reasons.push(`图片指纹距离 ${imageDistance}`);
    }
  }

  return {
    question,
    score: Math.min(score, SCORE_LIMIT),
    matchReasons: Array.from(new Set(reasons)).slice(0, 4),
  };
}

function shouldShowResult(result: QuestionSearchResult, signal: QuestionSearchSignal): boolean {
  if (!signal.keyword && !signal.fileName && !signal.fingerprint) return false;
  return result.score > 0;
}
