import {
  AlertCircle,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileText,
  Hash,
  HardDrive,
  Layers3,
  Lightbulb,
  Loader2,
  NotebookTabs,
  RotateCw,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Chip } from "../components/Chip";
import { createImageFingerprint } from "../features/questionSearch/imageFingerprint";
import { OcrUnavailableError, isOcrLikelyAvailable } from "../features/questionSearch/ocrEngine";
import {
  buildQuestionSearchSignal,
  getCieMathDatabaseStats,
  hasQuestionSearchInput,
  searchCieMathQuestions,
} from "../features/questionSearch/questionSearchEngine";
import { locateQuestionFromImage } from "../features/questionSearch/questionLocator";
import {
  buildQuestionArchiveSubjects,
  downloadQuestionArchive,
  getDownloadedQuestionArchiveSource,
  getQuestionArchiveSource,
  readQuestionArchiveMetas,
  type LocalQuestionArchiveMeta,
  type LocalQuestionArchiveMetaMap,
  type QuestionArchiveSubject,
} from "../features/questionSearch/questionArchiveGateway";
import type {
  CieMathQuestion,
  CiePaperLink,
  CieMathComponentGroup,
  ImageFingerprint,
  LocatedQuestion,
  OcrProgress,
  ParsedPaperReference,
  QuestionOcrOutcome,
  QuestionSearchResult,
} from "../features/questionSearch/types";
import type { Mistake, Subject } from "../types";
import { readStorage, writeStorage } from "../utils/storage";

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

interface MathPaperArchiveItem {
  id: string;
  paperCode: string;
  paperLabel: string;
  componentCode: string;
  series: CieMathQuestion["series"];
  year: number;
  questionCount: number;
  topics: string[];
  questionPdf: CiePaperLink;
  markSchemePdf: CiePaperLink;
}

const recentKey = "finished.questionSearch.recent";

type SearchMode = "photo" | "mistakes";
type ArchiveDownloadStatus = "idle" | "downloading" | "done" | "error";

const componentFilters: Array<{ id: CieMathComponentGroup; label: string; description: string }> = [
  { id: "all", label: "全部", description: "所有 9709 数学组件" },
  { id: "pure", label: "Pure", description: "P1 / P2 / P3" },
  { id: "mechanics", label: "Mechanics", description: "Paper 4" },
  { id: "statistics", label: "Statistics", description: "Paper 5 / Paper 6" },
];

export function QuestionSearchPage({ subjects, mistakes }: QuestionSearchPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<SearchMode>("photo");
  const [query, setQuery] = useState("");
  const [componentGroup, setComponentGroup] = useState<CieMathComponentGroup>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readStorage<string[]>(recentKey, []));
  const [uploadedImage, setUploadedImage] = useState<UploadedImageState | null>(null);
  const [imageError, setImageError] = useState("");
  const [ocrOutcome, setOcrOutcome] = useState<QuestionOcrOutcome | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [binarize, setBinarize] = useState(true);
  const archiveSubjects = useMemo(() => buildQuestionArchiveSubjects(subjects), [subjects]);
  const [selectedArchiveId, setSelectedArchiveId] = useState("");
  const [archiveMetas, setArchiveMetas] = useState<LocalQuestionArchiveMetaMap>(() => readQuestionArchiveMetas());
  const [downloadStatus, setDownloadStatus] = useState<ArchiveDownloadStatus>("idle");
  const [downloadError, setDownloadError] = useState("");

  const selectedArchiveSubject = useMemo(
    () => archiveSubjects.find((subject) => subject.id === selectedArchiveId) ?? archiveSubjects[0] ?? null,
    [archiveSubjects, selectedArchiveId],
  );
  const selectedArchiveMeta = selectedArchiveSubject ? archiveMetas[selectedArchiveSubject.id] : undefined;
  const downloadedSource = useMemo(
    () => getDownloadedQuestionArchiveSource(selectedArchiveSubject, selectedArchiveMeta),
    [selectedArchiveMeta, selectedArchiveSubject],
  );
  const selectedArchiveSource = useMemo(() => getQuestionArchiveSource(selectedArchiveSubject), [selectedArchiveSubject]);
  const mathPaperArchive = useMemo(
    () => buildMathPaperArchive(selectedArchiveSource?.questions ?? []),
    [selectedArchiveSource?.questions],
  );
  const canSearchArchive = Boolean(downloadedSource);
  const databaseStats = useMemo(
    () =>
      downloadedSource
        ? getCieMathDatabaseStats(downloadedSource)
        : {
            sourceKind: selectedArchiveSubject?.sourceKind ?? "not-downloaded",
            questionCount: 0,
            componentCount: 0,
            components: [],
            years: [],
          },
    [downloadedSource, selectedArchiveSubject?.sourceKind],
  );
  const ocrText = ocrOutcome?.ocr.text ?? "";
  const effectiveQuery = query.trim() ? query : ocrText;
  const searchSignal = useMemo(
    () =>
      buildQuestionSearchSignal({
        query: effectiveQuery,
        fileName: uploadedImage?.fileName,
        fingerprint: uploadedImage?.fingerprint,
      }),
    [effectiveQuery, uploadedImage?.fileName, uploadedImage?.fingerprint],
  );
  const hasInput =
    canSearchArchive &&
    hasQuestionSearchInput({
      query: effectiveQuery,
      fileName: uploadedImage?.fileName,
      fingerprint: uploadedImage?.fingerprint,
    });
  const results = useMemo(
    () => {
      if (!downloadedSource) return [];
      return searchCieMathQuestions(
        {
          query: effectiveQuery,
          fileName: uploadedImage?.fileName,
          fingerprint: uploadedImage?.fingerprint,
          componentGroup,
        },
        downloadedSource,
      );
    },
    [componentGroup, downloadedSource, effectiveQuery, uploadedImage?.fileName, uploadedImage?.fingerprint],
  );

  useEffect(() => {
    if (!archiveSubjects.length) return;
    if (!selectedArchiveId || !archiveSubjects.some((subject) => subject.id === selectedArchiveId)) {
      setSelectedArchiveId(archiveSubjects[0].id);
    }
  }, [archiveSubjects, selectedArchiveId]);

  useEffect(() => {
    setDownloadStatus("idle");
    setDownloadError("");
    setQuery("");
    setOcrOutcome(null);
    setOcrProgress(null);
    setImageError("");
    setComponentGroup("all");
    setUploadedImage((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }, [selectedArchiveSubject?.id]);

  const handleDownloadArchive = async () => {
    if (!selectedArchiveSubject) return;

    setDownloadStatus("downloading");
    setDownloadError("");

    try {
      const { meta } = await downloadQuestionArchive(selectedArchiveSubject);
      setArchiveMetas((current) => ({ ...current, [selectedArchiveSubject.id]: meta }));
      setDownloadStatus("done");
    } catch (error) {
      setDownloadStatus("error");
      setDownloadError(error instanceof Error ? error.message : "题库下载暂不可用。");
    }
  };

  const isScanning = Boolean(ocrProgress && ocrProgress.stage !== "done" && ocrProgress.stage !== "error");
  const headlineResult = ocrOutcome?.located;

  useEffect(() => {
    return () => {
      if (uploadedImage?.previewUrl) URL.revokeObjectURL(uploadedImage.previewUrl);
    };
  }, [uploadedImage?.previewUrl]);

  const subjectMistakeCounts = subjects.map((subject) => ({
    subject,
    count: mistakes.filter((mistake) => mistake.subjectId === subject.id).length,
  }));
  const activeMistakes = mistakes.filter((mistake) => mistake.status !== "已掌握");
  const topMistakeSubject = [...subjectMistakeCounts].sort((a, b) => b.count - a.count)[0];

  const saveSearch = () => {
    const keyword = query.trim();
    if (!keyword) return;

    const nextSearches = [keyword, ...recentSearches.filter((item) => item !== keyword)].slice(0, 5);
    setRecentSearches(nextSearches);
    writeStorage(recentKey, nextSearches);
  };

  const runOcr = async (image: UploadedImageState, useBinarize: boolean) => {
    if (!downloadedSource) {
      setImageError("请先选择科目并下载本地题库包，再开始搜题。");
      return;
    }

    setImageError("");
    setOcrOutcome(null);
    setOcrProgress({ stage: "preprocessing", ratio: 0.05, label: "正在增强图片清晰度…" });

    try {
      const outcome = await locateQuestionFromImage(
        image.file,
        componentGroup,
        {
          binarize: useBinarize,
          onProgress: setOcrProgress,
        },
        downloadedSource,
      );
      setOcrOutcome(outcome);
      setOcrProgress({ stage: "done", ratio: 1, label: "识别完成" });
    } catch (error) {
      setOcrProgress({ stage: "error", ratio: 0, label: "识别未完成" });
      if (error instanceof OcrUnavailableError) {
        setImageError(`本地识别引擎暂不可用：${error.message} 已切换到文件名 + 图片指纹搜索，你也可以手动输入题号。`);
      } else {
        setImageError("识别图片时出现问题，已切换到关键词搜索。");
      }
      if (!query.trim()) {
        setQuery(image.fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
      }
    }
  };

  const handlePhotoSelected = async (file?: File) => {
    if (!file) return;
    if (!downloadedSource) {
      setImageError("请先选择科目并下载本地题库包，再上传图片。");
      return;
    }

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

  return (
    <main className="question-search-page px-5 pb-28 pt-7">
      <header className="mb-5">
        <p className="text-sm font-bold text-muted">2018+ 本地题库包 · OCR 搜题</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal text-ink">本地搜题</h1>
      </header>

      <SubjectArchivePanel
        subjects={archiveSubjects}
        selectedSubject={selectedArchiveSubject}
        metas={archiveMetas}
        onSelect={setSelectedArchiveId}
        onDownload={handleDownloadArchive}
        downloadStatus={downloadStatus}
        downloadError={downloadError}
      />

      <section className="rounded-[30px] bg-white p-2 shadow-soft">
        <div className="grid grid-cols-2 gap-1 rounded-[24px] bg-cream p-1">
          <ModeButton active={mode === "photo"} icon={<Camera size={16} />} label="拍照搜题" onClick={() => setMode("photo")} />
          <ModeButton active={mode === "mistakes"} icon={<NotebookTabs size={16} />} label="错题总结" onClick={() => setMode("mistakes")} />
        </div>
      </section>

      {mode === "photo" ? (
        <>
          <OcrBanner
            stats={databaseStats}
            subject={selectedArchiveSubject}
            archiveMeta={selectedArchiveMeta}
            canSearch={canSearchArchive}
          />

          {mathPaperArchive.length > 0 ? <MathPaperLibrary papers={mathPaperArchive} canSearch={canSearchArchive} /> : null}

          <section className="mt-4 rounded-[32px] bg-white p-4 shadow-soft">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={!canSearchArchive}
              onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canSearchArchive}
              className="grid min-h-44 w-full place-items-center overflow-hidden rounded-[28px] border-2 border-dashed border-black/10 bg-cream p-4 text-center transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadedImage ? (
                <span className="grid w-full gap-3">
                  <img
                    src={uploadedImage.previewUrl}
                    alt="Uploaded question"
                    className="mx-auto h-32 w-full max-w-sm rounded-[22px] object-cover"
                  />
                  <span className="block truncate text-base font-black text-ink">{uploadedImage.fileName}</span>
                </span>
              ) : (
                <span className="grid justify-items-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
                    <Camera size={24} />
                  </span>
                  <span className="mt-3 block text-lg font-black text-ink">
                    {canSearchArchive ? `拍照 / 上传${selectedArchiveSubject?.name ?? ""}题目` : "先下载本地题库包"}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-muted">
                    {canSearchArchive ? "本地识别，图片不会上传服务器" : "下载完成后，搜索会直接在本地完成"}
                  </span>
                </span>
              )}
            </button>

            {uploadedImage ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={retryOcr}
                  disabled={isScanning}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-black text-white disabled:opacity-50"
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
                  }`}
                >
                  二值化 {binarize ? "开" : "关"}
                </button>
                <span className="text-[11px] font-bold text-muted">识别不准时可切换二值化重试</span>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2 rounded-[22px] bg-cream px-3 py-2">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={saveSearch}
                disabled={!canSearchArchive}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveSearch();
                }}
                placeholder={canSearchArchive ? "可补充：9709/12/M/J/24 Q3、topic、关键词" : "先下载当前科目的本地题库包"}
                className="h-11 min-w-0 flex-1 bg-transparent text-sm font-black text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {componentFilters.map((filter, index) => (
                <Chip
                  key={filter.id}
                  selected={componentGroup === filter.id}
                  color={index % 2 === 0 ? "blue" : "green"}
                  onClick={() => setComponentGroup(filter.id)}
                >
                  {filter.label}
                </Chip>
              ))}
            </div>
          </section>

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
              detail="本地种子题库较小，可在下方手动输入 Paper / 题号，或换一张更清晰、保留页眉的截图。"
            />
          ) : null}

          {imageError ? (
            <p className="mt-3 rounded-[20px] bg-white p-3 text-xs font-bold leading-5 text-[#B91C1C] shadow-soft">
              {imageError}
            </p>
          ) : null}

          {canSearchArchive && !uploadedImage && query ? (
            <RecognitionPanel signal={searchSignal} resultCount={results.length} topResult={results[0]} />
          ) : null}

          {recentSearches.length > 0 ? (
            <section className="mt-4">
              <div className="mb-2 flex items-center gap-2 px-1 text-xs font-black text-muted">
                <Clock3 size={14} />
                最近搜索
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-black text-ink shadow-soft"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {hasInput ? (
            <section className="mt-5 space-y-3">
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

              {results.length === 0 ? <EmptyState title="暂时没搜到" detail="保留页眉重新截图，或输入 Paper / 题号 / 知识点。" /> : null}
            </section>
          ) : null}
        </>
      ) : (
        <MistakeSummary
          subjects={subjects}
          mistakes={mistakes}
          activeMistakes={activeMistakes}
          topSubject={topMistakeSubject?.subject}
          topSubjectCount={topMistakeSubject?.count ?? 0}
        />
      )}
    </main>
  );
}

function buildMathPaperArchive(questions: CieMathQuestion[]): MathPaperArchiveItem[] {
  const papers = new Map<string, MathPaperArchiveItem>();

  for (const question of questions) {
    const id = `${question.syllabusCode}-${question.year}-${question.series}-${question.componentCode}`;
    const current = papers.get(id);

    if (current) {
      current.questionCount += 1;
      current.topics = Array.from(new Set([...current.topics, question.topic])).slice(0, 4);
      continue;
    }

    papers.set(id, {
      id,
      paperCode: formatMathPaperCode(question),
      paperLabel: question.paperLabel,
      componentCode: question.componentCode,
      series: question.series,
      year: question.year,
      questionCount: 1,
      topics: [question.topic],
      questionPdf: question.questionPdf,
      markSchemePdf: question.markSchemePdf,
    });
  }

  return Array.from(papers.values()).sort(
    (left, right) =>
      right.year - left.year ||
      seriesSortValue(left.series) - seriesSortValue(right.series) ||
      Number(left.componentCode) - Number(right.componentCode),
  );
}

function MathPaperLibrary({ papers, canSearch }: { papers: MathPaperArchiveItem[]; canSearch: boolean }) {
  return (
    <section className="mt-4 rounded-[32px] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">数学题库</p>
          <h2 className="mt-1 text-xl font-black text-ink">卷号和 Mark Scheme</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            {canSearch ? "已下载本地题包，可直接搜索或打开原卷。" : "先浏览卷号；下载题包后可在本地搜索题目。"}
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-ink">
          <BookOpenCheck size={19} />
        </span>
      </div>

      <div className="grid gap-2">
        {papers.map((paper) => (
          <article key={paper.id} className="grid gap-3 rounded-[24px] bg-cream p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-black leading-6 text-ink">{paper.paperCode}</p>
                <p className="mt-1 truncate text-xs font-black text-muted">{paper.paperLabel}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-muted">
                {paper.questionCount} 题
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {paper.topics.map((topic) => (
                <span key={topic} className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-muted">
                  {topic}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <PaperQuickLink icon={<FileText size={14} />} label="QP" url={paper.questionPdf.url} />
              <PaperQuickLink icon={<BookOpenCheck size={14} />} label="MS" url={paper.markSchemePdf.url} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PaperQuickLink({ icon, label, url }: { icon: ReactNode; label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 items-center justify-center gap-2 rounded-full bg-ink text-xs font-black text-white"
    >
      {icon}
      {label}
      <ExternalLink size={12} />
    </a>
  );
}

function formatMathPaperCode(question: CieMathQuestion) {
  const yearShort = String(question.year).slice(-2);
  return `${question.syllabusCode}/${question.componentCode}/${seriesShortCode(question.series)}/${yearShort}`;
}

function seriesShortCode(series: CieMathQuestion["series"]) {
  if (series === "February/March") return "F/M";
  if (series === "October/November") return "O/N";
  if (series === "Specimen") return "SP";
  return "M/J";
}

function seriesSortValue(series: CieMathQuestion["series"]) {
  if (series === "February/March") return 1;
  if (series === "May/June") return 2;
  if (series === "October/November") return 3;
  return 4;
}

function SubjectArchivePanel({
  subjects,
  selectedSubject,
  metas,
  onSelect,
  onDownload,
  downloadStatus,
  downloadError,
}: {
  subjects: QuestionArchiveSubject[];
  selectedSubject: QuestionArchiveSubject | null;
  metas: LocalQuestionArchiveMetaMap;
  onSelect: (subjectId: string) => void;
  onDownload: () => void;
  downloadStatus: ArchiveDownloadStatus;
  downloadError: string;
}) {
  const selectedMeta = selectedSubject ? metas[selectedSubject.id] : undefined;
  const isDownloading = downloadStatus === "downloading";
  const canDownload = selectedSubject?.availability === "ready";
  const buttonLabel = isDownloading
    ? "正在准备"
    : selectedMeta
      ? "更新本地题包"
      : canDownload
        ? "下载 2018+ 题目答案"
        : "等待 database";

  return (
    <section className="mb-4 rounded-[32px] bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">科目题库包</p>
          <h2 className="mt-1 text-xl font-black text-ink">选择科目后本地搜索</h2>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-ink">
          <Database size={20} />
        </span>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {subjects.map((subject) => {
          const selected = selectedSubject?.id === subject.id;
          const meta = metas[subject.id];

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelect(subject.id)}
              aria-pressed={selected}
              className="grid min-w-[142px] gap-2 rounded-[24px] border p-3 text-left transition"
              style={{
                backgroundColor: selected ? subject.color : "rgba(255,255,255,0.72)",
                borderColor: selected ? subject.accent : "rgba(0,0,0,0.06)",
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-black text-ink">{subject.name}</span>
                {meta ? <CheckCircle2 size={15} className="shrink-0 text-[#166534]" /> : null}
              </span>
              <span className="text-[11px] font-black text-muted">
                {subject.board} {subject.syllabusCode}
              </span>
              <ArchiveStatusPill subject={subject} meta={meta} />
            </button>
          );
        })}
      </div>

      {selectedSubject ? (
        <div className="mt-4 rounded-[26px] bg-cream p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-muted">
                {selectedSubject.board} {selectedSubject.syllabusCode} · {selectedSubject.availabilityLabel}
              </p>
              <h3 className="mt-1 truncate text-lg font-black text-ink">{selectedSubject.name}题库</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-muted">{selectedSubject.description}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink">
              <HardDrive size={18} />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <ArchiveMetric icon={<Layers3 size={14} />} label="范围" value={`${selectedSubject.fromYear}+`} />
            <ArchiveMetric icon={<FileText size={14} />} label="题目" value={selectedMeta ? `${selectedMeta.questionCount}` : "未下载"} />
            <ArchiveMetric
              icon={<BookOpenCheck size={14} />}
              label="答案"
              value={selectedMeta ? `${selectedMeta.answerCount}` : "未下载"}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              disabled={!canDownload || isDownloading}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {buttonLabel}
            </button>
            {selectedMeta ? (
              <span className="text-[11px] font-black text-muted">已保存：{formatArchiveDate(selectedMeta.downloadedAt)}</span>
            ) : null}
          </div>

          {downloadError ? (
            <p className="mt-3 rounded-[18px] bg-white p-3 text-xs font-bold leading-5 text-[#B91C1C]">{downloadError}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ArchiveStatusPill({ subject, meta }: { subject: QuestionArchiveSubject; meta?: LocalQuestionArchiveMeta }) {
  if (meta) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#166534]">
        <CheckCircle2 size={12} />
        已下载
      </span>
    );
  }

  if (subject.availability === "ready") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black text-ink">
        <Download size={12} />
        可下载
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black text-muted">
      <WifiOff size={12} />
      待接入
    </span>
  );
}

function ArchiveMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white p-2">
      <div className="mb-1 flex items-center gap-1 text-[11px] font-black text-muted">
        {icon}
        {label}
      </div>
      <p className="truncate text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function formatArchiveDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OcrBanner({
  stats,
  subject,
  archiveMeta,
  canSearch,
}: {
  stats: {
    questionCount: number;
    componentCount: number;
    components: string[];
    years: number[];
    sourceKind: string;
  };
  subject: QuestionArchiveSubject | null;
  archiveMeta?: LocalQuestionArchiveMeta;
  canSearch: boolean;
}) {
  const available = isOcrLikelyAvailable();

  return (
    <section className="mt-4 rounded-[28px] bg-[#DDE3EA] p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink">
          <ScanSearch size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-muted">
            {subject ? `${subject.name} ${subject.syllabusCode}` : "本地 OCR 搜题"}
          </p>
          <h2 className="mt-1 text-lg font-black text-ink">
            {canSearch ? "拍照 → 识别 → 本地匹配题目 / 答案" : "下载题包后启用本地搜索"}
          </h2>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            {canSearch
              ? `识别在你的设备本地完成，当前题包 ${stats.questionCount} 个题目，${archiveMeta?.answerCount ?? 0} 个答案。`
              : "当前科目还没有可搜索的本地题包。"}
            {available ? "首次使用会下载一次轻量识别模型。" : "当前环境可能不支持本地识别，将回退到关键词搜索。"}
          </p>
          {canSearch ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-muted">
              <ShieldCheck size={13} />
              数据源：{stats.sourceKind}
            </div>
          ) : null}
        </div>
      </div>
    </section>
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

function RecognitionPanel({
  signal,
  resultCount,
  topResult,
}: {
  signal: ReturnType<typeof buildQuestionSearchSignal>;
  resultCount: number;
  topResult?: QuestionSearchResult;
}) {
  return (
    <section className="mt-4 rounded-[28px] bg-[#EEF2F7] p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target size={17} />
          <h2 className="text-base font-black text-ink">关键词线索</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted">{resultCount} 条</span>
      </div>

      <div className="grid gap-2">
        <SignalLine icon={<FileText size={14} />} label="文本线索" value={signal.keyword || "等待输入"} />
        <SignalLine
          icon={<Target size={14} />}
          label="试卷定位"
          value={signal.paperRefs.length > 0 ? signal.paperRefs.map(formatPaperReference).join(" · ") : "未识别到 Paper / 题号"}
        />
      </div>

      {topResult ? (
        <p className="mt-3 rounded-[20px] bg-white p-3 text-sm font-bold leading-6 text-ink">
          最可能是 {topResult.question.syllabusCode}/{topResult.question.componentCode} Q{topResult.question.questionNumber}，
          匹配度 {topResult.score}%。
        </p>
      ) : null}
    </section>
  );
}

function SignalLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[82px_1fr] items-center gap-2 rounded-[18px] bg-white px-3 py-2">
      <span className="flex items-center gap-1 text-xs font-black text-muted">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-xs font-black text-ink">{value}</span>
    </div>
  );
}

function formatPaperReference(reference: ParsedPaperReference) {
  return [
    reference.syllabusCode,
    reference.componentCode ? `Paper ${reference.componentCode}` : undefined,
    reference.series,
    reference.year,
    reference.questionNumber ? `Q${reference.questionNumber}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-black transition ${
        active ? "bg-white text-ink shadow-pill" : "text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
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

function PaperLink({ icon, label, url }: { icon: ReactNode; label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-9 items-center gap-2 rounded-full bg-ink px-3 text-xs font-black text-white"
    >
      {icon}
      {label}
      <ExternalLink size={13} />
    </a>
  );
}

function MistakeSummary({
  subjects,
  mistakes,
  activeMistakes,
  topSubject,
  topSubjectCount,
}: {
  subjects: Subject[];
  mistakes: Mistake[];
  activeMistakes: Mistake[];
  topSubject?: Subject;
  topSubjectCount: number;
}) {
  const masteredCount = mistakes.filter((mistake) => mistake.status === "已掌握").length;

  return (
    <section className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile label="待复盘" value={`${activeMistakes.length}`} tone="red" />
        <SummaryTile label="已掌握" value={`${masteredCount}`} tone="green" />
        <SummaryTile label="重点科目" value={topSubject?.name ?? "无"} tone="blue" />
      </div>

      <section className="rounded-[30px] bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-muted">错题本摘要</p>
            <h2 className="text-xl font-black text-ink">
              {topSubject?.name ?? "学习"} · {topSubjectCount} 条
            </h2>
          </div>
          <NotebookTabs size={22} />
        </div>
        <div className="space-y-2">
          {subjects.map((subject) => {
            const count = mistakes.filter((mistake) => mistake.subjectId === subject.id).length;
            if (count === 0) return null;
            return (
              <div key={subject.id} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-[18px] bg-cream p-3">
                <span className="text-sm font-black text-ink">{subject.name}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <span
                    className="block h-full rounded-full bg-ink"
                    style={{ width: `${Math.max(18, (count / Math.max(mistakes.length, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-black text-muted">{count} 条</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <AlertCircle size={16} />
          <h2 className="text-base font-black text-ink">复盘卡片</h2>
        </div>
        {activeMistakes.map((mistake) => {
          const subject = subjects.find((item) => item.id === mistake.subjectId);
          return (
            <article key={mistake.id} className="rounded-[28px] bg-white p-4 shadow-soft">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-muted">
                    {subject?.name ?? "学习"} · {mistake.status}
                  </p>
                  <h3 className="mt-1 text-base font-black text-ink">{mistake.title}</h3>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-black text-ink"
                  style={{ backgroundColor: subject?.color ?? "#EEF2F7" }}
                >
                  {mistake.lastReviewed}
                </span>
              </div>

              <div className="grid gap-2">
                <SummaryLine icon={<AlertCircle size={14} />} label="错误原因" value={mistake.reason} />
                <SummaryLine icon={<CheckCircle2 size={14} />} label="复盘动作" value="重做同类题 + 写一条避免规则" />
              </div>
            </article>
          );
        })}

        {activeMistakes.length === 0 ? <EmptyState title="错题本很干净" detail="新的错题会在这里形成复盘卡片。" /> : null}
      </section>
    </section>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: "red" | "green" | "blue" }) {
  const toneClass =
    tone === "red"
      ? "bg-[#FEE2E2] text-[#B91C1C]"
      : tone === "green"
        ? "bg-[#DCFCE7] text-[#166534]"
        : "bg-[#DBEAFE] text-[#1D4ED8]";

  return (
    <div className={`rounded-[24px] p-3 shadow-soft ${toneClass}`}>
      <p className="text-[11px] font-black opacity-75">{label}</p>
      <p className="mt-1 truncate text-xl font-black">{value}</p>
    </div>
  );
}

function SummaryLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-cream p-3">
      <div className="mb-1 flex items-center gap-1 text-xs font-black text-muted">
        {icon}
        {label}
      </div>
      <p className="text-sm font-bold leading-6 text-ink">{value}</p>
    </div>
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
