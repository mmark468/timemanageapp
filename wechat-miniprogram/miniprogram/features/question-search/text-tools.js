const stopWords = ["the", "and", "for", "with", "from", "into", "paper", "question", "math", "maths"];

function normaliseSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5/.\-+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTerms(value) {
  const normalisedValue = normaliseSearchText(value);
  if (!normalisedValue) return [];
  return unique(normalisedValue.split(" ").filter((term) => term.length > 1 && !stopWords.includes(term)));
}

function getQuestionSearchText(question) {
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
      ...(question.tags || []),
    ].join(" "),
  );
}

function extractPaperReferences(value) {
  const normalisedValue = normaliseSearchText(value);
  if (!normalisedValue) return [];

  const reference = {
    syllabusCode: normalisedValue.includes("9709") ? "9709" : "",
    componentCode: extractComponentCode(normalisedValue),
    year: extractYear(normalisedValue),
    series: extractSeries(normalisedValue),
    questionNumber: extractQuestionNumber(normalisedValue),
  };

  const hasReference = Object.keys(reference).some((key) => Boolean(reference[key]));
  return hasReference ? [reference] : [];
}

function extractYear(value) {
  const fullYear = value.match(/\b(20\d{2})\b/);
  if (fullYear && fullYear[1]) return Number(fullYear[1]);

  const shortYear = value.match(/\b[msw](\d{2})\b/);
  if (shortYear && shortYear[1]) return Number(`20${shortYear[1]}`);

  return null;
}

function extractSeries(value) {
  if (/\bm\d{2}\b/.test(value) || value.includes("feb") || value.includes("march")) return "February/March";
  if (/\bs\d{2}\b/.test(value) || value.includes("may") || value.includes("june")) return "May/June";
  if (/\bw\d{2}\b/.test(value) || value.includes("oct") || value.includes("nov")) return "October/November";
  return "";
}

function extractQuestionNumber(value) {
  const match = value.match(/\b(?:q|question)\s*([0-9]{1,2}[a-z]?)\b/);
  return match && match[1] ? match[1].toUpperCase() : "";
}

function extractComponentCode(value) {
  const slashReference = value.match(/\b9709\s*[/_\-]?\s*([1-6][0-9])\b/);
  if (slashReference && slashReference[1]) return slashReference[1];

  const componentReference = value.match(/\b(?:paper|p|component)\s*([1-6][0-9]?)\b/);
  if (!componentReference || !componentReference[1]) return "";
  return componentReference[1].length === 1 ? `${componentReference[1]}1` : componentReference[1];
}

function unique(items) {
  return Array.from(new Set(items));
}

module.exports = {
  extractPaperReferences,
  getQuestionSearchText,
  getSearchTerms,
  normaliseSearchText,
};
