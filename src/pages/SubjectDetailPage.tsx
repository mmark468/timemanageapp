import { FileText, FolderOpen, Inbox, Plus, Search, Settings2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { SubjectIcon, studyIconOptions } from "../components/SubjectIcon";
import type { PomodoroSession, StudyIconKey, Subject, Unit } from "../types";
import {
  createLocalLibraryFiles,
  formatFileSize,
  getLocalFileCategory,
  summarizeLocalFiles,
  type LocalLibraryFile,
  type LocalLibraryStorage,
} from "../utils/localFiles";
import { useStoredState } from "../utils/storage";

interface SubjectDetailPageProps {
  subject: Subject;
  sessions: PomodoroSession[];
  studyMode: SubjectStudyMode;
  onBack: () => void;
  onOpenUnit: (unitId: string) => void;
  onStartReview: () => void;
  onStudyModeChange: (mode: SubjectStudyMode) => void;
  onUpdateOverallProgress: (progress: number) => void;
  onSetUnitFocus: (unit: Unit, mode: "学习" | "刷题") => void;
  onUpdateProgress: (unitId: string, field: "learningProgress" | "practiceProgress", progress: number) => void;
  onAddUnit: (title: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onChangeIcon: (iconKey: StudyIconKey) => void;
}

type SubjectStudyMode = "units" | "overall";
type DirectoryInput = HTMLInputElement & { directory?: boolean; webkitdirectory?: boolean };

interface FileStats {
  total: number;
  papers: number;
  answers: number;
  notes: number;
  unsorted: number;
}

function getUnitFileStats(unit: Unit, index: number): FileStats {
  const checklistCount = Math.max(unit.checklist.length, 1);
  const papers = checklistCount * 3 + (index % 3) + 2;
  const answers = checklistCount * 2 + 1;
  const notes = checklistCount + (unit.status === "已完成" ? 2 : 1);
  const unsorted = unit.status === "已完成" ? 1 : 3;

  return {
    papers,
    answers,
    notes,
    unsorted,
    total: papers + answers + notes + unsorted,
  };
}

export function SubjectDetailPage({
  subject,
  onBack,
  onOpenUnit,
  onAddUnit,
  onChangeIcon,
}: SubjectDetailPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [folderTitle, setFolderTitle] = useState("");
  const [fileQuery, setFileQuery] = useState("");
  const [localLibrary, setLocalLibrary] = useStoredState<LocalLibraryStorage>("finished.localFiles", {});
  const subjectFiles = localLibrary[subject.id] ?? [];
  const stats = summarizeLocalFiles(subjectFiles);
  const visibleFiles = subjectFiles
    .filter((file) => {
      const keyword = fileQuery.trim().toLowerCase();
      if (!keyword) return true;
      return `${file.name} ${file.path}`.toLowerCase().includes(keyword);
    })
    .slice(0, 8);

  useEffect(() => {
    const input = fileInputRef.current as DirectoryInput | null;
    if (!input) return;
    input.webkitdirectory = true;
    input.directory = true;
  }, []);

  const saveFolder = () => {
    onAddUnit(folderTitle);
    setFolderTitle("");
  };

  const importLocalFiles = (files?: FileList | null) => {
    if (!files?.length) return;
    const importedFiles = createLocalLibraryFiles(files);
    setLocalLibrary((current) => {
      const existingFiles = current[subject.id] ?? [];
      const mergedFiles = new Map<string, LocalLibraryFile>();

      [...existingFiles, ...importedFiles].forEach((file) => {
        mergedFiles.set(file.id, file);
      });

      return {
        ...current,
        [subject.id]: [...mergedFiles.values()].sort((a, b) => b.lastModified - a.lastModified),
      };
    });
  };

  return (
    <main className="px-4 pb-28 pt-7 md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-5 md:px-6 md:pb-8 md:pt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-7">
      <PageHeader title={`${subject.name} 文件库`} subtitle="按文件夹、资料类型和考试资料快速定位。" onBack={onBack} />

      <section className="rounded-[30px] bg-white p-5 shadow-soft">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => importLocalFiles(event.target.files)}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <SubjectIcon iconKey={subject.iconKey} label={subject.name} size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-black text-muted">本地资料库</p>
              <h2 className="mt-1 truncate text-3xl font-black text-ink">{stats.total} 个文件</h2>
              <p className="mt-1 text-sm font-bold text-muted">
                {subject.board} {subject.code} · {subject.units.length || 1} 个文件夹
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <LibraryMetric icon={<FileText size={15} />} label="真题" value={stats.papers} />
          <LibraryMetric icon={<FileText size={15} />} label="答案" value={stats.answers} />
          <LibraryMetric icon={<FolderOpen size={15} />} label="笔记" value={stats.notes} />
          <LibraryMetric icon={<Inbox size={15} />} label="待归档" value={stats.unsorted} />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-black text-white"
          >
            <Search size={17} />
            快速查找
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-cream text-sm font-black text-ink"
          >
            <FolderOpen size={17} />
            绑定本地文件
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-[26px] bg-white p-4 shadow-soft md:mt-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black text-ink">图标</h2>
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-muted">20 个</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {studyIconOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onChangeIcon(option.key)}
              className="grid justify-items-center gap-1 rounded-[18px] p-1.5 text-[10px] font-black text-muted transition hover:bg-cream"
              aria-label={`选择${option.label}图标`}
            >
              <SubjectIcon iconKey={option.key} label={option.label} size="sm" selected={subject.iconKey === option.key} />
              <span className="w-full truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[24px] bg-white p-3 shadow-soft md:col-span-2 md:mt-0">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            value={folderTitle}
            onChange={(event) => setFolderTitle(event.target.value)}
            placeholder="新增文件夹 / 资料分类"
            className="h-10 rounded-[15px] bg-cream px-3 text-sm font-black outline-none"
          />
          <button type="button" onClick={saveFolder} className="flex h-10 items-center gap-1 rounded-full bg-ink px-4 text-xs font-black text-white">
            <Plus size={15} />
            添加
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-[28px] bg-white p-4 shadow-soft md:col-span-2 md:mt-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-muted">本地文件</p>
            <h2 className="text-xl font-black text-ink">{subjectFiles.length} 个文件</h2>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 items-center gap-1 rounded-full bg-cream px-3 text-xs font-black text-ink"
          >
            <Plus size={15} />
            导入
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-[20px] bg-cream px-3 py-2">
          <Search size={17} className="shrink-0 text-muted" />
          <input
            ref={searchInputRef}
            value={fileQuery}
            onChange={(event) => setFileQuery(event.target.value)}
            placeholder="按文件名、文件夹或 Paper 搜索"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm font-black text-ink outline-none placeholder:text-muted"
          />
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleFiles.map((file) => (
            <LocalFileRow key={file.id} file={file} />
          ))}
          {subjectFiles.length === 0 ? (
            <div className="rounded-[22px] bg-cream p-5 text-center text-sm font-bold text-muted md:col-span-2">
              还没有绑定本地文件。
            </div>
          ) : null}
          {subjectFiles.length > 0 && visibleFiles.length === 0 ? (
            <div className="rounded-[22px] bg-cream p-5 text-center text-sm font-bold text-muted md:col-span-2">
              没有匹配的本地文件。
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-4 space-y-3 md:col-span-2 md:mt-0 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
        <div className="flex items-center gap-2 px-1 md:col-span-full">
          <FolderOpen size={17} />
          <h2 className="text-base font-black text-ink">文件夹</h2>
        </div>
        {subject.units.map((unit, index) => (
          <FolderRow key={unit.id} unit={unit} index={index} onOpen={() => onOpenUnit(unit.id)} />
        ))}
        {subject.units.length === 0 ? (
          <div className="rounded-[22px] bg-white p-6 text-center text-sm font-bold text-muted shadow-soft md:col-span-full">
            还没有文件夹，先添加一个资料分类。
          </div>
        ) : null}
      </section>
    </main>
  );
}

function LocalFileRow({ file }: { file: LocalLibraryFile }) {
  const categoryLabels = {
    paper: "真题",
    answer: "答案",
    note: "笔记",
    unsorted: "待归档",
  };
  const category = getLocalFileCategory(file);

  return (
    <article className="rounded-[20px] bg-cream p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-white text-ink">
          <FileText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-ink">{file.name}</h3>
          <p className="mt-1 truncate text-xs font-bold text-muted">{file.path}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black text-muted">
            <span className="rounded-full bg-white px-2 py-1">{categoryLabels[category]}</span>
            <span className="rounded-full bg-white px-2 py-1">{formatFileSize(file.size)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function LibraryMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[22px] bg-cream p-3">
      <div className="mb-2 flex items-center gap-1 text-[11px] font-black text-muted">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function FolderRow({ unit, index, onOpen }: { unit: Unit; index: number; onOpen: () => void }) {
  const stats = getUnitFileStats(unit, index);

  return (
    <article className="rounded-[24px] bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-[18px] bg-cream text-ink">
            <FolderOpen size={19} />
          </div>
          <h3 className="truncate text-lg font-black text-ink">{unit.title}</h3>
          <p className="mt-1 text-xs font-bold text-muted">{stats.total} 个文件 · 待归档 {stats.unsorted}</p>
        </button>
        <button type="button" onClick={onOpen} className="grid h-9 w-9 place-items-center rounded-full bg-cream text-ink" aria-label="文件夹设置">
          <Settings2 size={15} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <FolderMetric label="真题" value={stats.papers} />
        <FolderMetric label="答案" value={stats.answers} />
        <FolderMetric label="笔记" value={stats.notes} />
      </div>
    </article>
  );
}

function FolderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-cream/80 p-2.5">
      <p className="text-[10px] font-black text-muted">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}
