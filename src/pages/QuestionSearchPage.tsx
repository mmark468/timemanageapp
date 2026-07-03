import {
  AlertCircle,
  BookOpenCheck,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Hash,
  HardDrive,
  Layers3,
  Lightbulb,
  Loader2,
  NotebookTabs,
  RotateCw,
  ScanSearch,
  Search,
  Sparkles,
  Target,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Chip } from "../components/Chip";
import { createImageFingerprint } from "../features/questionSearch/imageFingerprint";
import { OcrUnavailableError } from "../features/questionSearch/ocrEngine";
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
  readQuestionArchiveMetas,
  type LocalQuestionArchiveMeta,
  type LocalQuestionArchiveMetaMap,
  type QuestionArchiveSubject,
} from "../features/questionSearch/questionArchiveGateway";
import {
  math9709PaperDatabase,
  math9709PaperDatabaseSourceUrl,
  math9709PaperDatabaseStats,
  type Math9709PaperResource,
  type Math9709SeriesCode,
} from "../features/questionSearch/math9709PaperDatabase";
import type {
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

interface MathPaperYearGroup {
  year: number;
  papers: Math9709PaperResource[];
  sessions: MathPaperSessionGroup[];
}

interface MathPaperSessionGroup {
  id: string;
  year: number;
  seriesCode: Math9709SeriesCode;
  seriesName: Math9709PaperResource["seriesName"];
  sessionLabel: string;
  papers: Math9709PaperResource[];
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

const archiveSubjectTones = ["#111827", "#14532D", "#1E3A8A", "#6D28D9", "#9F1239", "#92400E", "#0F766E", "#374151"];

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
  const mathPaperArchive =
    selectedArchiveSubject?.board === "CAIE" && selectedArchiveSubject.syllabusCode === "9709" ? math9709PaperDatabase : [];
  const selectedSubjectHasPaperBrowser = mathPaperArchive.length > 0;
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
      setDownloadError(error instanceof Error ? error.message : "题库暂时不能准备。");
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
      setImageError("请先选择已经准备好的科目，再开始搜题。");
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
        setImageError("这张图暂时没有读清楚。你可以手动输入卷号、题号或知识点继续查找。");
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
      setImageError("请先选择已经准备好的科目，再选择图片。");
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
        <p className="text-sm font-bold text-muted">先选科目，再找题目和答案</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal text-ink">搜题</h1>
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
          <ModeButton active={mode === "photo"} icon={<Camera size={16} />} label="图片搜题" onClick={() => setMode("photo")} />
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

          {selectedSubjectHasPaperBrowser ? (
            <MathPaperBrowser papers={mathPaperArchive} canSearch={canSearchArchive} />
          ) : selectedArchiveSubject ? (
            <PlannedPaperBrowser subject={selectedArchiveSubject} />
          ) : null}

          <section className="mt-4 rounded-[32px] bg-white p-4 shadow-soft">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
                    {canSearchArchive ? `选择${selectedArchiveSubject?.name ?? ""}题目图片` : "先准备当前科目题库"}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-muted">
                    {canSearchArchive ? "可从相册选择，也可以拍照；图片不会上传" : "数学已可用，其它科目正在整理"}
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
                  图片增强 {binarize ? "开" : "关"}
                </button>
                <span className="text-[11px] font-bold text-muted">看不清时可切换增强后重试</span>
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
                placeholder={canSearchArchive ? "可补充：9709/12/M/J/24 Q3、知识点、关键词" : "先选择可用科目"}
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
              detail="可以在下方手动输入卷号 / 题号，或换一张更清晰、保留页眉的截图。"
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

function buildMathPaperYearGroups(papers: Math9709PaperResource[]): MathPaperYearGroup[] {
  const yearMap = new Map<number, Math9709PaperResource[]>();

  for (const paper of papers) {
    yearMap.set(paper.year, [...(yearMap.get(paper.year) ?? []), paper]);
  }

  return Array.from(yearMap.entries())
    .map(([year, yearPapers]) => {
      const sessionMap = new Map<string, Math9709PaperResource[]>();

      for (const paper of yearPapers) {
        const id = `${paper.year}-${paper.seriesCode}`;
        sessionMap.set(id, [...(sessionMap.get(id) ?? []), paper]);
      }

      const sessions = Array.from(sessionMap.entries())
        .map(([id, sessionPapers]) => {
          const firstPaper = sessionPapers[0];
          return {
            id,
            year,
            seriesCode: firstPaper.seriesCode,
            seriesName: firstPaper.seriesName,
            sessionLabel: firstPaper.sessionLabel,
            papers: sortMathPapers(sessionPapers),
          } satisfies MathPaperSessionGroup;
        })
        .sort((left, right) => mathSeriesSortValue(left.seriesCode) - mathSeriesSortValue(right.seriesCode));

      return {
        year,
        papers: sortMathPapers(yearPapers),
        sessions,
      } satisfies MathPaperYearGroup;
    })
    .sort((left, right) => right.year - left.year);
}

function MathPaperBrowser({ papers, canSearch }: { papers: Math9709PaperResource[]; canSearch: boolean }) {
  const groups = useMemo(() => buildMathPaperYearGroups(papers), [papers]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(() => groups[0]?.year);
  const selectedYearGroup = groups.find((group) => group.year === selectedYear) ?? groups[0];
  const [selectedSessionId, setSelectedSessionId] = useState(() => selectedYearGroup?.sessions[0]?.id ?? "");
  const selectedSession =
    selectedYearGroup?.sessions.find((session) => session.id === selectedSessionId) ?? selectedYearGroup?.sessions[0];

  useEffect(() => {
    if (!groups.length) return;
    if (!selectedYear || !groups.some((group) => group.year === selectedYear)) {
      setSelectedYear(groups[0].year);
    }
  }, [groups, selectedYear]);

  useEffect(() => {
    if (!selectedYearGroup?.sessions.length) return;
    if (!selectedSessionId || !selectedYearGroup.sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(selectedYearGroup.sessions[0].id);
    }
  }, [selectedSessionId, selectedYearGroup]);

  return (
    <section className="mt-4 rounded-[32px] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">数学 9709 题库</p>
          <h2 className="mt-1 text-xl font-black text-ink">按年份 / 月份找试卷和答案</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            {canSearch ? "可以直接按文件夹打开对应卷号。" : "先浏览题库；准备好后可用卷号和文件名搜索。"}
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-ink">
          <FolderOpen size={19} />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ArchiveMetric icon={<CalendarDays size={14} />} label="月份" value={`${math9709PaperDatabaseStats.sessionCount}`} />
        <ArchiveMetric icon={<FileText size={14} />} label="试卷" value={`${math9709PaperDatabaseStats.questionPaperCount}`} />
        <ArchiveMetric icon={<BookOpenCheck size={14} />} label="答案" value={`${math9709PaperDatabaseStats.markSchemeCount}`} />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {groups.map((group) => (
          <button
            key={group.year}
            type="button"
            onClick={() => {
              setSelectedYear(group.year);
              setSelectedSessionId(group.sessions[0]?.id ?? "");
            }}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-black transition ${
              selectedYearGroup?.year === group.year ? "bg-ink text-white" : "bg-cream text-ink"
            }`}
          >
            {group.year}
          </button>
        ))}
      </div>

      {selectedYearGroup ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {selectedYearGroup.sessions.map((session) => {
            const selected = selectedSession?.id === session.id;

            return (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedSessionId(session.id)}
                className={`flex items-center justify-between gap-3 rounded-[22px] p-3 text-left transition ${
                  selected ? "bg-[#E8F0E6] text-ink" : "bg-cream text-ink"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FolderOpen size={17} className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{session.sessionLabel}</span>
                    <span className="block text-[11px] font-black text-muted">{session.seriesName}</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-muted">
                  {session.papers.length}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedSession ? (
        <div className="mt-4 rounded-[26px] bg-cream p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-muted">{selectedYearGroup?.year} · {selectedSession.seriesName}</p>
              <h3 className="mt-1 text-lg font-black text-ink">{selectedSession.sessionLabel} 文件夹</h3>
            </div>
            <a
              href={selectedSession.papers[0]?.sourcePageUrl ?? math9709PaperDatabaseSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-black text-ink"
            >
              原页面
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="grid gap-2">
            {selectedSession.papers.map((paper) => (
              <article key={paper.id} className="grid gap-3 rounded-[22px] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-black leading-6 text-ink">{formatMathPaperResourceCode(paper)}</p>
                    <p className="mt-1 truncate text-xs font-black text-muted">{paper.paperLabel}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-[11px] font-black text-muted">
                    Paper {paper.componentCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <PaperQuickLink icon={<FileText size={14} />} label="试卷" link={paper.questionPaper} />
                  <PaperQuickLink icon={<BookOpenCheck size={14} />} label="答案" link={paper.markScheme} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlannedPaperBrowser({ subject }: { subject: QuestionArchiveSubject }) {
  return (
    <section className="mt-4 rounded-[32px] bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">{subject.name}题库</p>
          <h2 className="mt-1 text-xl font-black text-ink">按年份 / 月份找试卷和答案</h2>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            这个科目的题库正在整理，完成后会和数学一样进入年份、考试月份和卷号文件夹。
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-ink">
          <FolderOpen size={19} />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ArchiveMetric icon={<CalendarDays size={14} />} label="年份" value={`${subject.fromYear}+`} />
        <ArchiveMetric icon={<FileText size={14} />} label="试卷" value="整理中" />
        <ArchiveMetric icon={<BookOpenCheck size={14} />} label="答案" value="整理中" />
      </div>

      <div className="mt-4 rounded-[26px] bg-cream p-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink">
            <FolderOpen size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-ink">题库准备中</p>
            <p className="mt-1 text-xs font-bold leading-5 text-muted">
              你现在可以先切回数学测试完整流程；这个科目完成后会使用同样的文件夹结构。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaperQuickLink({
  icon,
  label,
  link,
}: {
  icon: ReactNode;
  label: string;
  link?: Math9709PaperResource["questionPaper"];
}) {
  if (!link) {
    return (
      <span className="flex h-10 items-center justify-center gap-2 rounded-full bg-cream text-xs font-black text-muted">
        {icon}
        {label}
      </span>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      download={link.fileName}
      className="flex h-10 items-center justify-center gap-2 rounded-full bg-ink text-xs font-black text-white"
      title={link.fileName}
    >
      {icon}
      {label}
      <ExternalLink size={12} />
    </a>
  );
}

function sortMathPapers(papers: Math9709PaperResource[]) {
  return [...papers].sort((left, right) => Number(left.componentCode) - Number(right.componentCode));
}

function formatMathPaperResourceCode(paper: Math9709PaperResource) {
  const yearShort = String(paper.year).slice(-2);
  return `${paper.syllabusCode}/${paper.componentCode}/${seriesShortCodeFromSeriesCode(paper.seriesCode)}/${yearShort}`;
}

function seriesShortCodeFromSeriesCode(seriesCode: Math9709SeriesCode) {
  if (seriesCode === "m") return "F/M";
  if (seriesCode === "w") return "O/N";
  return "M/J";
}

function mathSeriesSortValue(seriesCode: Math9709SeriesCode) {
  if (seriesCode === "m") return 1;
  if (seriesCode === "s") return 2;
  return 3;
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
      ? "更新题库"
      : canDownload
        ? "准备 2018+ 题目答案"
        : "题库准备中";

  return (
    <section className="mb-4 rounded-[32px] bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted">选择科目</p>
          <h2 className="mt-1 text-xl font-black text-ink">先选科目，再找题目</h2>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-ink">
          <BookOpenCheck size={20} />
        </span>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {subjects.map((subject, index) => {
          const selected = selectedSubject?.id === subject.id;
          const meta = metas[subject.id];
          const selectedBackground = archiveSubjectTones[index % archiveSubjectTones.length];

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelect(subject.id)}
              aria-pressed={selected}
              className={`grid min-w-[142px] gap-2 rounded-[24px] border p-3 text-left transition ${
                selected ? "shadow-[0_12px_24px_rgba(15,23,42,0.18)]" : ""
              }`}
              style={{
                backgroundColor: selected ? selectedBackground : "rgba(255,255,255,0.72)",
                borderColor: selected ? selectedBackground : "rgba(0,0,0,0.06)",
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm font-black ${selected ? "text-white" : "text-ink"}`}>{subject.name}</span>
                {meta ? <CheckCircle2 size={15} className={`shrink-0 ${selected ? "text-white" : "text-[#166534]"}`} /> : null}
              </span>
              <span className={`text-[11px] font-black ${selected ? "text-white/75" : "text-muted"}`}>
                {subject.board} {subject.syllabusCode}
              </span>
              <ArchiveStatusPill subject={subject} meta={meta} selected={selected} />
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
            <ArchiveMetric icon={<FileText size={14} />} label="试卷" value={selectedMeta ? `${selectedMeta.questionCount}` : "未准备"} />
            <ArchiveMetric
              icon={<BookOpenCheck size={14} />}
              label="答案"
              value={selectedMeta ? `${selectedMeta.answerCount}` : "未准备"}
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

function ArchiveStatusPill({
  subject,
  meta,
  selected,
}: {
  subject: QuestionArchiveSubject;
  meta?: LocalQuestionArchiveMeta;
  selected: boolean;
}) {
  if (meta) {
    return (
      <span
        className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
          selected ? "bg-white text-ink" : "bg-white text-[#166534]"
        }`}
      >
        <CheckCircle2 size={12} />
        已准备
      </span>
    );
  }

  if (subject.availability === "ready") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black text-ink">
        <Download size={12} />
        可准备
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black text-muted">
      <WifiOff size={12} />
      准备中
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
  return (
    <section className="mt-4 rounded-[28px] bg-[#DDE3EA] p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink">
          <ScanSearch size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black text-muted">
            {subject ? `${subject.name} ${subject.syllabusCode}` : "选择科目"}
          </p>
          <h2 className="mt-1 text-lg font-black text-ink">
            {canSearch ? "选择图片或输入卷号找答案" : "这个科目题库正在准备"}
          </h2>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            {canSearch
              ? `当前已准备 ${stats.questionCount} 条题目线索和 ${archiveMeta?.answerCount ?? 0} 份答案。图片只在你的设备上读取。`
              : "完成后会和数学一样，可以按年份、月份和卷号查找。"}
          </p>
          {canSearch ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-muted">
              <CheckCircle2 size={13} />
              已准备好
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
            <p className="text-[11px] font-bold text-muted">图片已读取</p>
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
              评分答案
            </div>
            <p className="text-xs font-bold leading-5 text-ink">{question.markSchemeSummary}</p>
          </div>
        </ResultField>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PaperLink icon={<FileText size={14} />} label="试卷" url={question.questionPdf.url} />
        <PaperLink icon={<BookOpenCheck size={14} />} label="答案" url={question.markSchemePdf.url} />
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
          查看识别到的文字
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
              <p className="mb-1 px-1 text-[11px] font-black text-muted">增强后的图片</p>
              <img src={processedPreview} alt="增强后的题目图片" className="w-full rounded-[18px] border border-black/5" />
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
          value={signal.paperRefs.length > 0 ? signal.paperRefs.map(formatPaperReference).join(" · ") : "未识别到卷号 / 题号"}
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
            评分答案
          </div>
          <p className="text-sm font-bold leading-6 text-ink">{question.markSchemeSummary}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PaperLink icon={<FileText size={14} />} label="试卷" url={question.questionPdf.url} />
        <PaperLink icon={<BookOpenCheck size={14} />} label="答案" url={question.markSchemePdf.url} />
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
