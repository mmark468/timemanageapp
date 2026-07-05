import type { OcrProgress, OcrStage, OcrTextResult } from "./types";

/**
 * 本地 OCR 引擎。
 *
 * 所有识别都在浏览器内完成：图片先在 <canvas> 上做灰度 / 对比度增强，
 * 再交给按需懒加载的 Tesseract.js（WASM）识别。图片本身不会离开本地，
 * 只有体积很小的语言模型会在首次使用时从 CDN 拉取一次。
 */

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const ENGINE_LOAD_TIMEOUT = 20000;
const MAX_WIDTH = 1280;
const MIN_WIDTH = 720;

/** Tesseract.js 通过 UMD 注入到 window 上，这里给出运行时需要的最小类型。 */
interface TesseractLogMessage {
  status?: string;
  progress?: number;
}

interface TesseractRecognizeResult {
  data: {
    text?: string;
    confidence?: number;
    lines?: Array<{ text?: string }>;
  };
}

interface TesseractGlobal {
  recognize: (
    image: HTMLCanvasElement | HTMLImageElement | string | Blob,
    langs: string,
    options: { logger?: (message: TesseractLogMessage) => void },
  ) => Promise<TesseractRecognizeResult>;
}

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
  }
}

/** 引擎不可用（离线、CDN 被拦截等）时抛出的可识别错误，便于界面回退。 */
export class OcrUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrUnavailableError";
  }
}

export interface RecognizeOptions {
  onProgress?: (progress: OcrProgress) => void;
  /** 关闭二值化（拍照光照不均时可能更准）。默认开启轻度二值化。 */
  binarize?: boolean;
}

const STAGE_LABELS: Record<OcrStage, string> = {
  idle: "等待图片",
  "loading-engine": "正在加载本地识别引擎…",
  preprocessing: "正在增强图片清晰度…",
  recognizing: "正在本地识别文字…",
  matching: "正在比对题库…",
  done: "识别完成",
  error: "识别未完成",
};

function emit(onProgress: RecognizeOptions["onProgress"], stage: OcrStage, ratio: number, label?: string) {
  onProgress?.({ stage, ratio: clamp01(ratio), label: label ?? STAGE_LABELS[stage] });
}

let tesseractPromise: Promise<TesseractGlobal> | null = null;

/** 懒加载 Tesseract.js（脚本注入）。结果缓存，失败时清空以便重试。 */
function loadTesseract(): Promise<TesseractGlobal> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new OcrUnavailableError("当前环境不支持浏览器内 OCR。"));
  }
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;

  tesseractPromise = new Promise<TesseractGlobal>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-ocr-engine="tesseract"]`);
    const script = existing ?? document.createElement("script");
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new OcrUnavailableError("加载识别引擎超时，请检查网络后重试。"));
    }, ENGINE_LOAD_TIMEOUT);

    const finish = () => {
      if (settled) return;
      if (!window.Tesseract) {
        settled = true;
        window.clearTimeout(timer);
        reject(new OcrUnavailableError("识别引擎加载后不可用。"));
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      resolve(window.Tesseract);
    };

    script.addEventListener("load", finish);
    script.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new OcrUnavailableError("无法加载识别引擎（可能处于离线状态）。"));
    });

    if (!existing) {
      script.src = TESSERACT_CDN;
      script.async = true;
      script.dataset.ocrEngine = "tesseract";
      document.head.appendChild(script);
    } else if (window.Tesseract) {
      finish();
    }
  }).catch((error) => {
    tesseractPromise = null;
    throw error;
  });

  return tesseractPromise;
}

interface PreprocessedImage {
  canvas: HTMLCanvasElement;
  previewUrl: string;
}

/**
 * 图片预处理：等比缩放到合适分辨率 → 灰度 → 对比度拉伸 →（可选）轻度二值化。
 * 这一步显著提升试卷截图 / 拍照的识别率。
 */
async function preprocessImage(file: File, binarize: boolean): Promise<PreprocessedImage> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new OcrUnavailableError("无法读取这张图片，请换一张试试。");
  });

  const scale = Math.min(MAX_WIDTH / bitmap.width || 1, 1) || 1;
  const targetWidth = Math.max(MIN_WIDTH, Math.round(bitmap.width * (scale < 1 ? scale : 1)));
  const ratio = targetWidth / bitmap.width;
  const targetHeight = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new OcrUnavailableError("当前浏览器不支持图片预处理。");
  }

  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const image = context.getImageData(0, 0, targetWidth, targetHeight);
  const data = image.data;

  // 第一遍：灰度 + 统计最小/最大亮度，用于对比度拉伸。
  let min = 255;
  let max = 0;
  const grey = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, g = 0; i < data.length; i += 4, g += 1) {
    const value = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    grey[g] = value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const span = Math.max(1, max - min);
  // 二值化阈值：在拉伸后的区间里取偏亮处，保留笔画。
  const threshold = binarize ? 0.62 : -1;

  for (let i = 0, g = 0; i < data.length; i += 4, g += 1) {
    const stretched = ((grey[g] - min) / span) * 255;
    let out = stretched;
    if (threshold >= 0) {
      out = stretched / 255 >= threshold ? 255 : Math.min(stretched, 70);
    }
    data[i] = out;
    data[i + 1] = out;
    data[i + 2] = out;
  }

  context.putImageData(image, 0, 0);
  const previewUrl = canvas.toDataURL("image/png");
  return { canvas, previewUrl };
}

function mapLoggerToProgress(message: TesseractLogMessage, onProgress: RecognizeOptions["onProgress"]) {
  const status = message.status ?? "";
  const progress = typeof message.progress === "number" ? message.progress : 0;

  if (status.includes("loading") || status.includes("initiali")) {
    emit(onProgress, "loading-engine", 0.15 + progress * 0.2);
  } else if (status.includes("recognizing")) {
    emit(onProgress, "recognizing", 0.45 + progress * 0.5);
  }
}

/** 主入口：识别一张图片，返回结构化文本结果。 */
export async function recognizeImageText(file: File, options: RecognizeOptions = {}): Promise<OcrTextResult> {
  const { onProgress, binarize = true } = options;

  emit(onProgress, "preprocessing", 0.05);
  const { canvas, previewUrl } = await preprocessImage(file, binarize);

  emit(onProgress, "loading-engine", 0.15);
  const tesseract = await loadTesseract();

  emit(onProgress, "recognizing", 0.45);
  const result = await tesseract
    .recognize(canvas, "eng", { logger: (message) => mapLoggerToProgress(message, onProgress) })
    .catch((error: unknown) => {
      throw new OcrUnavailableError(error instanceof Error ? error.message : "识别引擎运行失败。");
    });

  const text = (result.data.text ?? "").trim();
  const lines = (result.data.lines ?? [])
    .map((line) => (line.text ?? "").trim())
    .filter((line) => line.length > 0);

  emit(onProgress, "matching", 0.95);

  return {
    text,
    confidence: Math.round(result.data.confidence ?? 0),
    lines,
    engine: "tesseract.js",
    processedPreview: previewUrl,
  };
}

/** 供界面判断 OCR 是否（很可能）可用。 */
export function isOcrLikelyAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof HTMLCanvasElement !== "undefined"
  );
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
