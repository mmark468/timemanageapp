import {
  BookOpenCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Hash,
  Layers,
  Lightbulb,
  Loader2,
  RotateCw,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createImageFingerprint } from "../features/questionSearch/imageFingerprint";
import {
  math9709PaperDatabase,
  type Math9709PaperResource,
  type Math9709SeriesCode,
} from "../features/questionSearch/math9709PaperDatabase";
import { OcrUnavailableError } from "../features/questionSearch/ocrEngine";
import {
  hasQuestionSearchInput,
  searchCieMathQuestions,
} from "../features/questionSearch/questionSearchEngine";
import { locateQuestionFromImage } from "../features/questionSearch/questionLocator";
import type {
  CieMathComponentGroup,
  ImageFingerprint,
  LocatedQuestion,
  OcrProgress,
  QuestionOcrOutcome,
  QuestionSearchResult,
} from "../features/questionSearch/types";
import type { Mistake, Subject } from "../types";

interface QuestionSearchPageProps {
  subjects: Subject[];
  mistakes: Mistake[];
}

interface UploadedImageState {
  file: File;
  fileName: string;
  previewUrl: string;
  fingerprint?: ImageFingerprint;
}

interface PaperSubjectOption {
  id: string;
  name: string;
  board: string;
  code: string;
  available: boolean;
}

interface PaperMistakeScore {
  earned: string;
  total: string;
}

interface PaperMistakeRecord {
  paperId: string;
  paperCode: string;
  paperLabel: string;
  paperType: string;
  questions: string[];
  score?: PaperMistakeScore;
  updatedAt: string;
}

const mathSubjectFallback: PaperSubjectOption = {
  id: "caie-9709-math",
  name: "数学",
  board: "CAIE",
  code: "9709",
  available: true,
};

const seriesOrder: Record<Math9709SeriesCode, number> = { m: 1, s: 2, w: 3 };
const paperStudyStatusStorageKey = "finished.math9709PaperStudyStatus";
const paperMistakeRecordStorageKey = "finished.math9709PaperMistakeRecords";
const paperStudyStatusValues = ["unstarted", "attempted", "studying", "mastered"] as const;
type PaperStudyStatus = (typeof paperStudyStatusValues)[number];

const paperStudyStatusMeta: Record<
  PaperStudyStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    className: string;
    buttonClassName: string;
    bookmarkClassName: string;
  }
> = {
  unstarted: {
    label: "没做过",
    shortLabel: "未做",
    description: "还没有开始",
    className: "bg-cream text-muted",
    buttonClassName: "bg-cream text-ink",
    bookmarkClassName: "bg-white",
  },
  attempted: {
    label: "做过一遍",
    shortLabel: "一遍",
    description: "已经完整写过",
    className: "bg-[#EAF3FF] text-[#1D4ED8]",
    buttonClassName: "bg-[#EAF3FF] text-[#1D4ED8]",
    bookmarkClassName: "bg-[#8FB8E8]",
  },
  studying: {
    label: "正在学习",
    shortLabel: "学习中",
    description: "已写完，解析还没完全理解",
    className: "bg-[#FFF2CC] text-[#92400E]",
    buttonClassName: "bg-[#FFF2CC] text-[#92400E]",
    bookmarkClassName: "bg-[#E7B85A]",
  },
  mastered: {
    label: "完整理解",
    shortLabel: "已理解",
    description: "解析看完并能复盘",
    className: "bg-[#E8F0E6] text-[#166534]",
    buttonClassName: "bg-[#E8F0E6] text-[#166534]",
    bookmarkClassName: "bg-[#8EB483]",
  },
};

function buildPaperSubjects(subjects: Subject[]): PaperSubjectOption[] {
  const options = subjects.map<PaperSubjectOption>((subject) => {
    const isMath9709 = subject.code === "9709" || /数学|math/i.test(subject.name);

    return {
      id: subject.id,
      name: subject.name,
      board: subject.board,
      code: subject.code,
      available: isMath9709,
    };
  });

  if (!options.some((subject) => subject.available)) {
    return [mathSubjectFallback, ...options];
  }

  return options.sort((left, right) => Number(right.available) - Number(left.available));
}

function getYears(papers: Math9709PaperResource[]) {
  return Array.from(new Set(papers.map((paper) => paper.year))).sort((left, right) => right - left);
}

function getSeriesForYear(papers: Math9709PaperResource[], year: number | null) {
  if (!year) return [];
  return Array.from(new Set(papers.filter((paper) => paper.year === year).map((paper) => paper.seriesCode))).sort(
    (left, right) => seriesOrder[left] - seriesOrder[right],
  );
}

function getPapersForSession(papers: Math9709PaperResource[], year: number | null, seriesCode: Math9709SeriesCode | "") {
  if (!year || !seriesCode) return [];
  return papers
    .filter((paper) => paper.year === year && paper.seriesCode === seriesCode)
    .sort((left, right) => Number(left.componentCode) - Number(right.componentCode));
}

function getSeriesLabel(seriesCode: Math9709SeriesCode) {
  if (seriesCode === "m") return "2-3月";
  if (seriesCode === "s") return "5-6月";
  return "10-11月";
}

function getSeriesShortCode(seriesCode: Math9709SeriesCode) {
  if (seriesCode === "m") return "F/M";
  if (seriesCode === "s") return "M/J";
  return "O/N";
}

function getPaperTypeLabel(group: Math9709PaperResource["componentGroup"]) {
  if (group === "mechanics") return "Mechanics";
  if (group === "statistics") return "Statistics";
  return "Pure Math";
}

function formatPaperCode(paper: Math9709PaperResource) {
  return `${paper.syllabusCode}/${paper.componentCode}/${getSeriesShortCode(paper.seriesCode)}/${String(paper.year).slice(-2)}`;
}

function isPaperStudyStatus(value: unknown): value is PaperStudyStatus {
  return typeof value === "string" && paperStudyStatusValues.includes(value as PaperStudyStatus);
}

function readPaperStudyStatuses(): Record<string, PaperStudyStatus> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(paperStudyStatusStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, PaperStudyStatus] => isPaperStudyStatus(entry[1])),
    );
  } catch {
    return {};
  }
}

function readPaperMistakeRecords(): Record<string, PaperMistakeRecord> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(paperMistakeRecordStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<PaperMistakeRecord>>;

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, Partial<PaperMistakeRecord> & { questions: string[] }] =>
          Array.isArray(entry[1]?.questions),
        )
        .map(([paperId, record]) => [
          paperId,
          {
            paperId: record.paperId ?? paperId,
            paperCode: record.paperCode ?? "",
            paperLabel: record.paperLabel ?? "",
            paperType: record.paperType ?? "",
            questions: Array.from(new Set(record.questions.map((question) => String(question).trim()).filter(Boolean))),
            score:
              record.score && (record.score.earned || record.score.total)
                ? { earned: String(record.score.earned ?? ""), total: String(record.score.total ?? "") }
                : undefined,
            updatedAt: record.updatedAt ?? new Date().toISOString(),
          },
        ]),
    );
  } catch {
    return {};
  }
}

function getPaperStudyStatus(statuses: Record<string, PaperStudyStatus>, paperId: string): PaperStudyStatus {
  return statuses[paperId] ?? "unstarted";
}

function buildPaperStudyStats(papers: Math9709PaperResource[], statuses: Record<string, PaperStudyStatus>) {
  return paperStudyStatusValues.map((status) => ({
    status,
    count: papers.filter((paper) => getPaperStudyStatus(statuses, paper.id) === status).length,
  }));
}

function parseWrongQuestionInput(input: string) {
  return Array.from(new Set(input.split(/[\s,，、;；]+/).map((item) => item.trim()).filter(Boolean)));
}

function getMistakeCount(record?: PaperMistakeRecord) {
  return record?.questions.length ?? 0;
}

function formatPaperMistakeScore(score?: PaperMistakeScore) {
  if (!score) return "";
  if (score.earned && score.total) return `${score.earned}/${score.total}`;
  return score.earned || score.total;
}

function formatRecordUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "刚刚";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

export function QuestionSearchPage({ subjects }: QuestionSearchPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [componentGroup, setComponentGroup] = useState<CieMathComponentGroup>("all");
  const paperSubjects = useMemo(() => buildPaperSubjects(subjects), [subjects]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(mathSubjectFallback.id);
  const selectedSubject = paperSubjects.find((subject) => subject.id === selectedSubjectId) ?? paperSubjects[0] ?? mathSubjectFallback;
  const paperArchive = selectedSubject.available ? math9709PaperDatabase : [];
  const years = useMemo(() => getYears(paperArchive), [paperArchive]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const seriesOptions = useMemo(() => getSeriesForYear(paperArchive, selectedYear), [paperArchive, selectedYear]);
  const [selectedSeries, setSelectedSeries] = useState<Math9709SeriesCode | "">("");
  const paperOptions = useMemo(
    () => getPapersForSession(paperArchive, selectedYear, selectedSeries),
    [paperArchive, selectedSeries, selectedYear],
  );
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const selectedPaper = paperOptions.find((paper) => paper.id === selectedPaperId) ?? paperOptions[0];
  const [uploadedImage, setUploadedImage] = useState<UploadedImageState | null>(null);
  const [imageError, setImageError] = useState("");
  const [ocrOutcome, setOcrOutcome] = useState<QuestionOcrOutcome | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [binarize, setBinarize] = useState(true);
  const [paperStudyStatuses, setPaperStudyStatuses] = useState<Record<string, PaperStudyStatus>>(readPaperStudyStatuses);
  const [paperMistakeRecords, setPaperMistakeRecords] = useState<Record<string, PaperMistakeRecord>>(readPaperMistakeRecords);

  const ocrText = ocrOutcome?.ocr.text ?? "";
  const effectiveQuery = ocrText;
  const hasInput = hasQuestionSearchInput({
    query: effectiveQuery,
    fileName: uploadedImage?.fileName,
    fingerprint: uploadedImage?.fingerprint,
  });
  const results = useMemo(
    () =>
      searchCieMathQuestions({
        query: effectiveQuery,
        fileName: uploadedImage?.fileName,
        fingerprint: uploadedImage?.fingerprint,
        componentGroup,
      }),
    [componentGroup, effectiveQuery, uploadedImage?.fileName, uploadedImage?.fingerprint],
  );

  const isScanning = Boolean(ocrProgress && ocrProgress.stage !== "done" && ocrProgress.stage !== "error");
  const headlineResult = ocrOutcome?.located;
  const selectedPaperStudyStatus = selectedPaper ? getPaperStudyStatus(paperStudyStatuses, selectedPaper.id) : "unstarted";
  const selectedPaperMistakeRecord = selectedPaper ? paperMistakeRecords[selectedPaper.id] : undefined;
  const paperStudyStats = useMemo(() => buildPaperStudyStats(paperArchive, paperStudyStatuses), [paperArchive, paperStudyStatuses]);

  useEffect(() => {
    if (!paperSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(paperSubjects[0]?.id ?? mathSubjectFallback.id);
    }
  }, [paperSubjects, selectedSubjectId]);

  useEffect(() => {
    if (years.length === 0) {
      setSelectedYear(null);
      return;
    }
    if (!selectedYear || !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [selectedYear, years]);

  useEffect(() => {
    if (seriesOptions.length === 0) {
      setSelectedSeries("");
      return;
    }
    if (!selectedSeries || !seriesOptions.includes(selectedSeries)) {
      setSelectedSeries(seriesOptions[0]);
    }
  }, [selectedSeries, seriesOptions]);

  useEffect(() => {
    if (paperOptions.length === 0) {
      setSelectedPaperId("");
      return;
    }
    if (!selectedPaperId || !paperOptions.some((paper) => paper.id === selectedPaperId)) {
      setSelectedPaperId(paperOptions[0].id);
    }
  }, [paperOptions, selectedPaperId]);

  useEffect(() => {
    if (selectedPaper && componentGroup !== selectedPaper.componentGroup) {
      setComponentGroup(selectedPaper.componentGroup);
    }
  }, [componentGroup, selectedPaper]);

  useEffect(() => {
    return () => {
      if (uploadedImage?.previewUrl) URL.revokeObjectURL(uploadedImage.previewUrl);
    };
  }, [uploadedImage?.previewUrl]);

  useEffect(() => {
    window.localStorage.setItem(paperStudyStatusStorageKey, JSON.stringify(paperStudyStatuses));
  }, [paperStudyStatuses]);

  useEffect(() => {
    window.localStorage.setItem(paperMistakeRecordStorageKey, JSON.stringify(paperMistakeRecords));
  }, [paperMistakeRecords]);

  const runOcr = async (image: UploadedImageState, useBinarize: boolean) => {
    setImageError("");
    setOcrOutcome(null);
    setOcrProgress({ stage: "preprocessing", ratio: 0.05, label: "正在增强图片清晰度…" });

    try {
      const outcome = await locateQuestionFromImage(image.file, componentGroup, {
        binarize: useBinarize,
        onProgress: setOcrProgress,
      });
      setOcrOutcome(outcome);
      setOcrProgress({ stage: "done", ratio: 1, label: "识别完成" });
    } catch (error) {
      setOcrProgress({ stage: "error", ratio: 0, label: "识别未完成" });
      if (error instanceof OcrUnavailableError) {
        setImageError(`本地识别引擎暂不可用：${error.message} 已切换到文件名 + 图片指纹搜索。`);
      } else {
        setImageError("识别图片时出现问题，已切换到文件名 + 图片指纹搜索。");
      }
    }
  };

  const handlePhotoSelected = async (file?: File) => {
    if (!file) return;

    if (uploadedImage?.previewUrl) URL.revokeObjectURL(uploadedImage.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    const nextImage: UploadedImageState = { file, fileName: file.name, previewUrl };
    setUploadedImage(nextImage);

    // 图片指纹始终生成，作为 OCR 失败时的兜底匹配信号。
    createImageFingerprint(file)
      .then((fingerprint) => setUploadedImage((current) => (current?.file === file ? { ...current, fingerprint } : current)))
      .catch(() => undefined);

    await runOcr(nextImage, binarize);
  };

  const retryOcr = () => {
    if (uploadedImage) void runOcr(uploadedImage, binarize);
  };

  const toggleBinarize = () => {
    const next = !binarize;
    setBinarize(next);
    if (uploadedImage) void runOcr(uploadedImage, next);
  };

  const updateSelectedPaperStudyStatus = (status: PaperStudyStatus) => {
    if (!selectedPaper) return;
    setPaperStudyStatuses((current) => ({ ...current, [selectedPaper.id]: status }));
  };

  const saveSelectedPaperMistakeRecord = (record: { questions: string[]; score?: PaperMistakeScore }) => {
    if (!selectedPaper) return;

    setPaperMistakeRecords((current) => ({
      ...current,
      [selectedPaper.id]: {
        paperId: selectedPaper.id,
        paperCode: formatPaperCode(selectedPaper),
        paperLabel: selectedPaper.paperLabel,
        paperType: getPaperTypeLabel(selectedPaper.componentGroup),
        questions: record.questions,
        score: record.score,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const clearSelectedPaperMistakeRecord = () => {
    if (!selectedPaper) return;

    setPaperMistakeRecords((current) => {
      const next = { ...current };
      delete next[selectedPaper.id];
      return next;
    });
  };

  const hasResultContent = Boolean(isScanning || headlineResult || (ocrOutcome && !headlineResult && !isScanning) || hasInput);

  const uploadPanel = (
    <section className="flex min-h-0 flex-col rounded-[32px] bg-white p-4 shadow-soft lg:rounded-[28px] lg:p-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="grid min-h-56 w-full flex-1 place-items-center overflow-hidden rounded-[28px] border-2 border-dashed border-black/10 bg-cream p-4 text-center md:min-h-64 lg:min-h-[104px] lg:flex-none lg:rounded-[22px] lg:p-3"
      >
        {uploadedImage ? (
          <span className="grid h-full w-full gap-3 lg:grid-cols-[96px_minmax(0,1fr)] lg:items-center lg:text-left">
            <img
              src={uploadedImage.previewUrl}
              alt="Uploaded question"
              className="mx-auto h-44 w-full max-w-sm rounded-[22px] object-cover md:h-56 lg:h-20 lg:max-w-none lg:rounded-[18px]"
            />
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-ink">已选择题目图片</span>
              <span className="mt-1 block truncate text-xs font-bold text-muted">{uploadedImage.fileName}</span>
            </span>
          </span>
        ) : (
          <span className="grid justify-items-center lg:grid-cols-[46px_minmax(0,1fr)] lg:items-center lg:gap-3 lg:text-left">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-ink text-white lg:h-11 lg:w-11">
              <Camera size={24} className="lg:h-5 lg:w-5" />
            </span>
            <span className="min-w-0">
              <span className="mt-3 block text-lg font-black text-ink lg:mt-0 lg:text-base">拍照 / 上传 CIE 数学题目</span>
              <span className="mt-1 block text-xs font-bold text-muted">本地识别，图片不会上传服务器</span>
            </span>
          </span>
        )}
      </button>

      {uploadedImage ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 lg:mt-2">
          <button
            type="button"
            onClick={retryOcr}
            disabled={isScanning}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-black text-white disabled:opacity-50 lg:h-8"
          >
            <RotateCw size={13} />
            重新识别
          </button>
          <button
            type="button"
            onClick={toggleBinarize}
            disabled={isScanning}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black disabled:opacity-50 ${
              binarize ? "bg-ink text-white" : "bg-cream text-ink"
            } lg:h-8`}
          >
            二值化 {binarize ? "开" : "关"}
          </button>
          <span className="text-[11px] font-bold text-muted">识别不准时可切换二值化重试</span>
        </div>
      ) : null}
    </section>
  );

  return (
    <main
      className="question-search-page px-5 pb-28 pt-7 md:grid md:grid-cols-1 md:items-start md:gap-5 md:px-6 md:pb-8 md:pt-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:items-stretch lg:overflow-hidden lg:px-7 xl:grid-cols-[minmax(420px,0.96fr)_minmax(0,1.04fr)]"
    >
      <header className="mb-5 md:mb-0 lg:col-span-2">
        <p className="text-sm font-bold text-muted">CAIE Mathematics 9709 · 本地 OCR</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal text-ink">拍照搜题</h1>
      </header>

      <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:min-h-0">
        {uploadPanel}

        {imageError ? (
          <p className="mt-3 rounded-[20px] bg-white p-3 text-xs font-bold leading-5 text-[#B91C1C] shadow-soft">
            {imageError}
          </p>
        ) : null}
      </div>

      <div className="mt-4 min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-2 lg:mt-0 lg:h-full lg:min-h-0 lg:self-stretch lg:overflow-y-auto lg:pr-1">
        <PaperPicker
          className="lg:min-h-full"
          subjects={paperSubjects}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubjectId}
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          seriesOptions={seriesOptions}
          selectedSeries={selectedSeries}
          onSeriesChange={setSelectedSeries}
          papers={paperOptions}
          selectedPaper={selectedPaper}
          statusByPaperId={paperStudyStatuses}
          onPaperChange={setSelectedPaperId}
        />
      </div>

      <div className={`${hasResultContent ? "mt-5" : ""} min-w-0 lg:col-start-2 lg:row-start-3 lg:mt-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1`}>
        {hasResultContent ? (
          <>
          {isScanning && ocrProgress ? <OcrProgressCard progress={ocrProgress} /> : null}

          {headlineResult ? (
            <OcrResultCard
              result={headlineResult}
              outcome={ocrOutcome!}
              processedPreview={ocrOutcome?.ocr.processedPreview}
            />
          ) : null}

          {ocrOutcome && !headlineResult && !isScanning ? (
            <EmptyState
              title="识别到文字，但没匹配到本地题"
              detail="本地种子题库较小，可以换一张更清晰、保留页眉的截图。"
            />
          ) : null}

          {hasInput ? (
            <section className="mt-5 space-y-3 lg:mt-0">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} />
                  <h2 className="text-base font-black text-ink">{headlineResult ? "其他可能" : "相似题匹配"}</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted shadow-soft">{results.length} 条</span>
              </div>

              {results
                .filter((result) => result.question.id !== headlineResult?.question.id)
                .map((result) => (
                  <QuestionCard key={result.question.id} result={result} />
                ))}

              {results.length === 0 ? <EmptyState title="暂时没搜到" detail="保留页眉重新截图，或换一张更清晰的图片。" /> : null}
            </section>
          ) : null}
          </>
        ) : null}

        <PaperReviewPanel
          className={hasResultContent ? "mt-4 hidden lg:flex" : "hidden lg:flex lg:h-full"}
          papers={paperOptions}
          selectedPaper={selectedPaper}
          selectedStatus={selectedPaperStudyStatus}
          statusByPaperId={paperStudyStatuses}
          mistakeRecordByPaperId={paperMistakeRecords}
          selectedMistakeRecord={selectedPaperMistakeRecord}
          stats={paperStudyStats}
          onStatusChange={updateSelectedPaperStudyStatus}
          onMistakeRecordSave={saveSelectedPaperMistakeRecord}
          onMistakeRecordClear={clearSelectedPaperMistakeRecord}
        />
      </div>
    </main>
  );
}

function PaperPicker({
  className = "",
  subjects,
  selectedSubject,
  onSubjectChange,
  years,
  selectedYear,
  onYearChange,
  seriesOptions,
  selectedSeries,
  onSeriesChange,
  papers,
  selectedPaper,
  statusByPaperId,
  onPaperChange,
}: {
  className?: string;
  subjects: PaperSubjectOption[];
  selectedSubject: PaperSubjectOption;
  onSubjectChange: (subjectId: string) => void;
  years: number[];
  selectedYear: number | null;
  onYearChange: (year: number) => void;
  seriesOptions: Math9709SeriesCode[];
  selectedSeries: Math9709SeriesCode | "";
  onSeriesChange: (series: Math9709SeriesCode) => void;
  papers: Math9709PaperResource[];
  selectedPaper?: Math9709PaperResource;
  statusByPaperId: Record<string, PaperStudyStatus>;
  onPaperChange: (paperId: string) => void;
}) {
  return (
    <section className={`${className} rounded-[32px] bg-white p-4 shadow-soft`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">试卷定位</p>
          <h2 className="mt-1 text-lg font-black text-ink">按科目和卷号找答案</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink">
          <BookOpenCheck size={18} />
        </span>
      </div>

      <PickerStep index="1" label="科目" />
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {subjects.map((subject) => {
          const active = selectedSubject.id === subject.id;

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSubjectChange(subject.id)}
              className={`min-w-[128px] rounded-[20px] border p-3 text-left transition ${
                active ? "border-ink bg-ink text-white shadow-pill" : "border-black/5 bg-cream text-ink"
              }`}
            >
              <span className="block truncate text-sm font-black">{subject.name}</span>
              <span className={`mt-1 block text-[11px] font-black ${active ? "text-white/70" : "text-muted"}`}>
                {subject.board} {subject.code}
              </span>
              <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-black ${active ? "bg-white/15" : "bg-white"}`}>
                {subject.available ? "可选卷号" : "待整理"}
              </span>
            </button>
          );
        })}
      </div>

      {selectedSubject.available ? (
        <>
          <PickerStep index="2" label="年份" className="mt-4" />
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => onYearChange(year)}
                className={`h-10 min-w-20 rounded-full px-4 text-sm font-black transition ${
                  selectedYear === year ? "bg-ink text-white shadow-pill" : "bg-cream text-ink"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          <PickerStep index="3" label="月份" className="mt-4" />
          <div className="mt-2 grid grid-cols-3 gap-2">
            {seriesOptions.map((series) => (
              <button
                key={series}
                type="button"
                onClick={() => onSeriesChange(series)}
                className={`h-11 rounded-full text-sm font-black transition ${
                  selectedSeries === series ? "bg-ink text-white shadow-pill" : "bg-cream text-ink"
                }`}
              >
                {getSeriesLabel(series)}
              </button>
            ))}
          </div>

          <PickerStep index="4" label="卷号" className="mt-4" />
          <div className="mt-2 grid gap-2">
            {papers.map((paper) => {
              const active = selectedPaper?.id === paper.id;
              const status = getPaperStudyStatus(statusByPaperId, paper.id);
              const statusMeta = paperStudyStatusMeta[status];

              return (
                <article
                  key={paper.id}
                  className={`relative overflow-hidden rounded-[20px] transition ${
                    active ? "bg-ink text-white shadow-pill" : "bg-cream text-ink"
                  }`}
                  title={`${formatPaperCode(paper)} · ${statusMeta.label}`}
                >
                  <span
                    className={`absolute inset-y-2 left-2 w-1 rounded-full ${statusMeta.bookmarkClassName} ${
                      active ? "shadow-[0_0_0_1px_rgba(255,255,255,0.18)]" : "shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                    }`}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => onPaperChange(paper.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 pl-5 pr-3 text-left"
                    aria-label={`${formatPaperCode(paper)}，${paper.paperLabel}，${getPaperTypeLabel(paper.componentGroup)}，${statusMeta.label}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black">{formatPaperCode(paper)}</span>
                      <span className={`mt-1 block truncate text-[11px] font-bold ${active ? "text-white/68" : "text-muted"}`}>
                        {paper.paperLabel}
                      </span>
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${active ? "bg-white/15 text-white" : "bg-white text-ink"}`}>
                      {getPaperTypeLabel(paper.componentGroup)}
                    </span>
                  </button>

                  {active ? (
                    <div className="grid grid-cols-2 gap-2 pb-3 pl-5 pr-3">
                      {paper.questionPaper ? (
                        <PaperLink compact icon={<FileText size={14} />} label="试卷" url={paper.questionPaper.url} />
                      ) : null}
                      {paper.markScheme ? (
                        <PaperLink compact icon={<BookOpenCheck size={14} />} label="答案" url={paper.markScheme.url} />
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-[22px] bg-cream p-4 text-sm font-bold leading-6 text-muted">
          这个科目的年份、月份和卷号索引还在整理中。当前已恢复 CAIE Mathematics 9709 的试卷选择。
        </div>
      )}
    </section>
  );
}

function PaperReviewPanel({
  className = "",
  papers,
  selectedPaper,
  selectedStatus,
  statusByPaperId,
  mistakeRecordByPaperId,
  selectedMistakeRecord,
  stats,
  onStatusChange,
  onMistakeRecordSave,
  onMistakeRecordClear,
}: {
  className?: string;
  papers: Math9709PaperResource[];
  selectedPaper?: Math9709PaperResource;
  selectedStatus: PaperStudyStatus;
  statusByPaperId: Record<string, PaperStudyStatus>;
  mistakeRecordByPaperId: Record<string, PaperMistakeRecord>;
  selectedMistakeRecord?: PaperMistakeRecord;
  stats: Array<{ status: PaperStudyStatus; count: number }>;
  onStatusChange: (status: PaperStudyStatus) => void;
  onMistakeRecordSave: (record: { questions: string[]; score?: PaperMistakeScore }) => void;
  onMistakeRecordClear: () => void;
}) {
  const total = stats.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className={`${className} min-h-0 flex-col rounded-[32px] bg-white p-4 shadow-soft`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">试卷归纳</p>
          <h2 className="mt-1 text-lg font-black text-ink">做题状态整理</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink">
          <Layers size={18} />
        </span>
      </div>

      {selectedPaper ? (
        <div className="rounded-[24px] bg-cream p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-black text-ink">{formatPaperCode(selectedPaper)}</p>
              <p className="mt-1 truncate text-xs font-bold text-muted">{selectedPaper.paperLabel}</p>
            </div>
            <StatusBadge status={selectedStatus} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {paperStudyStatusValues.map((status) => {
              const meta = paperStudyStatusMeta[status];
              const active = selectedStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(status)}
                  className={`min-h-16 rounded-[20px] p-2.5 text-left transition ${
                    active ? "bg-ink text-white shadow-pill" : meta.buttonClassName
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {status === "studying" ? <StudyingStackMark active={active} /> : <StatusDot active={active} />}
                    <span className="text-xs font-black">{meta.label}</span>
                  </span>
                  <span className={`mt-1 block text-[10px] font-bold leading-4 ${active ? "text-white/70" : "text-muted"}`}>
                    {meta.description}
                  </span>
                </button>
              );
            })}
          </div>

          <PaperMistakeRecorder
            record={selectedMistakeRecord}
            onSave={onMistakeRecordSave}
            onClear={onMistakeRecordClear}
          />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.map((item) => {
          const meta = paperStudyStatusMeta[item.status];
          const ratio = total > 0 ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.status} className={`rounded-[20px] p-2.5 ${meta.className}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black">{meta.shortLabel}</span>
                {item.status === "studying" ? <StudyingStackMark small /> : null}
              </div>
              <p className="mt-1 text-xl font-black leading-none">{item.count}</p>
              <p className="mt-1 text-[10px] font-black opacity-70">{ratio}%</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-[24px] bg-cream p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-black text-muted">当前月份卷子</p>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-muted">{papers.length} 份</span>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {papers.map((paper) => {
            const status = getPaperStudyStatus(statusByPaperId, paper.id);
            const mistakeRecord = mistakeRecordByPaperId[paper.id];
            const mistakeCount = getMistakeCount(mistakeRecord);

            return (
              <div
                key={paper.id}
                className={`relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] bg-white p-2.5 ${
                  status === "studying" ? "ring-2 ring-[#F59E0B]/35" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink">{formatPaperCode(paper)}</p>
                  <p className="mt-0.5 truncate text-[10px] font-bold text-muted">{getPaperTypeLabel(paper.componentGroup)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {mistakeCount > 0 ? (
                    <span className="rounded-full bg-[#FEE2E2] px-2 py-1 text-[10px] font-black text-[#991B1B]">
                      错 {mistakeCount}
                    </span>
                  ) : null}
                  <StatusBadge status={status} compact />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PaperMistakeRecorder({
  record,
  onSave,
  onClear,
}: {
  record?: PaperMistakeRecord;
  onSave: (record: { questions: string[]; score?: PaperMistakeScore }) => void;
  onClear: () => void;
}) {
  const [questionInput, setQuestionInput] = useState("");
  const [scoreEnabled, setScoreEnabled] = useState(false);
  const [earnedScore, setEarnedScore] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const parsedQuestions = useMemo(() => parseWrongQuestionInput(questionInput), [questionInput]);
  const scoreText = formatPaperMistakeScore(record?.score);
  const canSave = parsedQuestions.length > 0;

  useEffect(() => {
    setQuestionInput(record?.questions.join(", ") ?? "");
    setScoreEnabled(Boolean(record?.score));
    setEarnedScore(record?.score?.earned ?? "");
    setTotalScore(record?.score?.total ?? "");
  }, [record]);

  const handleSave = () => {
    if (!canSave) return;

    const earned = earnedScore.trim();
    const total = totalScore.trim();
    onSave({
      questions: parsedQuestions,
      score: scoreEnabled && (earned || total) ? { earned, total } : undefined,
    });
  };

  return (
    <div className="mt-3 rounded-[22px] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-black text-ink">
            <Hash size={14} />
            错题记录
          </p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-muted">
            输入错题题号，系统会自动整理成标签。
          </p>
        </div>
        {record ? (
          <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-[10px] font-black text-muted">
            {formatRecordUpdatedAt(record.updatedAt)}
          </span>
        ) : null}
      </div>

      <label className="mt-3 block">
        <span className="text-[11px] font-black text-muted">错题题号</span>
        <input
          value={questionInput}
          onChange={(event) => setQuestionInput(event.target.value)}
          placeholder="例如 1, 2b, 5-7"
          className="mt-1 h-10 w-full rounded-[18px] bg-cream px-3 text-sm font-black text-ink outline-none placeholder:text-muted/60"
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {parsedQuestions.length > 0 ? (
          parsedQuestions.slice(0, 8).map((question) => (
            <span key={question} className="rounded-full bg-[#FEE2E2] px-2 py-1 text-[10px] font-black text-[#991B1B]">
              Q{question}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-cream px-2 py-1 text-[10px] font-black text-muted">还没有输入错题</span>
        )}
        {parsedQuestions.length > 8 ? (
          <span className="rounded-full bg-cream px-2 py-1 text-[10px] font-black text-muted">
            +{parsedQuestions.length - 8}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setScoreEnabled((current) => !current)}
        className={`mt-3 flex h-10 w-full items-center justify-between rounded-[18px] px-3 text-left text-xs font-black transition ${
          scoreEnabled ? "bg-ink text-white" : "bg-cream text-ink"
        }`}
        aria-pressed={scoreEnabled}
      >
        <span>记录分数</span>
        <span className={`h-5 w-9 rounded-full p-0.5 transition ${scoreEnabled ? "bg-white/25" : "bg-white"}`}>
          <span
            className={`block h-4 w-4 rounded-full transition ${scoreEnabled ? "translate-x-4 bg-white" : "translate-x-0 bg-ink"}`}
          />
        </span>
      </button>

      {scoreEnabled ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-black text-muted">得分</span>
            <input
              value={earnedScore}
              onChange={(event) => setEarnedScore(event.target.value)}
              inputMode="decimal"
              placeholder="68"
              className="mt-1 h-10 w-full rounded-[18px] bg-cream px-3 text-sm font-black text-ink outline-none placeholder:text-muted/60"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-black text-muted">满分</span>
            <input
              value={totalScore}
              onChange={(event) => setTotalScore(event.target.value)}
              inputMode="decimal"
              placeholder="75"
              className="mt-1 h-10 w-full rounded-[18px] bg-cream px-3 text-sm font-black text-ink outline-none placeholder:text-muted/60"
            />
          </label>
        </div>
      ) : null}

      {record ? (
        <p className="mt-2 text-[11px] font-bold leading-4 text-muted">
          已记录 {record.questions.length} 题{scoreText ? ` · 分数 ${scoreText}` : ""}
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="h-10 rounded-full bg-ink px-4 text-sm font-black text-white shadow-pill transition disabled:bg-muted/30 disabled:text-white disabled:shadow-none"
        >
          保存错题
        </button>
        {record ? (
          <button
            type="button"
            onClick={onClear}
            className="h-10 rounded-full bg-cream px-4 text-xs font-black text-ink"
          >
            清除
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: PaperStudyStatus; compact?: boolean }) {
  const meta = paperStudyStatusMeta[status];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${meta.className}`}>
      {status === "studying" ? <StudyingStackMark small /> : null}
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}

function StatusDot({ active = false }: { active?: boolean }) {
  return <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-white" : "bg-current"}`} />;
}

function StudyingStackMark({ active = false, small = false }: { active?: boolean; small?: boolean }) {
  const sizeClass = small ? "h-4 w-4" : "h-5 w-5";
  const dotClass = small ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  return (
    <span className={`relative inline-block shrink-0 ${sizeClass}`} aria-hidden="true">
      <span className={`absolute left-0 top-0 rounded-full ${dotClass} ${active ? "bg-white/45" : "bg-[#FCD34D]"}`} />
      <span className={`absolute bottom-0 right-0 rounded-full ${dotClass} ${active ? "bg-white" : "bg-[#F59E0B]"}`} />
    </span>
  );
}

function PickerStep({ index, label, className = "" }: { index: string; label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-black text-white">{index}</span>
      <span className="text-sm font-black text-ink">{label}</span>
    </div>
  );
}

function OcrProgressCard({ progress }: { progress: OcrProgress }) {
  return (
    <section className="mt-4 rounded-[28px] bg-[#EEF2F7] p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <Loader2 size={17} className="animate-spin text-ink" />
        <h2 className="text-base font-black text-ink">{progress.label}</h2>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <span
          className="block h-full rounded-full bg-ink transition-all duration-300"
          style={{ width: `${Math.round(progress.ratio * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] font-bold text-muted">图片仅在本地处理，不会离开此设备</p>
    </section>
  );
}

function OcrResultCard({
  result,
  outcome,
  processedPreview,
}: {
  result: LocatedQuestion;
  outcome: QuestionOcrOutcome;
  processedPreview?: string;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const { question } = result;

  return (
    <section className="ocr-result-card mt-4 rounded-[32px] bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <h2 className="text-base font-black text-ink">识别结果</h2>
            <p className="text-[11px] font-bold text-muted">{outcome.ocr.engine} · 本地识别</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-black text-white">匹配度 {result.confidence}%</span>
      </div>

      <div className="grid gap-3">
        <ResultField icon={<Hash size={15} />} label="卷号">
          <p className="text-lg font-black leading-6 text-ink">{result.paperNumber}</p>
          <p className="mt-1 inline-block rounded-full bg-cream px-2.5 py-1 text-xs font-black text-ink">{result.paperCode}</p>
        </ResultField>

        <ResultField icon={<FileText size={15} />} label="题目">
          <p className="text-sm font-black leading-6 text-ink">
            Q{question.questionNumber} · {question.title}
          </p>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{question.questionSummary}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-cream px-2 py-1 text-[11px] font-black text-muted">{question.topic}</span>
            <span className="rounded-full bg-cream px-2 py-1 text-[11px] font-black text-muted">{question.paperLabel}</span>
          </div>
        </ResultField>

        <ResultField icon={<Lightbulb size={15} />} label="答案" highlight>
          <p className="text-sm font-black leading-6 text-ink">{question.answer}</p>
          <div className="mt-2 rounded-[18px] bg-white/70 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black text-muted">
              <BookOpenCheck size={13} />
              Mark scheme
            </div>
            <p className="text-xs font-bold leading-5 text-ink">{question.markSchemeSummary}</p>
          </div>
        </ResultField>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PaperLink icon={<FileText size={14} />} label="题目 PDF" url={question.questionPdf.url} />
        <PaperLink icon={<BookOpenCheck size={14} />} label="Mark scheme" url={question.markSchemePdf.url} />
      </div>

      {result.matchReasons.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.matchReasons.map((reason) => (
            <span key={reason} className="rounded-full bg-cream px-2 py-1 text-[11px] font-black text-muted">
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowRaw((value) => !value)}
        className="mt-3 flex w-full items-center justify-between rounded-[18px] bg-cream px-3 py-2 text-xs font-black text-ink"
      >
        <span className="flex items-center gap-1.5">
          <ScanSearch size={14} />
          OCR 原始文本（置信度 {outcome.ocr.confidence}%）
        </span>
        <ChevronDown size={15} className={`transition-transform ${showRaw ? "rotate-180" : ""}`} />
      </button>
      {showRaw ? (
        <div className="mt-2 grid gap-2">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-[18px] bg-cream p-3 text-[11px] font-bold leading-5 text-muted">
            {outcome.ocr.text || "（未识别到文字）"}
          </pre>
          {processedPreview ? (
            <div>
              <p className="mb-1 px-1 text-[11px] font-black text-muted">预处理后图像</p>
              <img src={processedPreview} alt="Processed" className="w-full rounded-[18px] border border-black/5" />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ResultField({
  icon,
  label,
  highlight,
  children,
}: {
  icon: ReactNode;
  label: string;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[22px] p-3 ${highlight ? "bg-[#E8F0E6]" : "bg-cream"}`}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-muted">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function QuestionCard({ result }: { result: QuestionSearchResult }) {
  const { question } = result;

  return (
    <article className="rounded-[28px] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-muted">
            {question.board} · {question.syllabusCode}/{question.componentCode} · {question.series} {question.year}
          </p>
          <h3 className="mt-2 text-base font-black leading-6 text-ink">
            Q{question.questionNumber} · {question.title}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-black text-white">{result.score}%</span>
      </div>

      <div className="grid gap-3">
        <div className="rounded-[22px] bg-cream p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black text-muted">
            <Lightbulb size={14} />
            答案
          </div>
          <p className="text-sm font-bold leading-6 text-ink">{question.answer}</p>
        </div>

        <div className="rounded-[22px] bg-cream p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black text-muted">
            <BookOpenCheck size={14} />
            Mark scheme
          </div>
          <p className="text-sm font-bold leading-6 text-ink">{question.markSchemeSummary}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PaperLink icon={<FileText size={14} />} label="题目 PDF" url={question.questionPdf.url} />
        <PaperLink icon={<BookOpenCheck size={14} />} label="Mark scheme" url={question.markSchemePdf.url} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-muted">
        <span className="rounded-full bg-cream px-2 py-1">{question.topic}</span>
        <span className="rounded-full bg-cream px-2 py-1">{question.paperLabel}</span>
        {result.matchReasons.map((reason) => (
          <span key={reason} className="rounded-full bg-cream px-2 py-1">
            {reason}
          </span>
        ))}
      </div>
    </article>
  );
}

function PaperLink({ compact = false, icon, label, url }: { compact?: boolean; icon: ReactNode; label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-3 text-xs font-black text-white ${
        compact ? "bg-white/15 hover:bg-white/22" : "bg-ink"
      }`}
    >
      {icon}
      {label}
      <ExternalLink size={13} />
    </a>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-4 rounded-[28px] bg-white p-6 text-center shadow-soft">
      <p className="text-base font-black text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}
