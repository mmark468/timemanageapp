import { recognizeImageText, type RecognizeOptions } from "./ocrEngine";
import { localCieMathQuestionSource, searchCieMathQuestions, type QuestionSearchDataSource } from "./questionSearchEngine";
import { extractPaperReferences } from "./textTools";
import type {
  CieMathComponentGroup,
  CieMathQuestion,
  LocatedQuestion,
  QuestionOcrOutcome,
} from "./types";

const SERIES_LETTERS: Record<CieMathQuestion["series"], string> = {
  "February/March": "F/M",
  "May/June": "M/J",
  "October/November": "O/N",
  Specimen: "SP",
};

/** 人类可读卷号：9709/12 · May/June 2024。 */
export function formatPaperNumber(question: CieMathQuestion): string {
  return `${question.syllabusCode}/${question.componentCode} · ${question.series} ${question.year}`;
}

/** CAIE 短卷号：9709/12/M/J/24。 */
export function formatPaperCode(question: CieMathQuestion): string {
  const yearShort = String(question.year).slice(-2);
  const seriesLetters = SERIES_LETTERS[question.series] ?? "M/J";
  return `${question.syllabusCode}/${question.componentCode}/${seriesLetters}/${yearShort}`;
}

function toLocatedQuestion(question: CieMathQuestion, score: number, matchReasons: string[]): LocatedQuestion {
  return {
    question,
    paperNumber: formatPaperNumber(question),
    paperCode: formatPaperCode(question),
    confidence: score,
    matchReasons,
  };
}

/**
 * 题目定位算法：吃一段（OCR 或手输）文本，输出最可能的「题目 / 答案 / 卷号」。
 * 复用现有打分引擎，并把 Paper 编号、题号等线索提取出来供界面展示。
 */
export function locateQuestionFromText(
  text: string,
  componentGroup: CieMathComponentGroup = "all",
  source: QuestionSearchDataSource = localCieMathQuestionSource,
): Omit<QuestionOcrOutcome, "ocr"> {
  const paperRefs = extractPaperReferences(text);
  const results = searchCieMathQuestions(
    { query: text, componentGroup },
    source,
  );

  const candidates = results
    .slice(0, 4)
    .map((result) => toLocatedQuestion(result.question, result.score, result.matchReasons));

  return {
    located: candidates[0],
    candidates,
    paperRefs,
  };
}

/**
 * 端到端：图片 → 本地 OCR → 题目定位。
 * 这是「拍照搜题」按钮背后的完整算法管线。
 */
export async function locateQuestionFromImage(
  file: File,
  componentGroup: CieMathComponentGroup = "all",
  options: RecognizeOptions = {},
  source: QuestionSearchDataSource = localCieMathQuestionSource,
): Promise<QuestionOcrOutcome> {
  const ocr = await recognizeImageText(file, options);
  // OCR 文本之外，文件名往往也含 9709/12/M/J/24 这类线索，一并喂给定位算法。
  const combinedText = [ocr.text, ...ocr.lines].join("\n");
  const located = locateQuestionFromText(combinedText, componentGroup, source);

  return { ocr, ...located };
}
