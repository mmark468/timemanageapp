export type CieMathComponentGroup = "all" | "pure" | "mechanics" | "statistics";

export interface CiePaperLink {
  label: string;
  url: string;
}

export interface CieMathQuestion {
  id: string;
  board: "CAIE";
  subjectName: "数学";
  syllabusCode: "9709";
  qualification: "AS/A Level";
  year: number;
  series: "February/March" | "May/June" | "October/November" | "Specimen";
  componentCode: string;
  componentGroup: Exclude<CieMathComponentGroup, "all">;
  paperLabel: string;
  variant: string;
  questionNumber: string;
  title: string;
  topic: string;
  questionSummary: string;
  answer: string;
  markSchemeSummary: string;
  questionImageUrl?: string;
  markSchemeImageUrl?: string;
  questionPdf: CiePaperLink;
  markSchemePdf: CiePaperLink;
  tags: string[];
  imageHash?: string;
}

export interface ImageFingerprint {
  hash: string;
  width: number;
  height: number;
}

export interface ParsedPaperReference {
  syllabusCode?: string;
  componentCode?: string;
  year?: number;
  series?: CieMathQuestion["series"];
  questionNumber?: string;
}

export interface QuestionSearchSignal {
  rawText: string;
  keyword: string;
  terms: string[];
  fileName?: string;
  fingerprint?: ImageFingerprint;
  paperRefs: ParsedPaperReference[];
}

export interface QuestionSearchResult {
  question: CieMathQuestion;
  score: number;
  matchReasons: string[];
}

export interface QuestionSearchRequest {
  query: string;
  fileName?: string;
  fingerprint?: ImageFingerprint;
  componentGroup: CieMathComponentGroup;
}

/** 本地 OCR 引擎在浏览器内识别图片后返回的原始结果。 */
export interface OcrTextResult {
  /** 识别出的完整文本。 */
  text: string;
  /** 引擎给出的整体置信度（0-100）。 */
  confidence: number;
  /** 逐行文本，保留题号、页眉等结构信息。 */
  lines: string[];
  /** 实际承担识别的引擎名，便于排查（tesseract / fallback 等）。 */
  engine: string;
  /** 预处理后用于展示的灰度图 dataURL，可选。 */
  processedPreview?: string;
}

export type OcrStage = "idle" | "loading-engine" | "preprocessing" | "recognizing" | "matching" | "done" | "error";

export interface OcrProgress {
  stage: OcrStage;
  /** 0-1 之间的进度，用于进度条。 */
  ratio: number;
  /** 给用户看的中文状态文案。 */
  label: string;
}

/** OCR + 题库匹配后，返回给界面的「题目 / 答案 / 卷号」结构化结果。 */
export interface LocatedQuestion {
  /** 命中的题目对象。 */
  question: CieMathQuestion;
  /** 卷号，例如 9709/12 · May/June 2024。 */
  paperNumber: string;
  /** 卷号短码，例如 9709/12/M/J/24。 */
  paperCode: string;
  /** 匹配置信度（0-100）。 */
  confidence: number;
  /** 命中原因，便于调试与展示。 */
  matchReasons: string[];
}

export interface QuestionOcrOutcome {
  ocr: OcrTextResult;
  located?: LocatedQuestion;
  /** 次优候选，便于用户手动纠正。 */
  candidates: LocatedQuestion[];
  paperRefs: ParsedPaperReference[];
}
