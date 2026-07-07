import { ChevronRight, Files, FolderOpen, Inbox, Plus, Search } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { SubjectIcon } from "../components/SubjectIcon";
import type { PomodoroSession, Subject } from "../types";
import { summarizeLocalFiles, type LocalFileStats, type LocalLibraryStorage } from "../utils/localFiles";
import { useStoredState } from "../utils/storage";

interface SubjectsPageProps {
  subjects: Subject[];
  sessions: PomodoroSession[];
  onOpenSubject: (subjectId: string) => void;
  onAddSubject: (name: string) => void;
}

export function SubjectsPage({ subjects, onOpenSubject, onAddSubject }: SubjectsPageProps) {
  const [subjectName, setSubjectName] = useState("");
  const [localLibrary] = useStoredState<LocalLibraryStorage>("finished.localFiles", {});
  const libraryStats = subjects.reduce(
    (summary, subject) => {
      const stats = summarizeLocalFiles(localLibrary[subject.id] ?? []);
      return {
        total: summary.total + stats.total,
        papers: summary.papers + stats.papers,
        unsorted: summary.unsorted + stats.unsorted,
      };
    },
    { total: 0, papers: 0, unsorted: 0 },
  );

  const saveSubject = () => {
    onAddSubject(subjectName);
    setSubjectName("");
  };

  return (
    <main className="px-5 pb-28 pt-7 md:grid md:grid-cols-[280px_minmax(0,1fr)] md:items-start md:gap-5 md:px-6 md:pb-8 md:pt-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-7">
      <PageHeader title="资料库" subtitle="按科目整理本地文件，快速找到真题、答案和笔记。" />

      <section className="mb-4 rounded-[24px] bg-white p-3 shadow-soft md:sticky md:top-6 md:mb-0 md:p-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            value={subjectName}
            onChange={(event) => setSubjectName(event.target.value)}
            placeholder="添加资料分类"
            className="h-11 rounded-[16px] bg-cream px-3 text-sm font-black outline-none"
          />
          <button
            type="button"
            onClick={saveSubject}
            className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white"
            aria-label="添加科目"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <LibraryStat icon={<Files size={15} />} label="文件" value={`${libraryStats.total}`} />
          <LibraryStat icon={<Search size={15} />} label="真题" value={`${libraryStats.papers}`} />
          <LibraryStat icon={<Inbox size={15} />} label="待归档" value={`${libraryStats.unsorted}`} />
          <LibraryStat icon={<FolderOpen size={15} />} label="分类" value={`${subjects.length}`} />
        </div>
      </section>

      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
        {subjects.map((subject) => {
          const stats = summarizeLocalFiles(localLibrary[subject.id] ?? []);

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onOpenSubject(subject.id)}
              className="subject-card w-full rounded-[24px] bg-white p-4 text-left shadow-soft"
              style={
                {
                  "--subject-card-color": subject.color,
                  "--subject-card-accent": subject.accent,
                } as CSSProperties
              }
            >
              <div className="flex items-center gap-3">
                <SubjectIcon iconKey={subject.iconKey} label={subject.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-2xl font-black text-ink">{subject.name}</h2>
                    <ChevronRight size={18} className="shrink-0 text-muted" />
                  </div>
                  <p className="mt-1 text-sm font-bold text-muted">{subject.board} {subject.code} · 本地资料库</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <FileStat label="全部文件" value={stats.total} />
                <FileStat label="真题" value={stats.papers} />
                <FileStat label="答案" value={stats.answers} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-muted">
                <span className="rounded-full bg-white/75 px-3 py-1.5">
                  {stats.total > 0 ? `待归档 ${stats.unsorted}` : "待导入"}
                </span>
                <span className="rounded-full bg-white/75 px-3 py-1.5">{subject.units.length || 1} 个文件夹</span>
                <span className="rounded-full bg-white/75 px-3 py-1.5">快速查找</span>
              </div>
            </button>
          );
        })}
        {subjects.length === 0 ? (
          <div className="rounded-[24px] bg-white p-6 text-center text-sm font-bold text-muted shadow-soft md:col-span-full">
            还没有科目，先添加一个自定义科目。
          </div>
        ) : null}
      </div>
    </main>
  );
}

function LibraryStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-cream p-3">
      <div className="mb-2 flex items-center gap-1 text-[11px] font-black text-muted">
        {icon}
        {label}
      </div>
      <p className="text-xl font-black text-ink">{value}</p>
    </div>
  );
}

function FileStat({ label, value }: { label: string; value: LocalFileStats[keyof LocalFileStats] }) {
  return (
    <div className="rounded-[20px] bg-cream/80 p-3">
      <p className="text-[11px] font-black text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}
