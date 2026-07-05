const { cieMathQuestionBank } = require("./cie-math-question-bank");
const { extractPaperReferences, getQuestionSearchText, getSearchTerms, normaliseSearchText } = require("./text-tools");

function buildQuestionSearchSignal(request) {
  const rawText = [request.query, request.fileName].filter(Boolean).join(" ");
  return {
    rawText,
    keyword: normaliseSearchText(request.query),
    terms: getSearchTerms(rawText),
    fileName: request.fileName || "",
    paperRefs: extractPaperReferences(rawText),
  };
}

function searchCieMathQuestions(request) {
  const signal = buildQuestionSearchSignal(request);
  const componentGroup = request.componentGroup || "all";

  return cieMathQuestionBank
    .filter((question) => componentGroup === "all" || question.componentGroup === componentGroup)
    .map((question) => scoreQuestion(question, signal))
    .filter((result) => shouldShowResult(result, signal))
    .sort((left, right) => right.score - left.score || left.question.id.localeCompare(right.question.id));
}

function getCieMathDatabaseStats() {
  const components = Array.from(new Set(cieMathQuestionBank.map((question) => question.componentCode))).sort();
  return {
    questionCount: cieMathQuestionBank.length,
    componentCount: components.length,
    components,
  };
}

function scoreQuestion(question, signal) {
  const reasons = [];
  const haystack = getQuestionSearchText(question);
  let score = 0;

  if (!signal.keyword && !signal.fileName) {
    score += 10;
    reasons.push("题库推荐");
  }

  signal.terms.forEach((term) => {
    if (haystack.includes(term)) {
      score += term.length >= 4 ? 10 : 6;
      reasons.push(`关键词 ${term}`);
    }
  });

  if (signal.keyword && haystack.includes(signal.keyword)) {
    score += 24;
    reasons.push("完整关键词命中");
  }

  signal.paperRefs.forEach((paperRef) => {
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
    if (paperRef.questionNumber === String(question.questionNumber).toUpperCase()) {
      score += 30;
      reasons.push(`Q${question.questionNumber}`);
    }
  });

  return {
    question,
    score: Math.min(score, 99),
    matchReasons: Array.from(new Set(reasons)).slice(0, 4),
  };
}

function shouldShowResult(result, signal) {
  if (!signal.keyword && !signal.fileName) return true;
  return result.score > 0;
}

module.exports = {
  buildQuestionSearchSignal,
  getCieMathDatabaseStats,
  searchCieMathQuestions,
};
