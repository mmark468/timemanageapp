import {
  ArrowDown,
  ArrowUp,
  BookOpenText,
  FileStack,
  FileUp,
  Heart,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { SubjectIcon } from "../components/SubjectIcon";
import { ConfirmDialog } from "../features/localLibrary/components/LibraryModal";
import { ImportResourcesFlow } from "../features/localLibrary/components/ImportResourcesFlow";
import { ResourceActionsDialog } from "../features/localLibrary/components/ResourceActionsDialog";
import { ResourceRow } from "../features/localLibrary/components/ResourceRow";
import { SubjectEditorDialog } from "../features/localLibrary/components/SubjectEditorDialog";
import { matchesResourceQuery, sortResources } from "../features/localLibrary/libraryUtils";
import type { LibrarySubject, LocalResource } from "../features/localLibrary/types";
import type { LocalLibraryController } from "../features/localLibrary/useLocalLibrary";

type LibraryView = "subjects" | "recent" | "favorites";

export function SubjectsPage({
  library,
  onOpenSubject,
  onOpenResource,
}: {
  library: LocalLibraryController;
  onOpenSubject: (subjectId: string) => void;
  onOpenResource: (resourceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<LibraryView>("subjects");
  const [editor, setEditor] = useState<LibrarySubject | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibrarySubject | null>(null);
  const [selectedResource, setSelectedResource] = useState<LocalResource | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [notice, setNotice] = useState("");

  const stats = useMemo(() => ({
    total: library.resources.length,
    papers: library.resources.filter((resource) => resource.category === "paper").length,
    studyMaterials: library.resources.filter((resource) => resource.category === "study_material").length,
  }), [library.resources]);

  const visibleResources = useMemo(() => {
    const matching = library.resources.filter((resource) => matchesResourceQuery(resource, query));
    if (query.trim()) return sortResources(matching, "last_opened_at");
    if (view === "favorites") return sortResources(matching.filter((resource) => resource.isFavorite), "last_opened_at");
    if (view === "recent") return sortResources(matching.filter((resource) => resource.lastOpenedAt), "last_opened_at");
    return [];
  }, [library.resources, query, view]);

  const removeSubject = async () => {
    if (!deleteTarget) return;
    setBusyDelete(true);
    try {
      await library.removeSubject(deleteTarget.id);
      setNotice("科目及其中的本地文件已删除");
      setDeleteTarget(null);
    } finally {
      setBusyDelete(false);
    }
  };

  return (
    <main className="library-page px-4 pb-28 pt-7 md:px-6 md:pb-8 md:pt-6 lg:px-7">
      <PageHeader
        title="本地资料库"
        subtitle="文件只保存在此设备中，按科目整理卷子和学习资料。"
        action={
          <ImportResourcesFlow
            subjects={library.subjects}
            resources={library.resources}
            onImport={library.importResources}
            onComplete={setNotice}
            renderTrigger={(openPicker, disabled) => (
              <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                aria-label="导入文件"
                className="flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <FileUp size={16} />
                <span className="hidden sm:inline">导入文件</span>
              </button>
            )}
          />
        }
      />

      {library.error ? <LibraryAlert message={library.error} /> : null}
      {notice ? <LibraryNotice message={notice} onClose={() => setNotice("")} /> : null}

      <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="space-y-4 md:sticky md:top-6 md:self-start">
          <section className="rounded-[28px] bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 rounded-[20px] bg-cream px-3">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="全局搜索文件名"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ViewButton active={view === "subjects" && !query} label="全部科目" onClick={() => { setView("subjects"); setQuery(""); }} />
              <ViewButton active={view === "recent" && !query} label="最近打开" onClick={() => { setView("recent"); setQuery(""); }} />
              <ViewButton active={view === "favorites" && !query} label="收藏资料" onClick={() => { setView("favorites"); setQuery(""); }} />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 rounded-[28px] bg-white p-3 shadow-soft">
            <LibraryStat icon={<FileStack size={15} />} label="全部文件" value={stats.total} />
            <LibraryStat icon={<BookOpenText size={15} />} label="卷子" value={stats.papers} />
            <LibraryStat icon={<FileUp size={15} />} label="学习资料" value={stats.studyMaterials} />
            <LibraryStat icon={<Heart size={15} />} label="收藏" value={library.resources.filter((resource) => resource.isFavorite).length} />
          </section>

          <div className="flex items-center gap-2 rounded-[20px] bg-white px-4 py-3 text-xs font-bold text-muted shadow-soft">
            <ShieldCheck size={17} className="shrink-0 text-[#2D5A4B]" />
            <span>{library.persistence === "granted" ? "已启用持久本地存储" : "资料不会自动上传到云端"}</span>
          </div>
        </aside>

        <section className="min-w-0">
          {library.loading ? <LibraryLoading /> : null}

          {!library.loading && view === "subjects" && !query.trim() ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-black text-muted">科目</p>
                  <h2 className="text-xl font-black text-ink">{library.subjects.length} 个资料区</h2>
                </div>
                <button type="button" onClick={() => setEditor("new")} className="flex h-10 items-center gap-1 rounded-full bg-white px-4 text-xs font-black text-ink shadow-soft">
                  <Plus size={16} />
                  新建科目
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {library.subjects.map((subject, index) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    resources={library.resources.filter((resource) => resource.subjectId === subject.id)}
                    isFirst={index === 0}
                    isLast={index === library.subjects.length - 1}
                    onOpen={() => onOpenSubject(subject.id)}
                    onEdit={() => setEditor(subject)}
                    onDelete={() => setDeleteTarget(subject)}
                    onMove={(direction) => void library.moveSubject(subject.id, direction)}
                  />
                ))}
              </div>

              {library.subjects.length === 0 ? (
                <div className="rounded-[28px] bg-white p-8 text-center shadow-soft">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-cream text-ink"><BookOpenText size={26} /></span>
                  <h2 className="mt-4 text-lg font-black text-ink">还没有科目，创建一个科目开始整理资料。</h2>
                  <button type="button" onClick={() => setEditor("new")} className="mt-5 h-11 rounded-full bg-ink px-6 text-sm font-black text-white">新建科目</button>
                </div>
              ) : null}
            </>
          ) : null}

          {!library.loading && (view !== "subjects" || query.trim()) ? (
            <div>
              <div className="mb-3 px-1">
                <p className="text-xs font-black text-muted">{query.trim() ? "搜索结果" : view === "recent" ? "最近打开" : "收藏资料"}</p>
                <h2 className="text-xl font-black text-ink">{visibleResources.length} 个文件</h2>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {visibleResources.map((resource) => (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    subjectName={library.subjects.find((subject) => subject.id === resource.subjectId)?.name}
                    showSubject
                    onOpen={() => onOpenResource(resource.id)}
                    onToggleFavorite={() => void library.toggleFavorite(resource)}
                    onActions={() => setSelectedResource(resource)}
                  />
                ))}
              </div>
              {visibleResources.length === 0 ? (
                <div className="rounded-[26px] bg-white p-8 text-center text-sm font-bold text-muted shadow-soft">
                  {query.trim() ? "没有找到匹配的文件。" : view === "recent" ? "还没有最近打开的资料。" : "还没有收藏资料。"}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {editor ? (
        <SubjectEditorDialog
          subject={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSave={(draft) => editor === "new" ? library.addSubject(draft) : library.editSubject(editor, draft)}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title={`删除 ${deleteTarget.name}`}
          message="删除该科目后，该科目中的卷子和学习资料也会被删除，此操作无法撤销。"
          confirmLabel="删除科目"
          busy={busyDelete}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={removeSubject}
        />
      ) : null}
      {selectedResource ? (
        <ResourceActionsDialog resource={selectedResource} library={library} onClose={() => setSelectedResource(null)} onMessage={setNotice} />
      ) : null}
    </main>
  );
}

function SubjectCard({
  subject,
  resources,
  isFirst,
  isLast,
  onOpen,
  onEdit,
  onDelete,
  onMove,
}: {
  subject: LibrarySubject;
  resources: LocalResource[];
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const papers = resources.filter((resource) => resource.category === "paper").length;
  const studyMaterials = resources.filter((resource) => resource.category === "study_material").length;
  const recent = sortResources(resources.filter((resource) => resource.lastOpenedAt), "last_opened_at")[0];

  return (
    <article
      className="subject-card min-w-0 w-full overflow-hidden rounded-[26px] p-4 shadow-soft"
      style={{ "--subject-card-color": subject.color } as CSSProperties}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} aria-label={`打开 ${subject.name}`}><SubjectIcon iconKey={subject.icon} label={subject.name} size="lg" /></button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-xl font-black text-ink">{subject.name}</h3>
          <p className="mt-1 truncate text-xs font-bold text-muted">{recent ? `最近：${recent.displayName}` : "还没有打开过资料"}</p>
        </button>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-full bg-white/75 text-ink" aria-label="编辑科目"><Pencil size={15} /></button>
          <button type="button" onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-full bg-white/75 text-[#A34F40]" aria-label="删除科目"><Trash2 size={15} /></button>
        </div>
      </div>
      <button type="button" onClick={onOpen} className="mt-4 grid w-full grid-cols-2 gap-2 text-left">
        <SubjectMetric label="卷子" value={papers} />
        <SubjectMetric label="学习资料" value={studyMaterials} />
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/75 px-3 py-1.5 text-[11px] font-black text-muted">共 {resources.length} 个文件</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMove("up")} disabled={isFirst} className="grid h-8 w-8 place-items-center rounded-full bg-white/75 text-ink disabled:opacity-30" aria-label="向前排序"><ArrowUp size={14} /></button>
          <button type="button" onClick={() => onMove("down")} disabled={isLast} className="grid h-8 w-8 place-items-center rounded-full bg-white/75 text-ink disabled:opacity-30" aria-label="向后排序"><ArrowDown size={14} /></button>
        </div>
      </div>
    </article>
  );
}

function ViewButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-[15px] px-2 text-[11px] font-black ${active ? "bg-ink text-white" : "bg-cream text-muted"}`}>{label}</button>;
}

function LibraryStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[19px] bg-cream p-3">
      <div className="flex items-center gap-1 text-[11px] font-black text-muted">{icon}{label}</div>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function SubjectMetric({ label, value }: { label: string; value: number }) {
  return <span className="rounded-[18px] bg-white/75 p-3"><span className="block text-[11px] font-black text-muted">{label}</span><span className="mt-1 block text-2xl font-black text-ink">{value}</span></span>;
}

function LibraryLoading() {
  return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-[26px] bg-white/70 shadow-soft" />)}</div>;
}

function LibraryAlert({ message }: { message: string }) {
  return <div className="mb-4 rounded-[20px] bg-[#FFF1EE] px-4 py-3 text-sm font-bold text-[#93483B]">{message}</div>;
}

function LibraryNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return <button type="button" onClick={onClose} className="mb-4 w-full rounded-[20px] bg-[#EDF8F2] px-4 py-3 text-left text-sm font-bold text-[#2D5A4B]">{message}</button>;
}
