import { FileUp, Pencil, Search, Settings2, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SubjectIcon } from "../components/SubjectIcon";
import { ImportResourcesFlow } from "../features/localLibrary/components/ImportResourcesFlow";
import { ConfirmDialog } from "../features/localLibrary/components/LibraryModal";
import { ResourceActionsDialog } from "../features/localLibrary/components/ResourceActionsDialog";
import { ResourceRow } from "../features/localLibrary/components/ResourceRow";
import { SubjectEditorDialog } from "../features/localLibrary/components/SubjectEditorDialog";
import { matchesResourceQuery, sortResources } from "../features/localLibrary/libraryUtils";
import type { LocalResource, ResourceCategory, ResourceSort } from "../features/localLibrary/types";
import type { LocalLibraryController } from "../features/localLibrary/useLocalLibrary";

export function SubjectDetailPage({
  subjectId,
  library,
  onBack,
  onOpenResource,
}: {
  subjectId: string;
  library: LocalLibraryController;
  onBack: () => void;
  onOpenResource: (resourceId: string) => void;
}) {
  const subject = library.subjects.find((item) => item.id === subjectId);
  const importPickerRef = useRef<() => void>(() => undefined);
  const [category, setCategory] = useState<ResourceCategory>("paper");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ResourceSort>("imported_at");
  const [editingSubject, setEditingSubject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [selectedResource, setSelectedResource] = useState<LocalResource | null>(null);
  const [notice, setNotice] = useState("");

  const subjectResources = useMemo(
    () => library.resources.filter((resource) => resource.subjectId === subjectId),
    [library.resources, subjectId],
  );
  const visibleResources = useMemo(
    () => sortResources(subjectResources.filter((resource) => resource.category === category && matchesResourceQuery(resource, query)), sort),
    [category, query, sort, subjectResources],
  );
  const paperCount = subjectResources.filter((resource) => resource.category === "paper").length;
  const studyMaterialCount = subjectResources.filter((resource) => resource.category === "study_material").length;

  const deleteSubject = async () => {
    if (!subject) return;
    setBusyDelete(true);
    try {
      await library.removeSubject(subject.id);
      onBack();
    } finally {
      setBusyDelete(false);
    }
  };

  if (library.loading) {
    return <main className="px-4 pb-28 pt-7 md:px-6 md:pb-8"><div className="h-80 animate-pulse rounded-[28px] bg-white/70 shadow-soft" /></main>;
  }

  if (!subject) {
    return (
      <main className="px-4 pb-28 pt-7 md:px-6 md:pb-8">
        <PageHeader title="科目不存在" subtitle="该科目可能已被删除。" onBack={onBack} />
        <div className="rounded-[26px] bg-white p-8 text-center text-sm font-bold text-muted shadow-soft">请返回资料库选择其他科目。</div>
      </main>
    );
  }

  const emptyMessage = category === "paper" ? "还没有导入卷子。" : "还没有导入学习资料。";

  return (
    <main className="library-detail-page px-4 pb-28 pt-7 md:px-6 md:pb-8 md:pt-6 lg:px-7">
      <PageHeader
        title={subject.name}
        subtitle="本地资料库"
        onBack={onBack}
        action={
          <ImportResourcesFlow
            subjects={library.subjects}
            resources={library.resources}
            initialSubjectId={subject.id}
            initialCategory={category}
            onImport={library.importResources}
            onComplete={setNotice}
            renderTrigger={(openPicker) => {
              importPickerRef.current = openPicker;
              return (
                <button type="button" onClick={openPicker} aria-label="导入文件" className="flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-xs font-black text-white">
                  <FileUp size={16} />
                  <span className="hidden sm:inline">导入文件</span>
                </button>
              );
            }}
          />
        }
      />

      {library.error ? <div className="mb-4 rounded-[20px] bg-[#FFF1EE] p-3 text-sm font-bold text-[#93483B]">{library.error}</div> : null}
      {notice ? <button type="button" onClick={() => setNotice("")} className="mb-4 w-full rounded-[20px] bg-[#EDF8F2] p-3 text-left text-sm font-bold text-[#2D5A4B]">{notice}</button> : null}

      <section className="rounded-[28px] bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-start gap-4">
          <SubjectIcon iconKey={subject.icon} label={subject.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-muted">共 {subjectResources.length} 个本地文件</p>
            <h2 className="mt-1 truncate text-2xl font-black text-ink">{subject.name}</h2>
            <p className="mt-1 text-xs font-bold text-muted">所有文件均保存在当前设备</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => setEditingSubject(true)} className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink" aria-label="编辑科目"><Pencil size={16} /></button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF1EE] text-[#A34F40]" aria-label="删除科目"><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-[20px] bg-cream p-1.5">
          <CategoryTab label="卷子" count={paperCount} active={category === "paper"} onClick={() => setCategory("paper")} />
          <CategoryTab label="学习资料" count={studyMaterialCount} active={category === "study_material"} onClick={() => setCategory("study_material")} />
        </div>
      </section>

      <section className="mt-4 rounded-[26px] bg-white p-3 shadow-soft sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
          <div className="flex items-center gap-2 rounded-[18px] bg-cream px-3">
            <Search size={17} className="shrink-0 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件名" className="h-11 min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none" />
          </div>
          <label className="flex items-center gap-2 rounded-[18px] bg-cream px-3 text-xs font-black text-muted">
            <Settings2 size={16} />
            <select value={sort} onChange={(event) => setSort(event.target.value as ResourceSort)} className="h-11 min-w-0 flex-1 bg-transparent font-bold text-ink outline-none">
              <option value="imported_at">按导入时间</option>
              <option value="name">按名称</option>
              <option value="last_opened_at">按最近打开</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-xs font-black text-muted">{category === "paper" ? "卷子" : "学习资料"}</p>
            <h2 className="text-xl font-black text-ink">{visibleResources.length} 个文件</h2>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleResources.map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              onOpen={() => onOpenResource(resource.id)}
              onToggleFavorite={() => void library.toggleFavorite(resource)}
              onActions={() => setSelectedResource(resource)}
            />
          ))}
        </div>
        {!visibleResources.length ? (
          <div className="rounded-[28px] bg-white p-8 text-center shadow-soft">
            <h3 className="text-base font-black text-ink">{query.trim() ? "没有找到匹配的文件。" : emptyMessage}</h3>
            <p className="mt-2 text-sm font-bold text-muted">支持批量选择 PDF、Word、PowerPoint、图片和 TXT 文件。</p>
            <button type="button" onClick={() => importPickerRef.current()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white">
              <FileUp size={17} />
              导入文件
            </button>
          </div>
        ) : null}
      </section>

      {editingSubject ? <SubjectEditorDialog subject={subject} onClose={() => setEditingSubject(false)} onSave={(draft) => library.editSubject(subject, draft)} /> : null}
      {confirmDelete ? (
        <ConfirmDialog
          title={`删除 ${subject.name}`}
          message="删除该科目后，该科目中的卷子和学习资料也会被删除，此操作无法撤销。"
          confirmLabel="删除科目"
          busy={busyDelete}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={deleteSubject}
        />
      ) : null}
      {selectedResource ? (
        <ResourceActionsDialog resource={selectedResource} library={library} onClose={() => setSelectedResource(null)} onMessage={setNotice} />
      ) : null}
    </main>
  );
}

function CategoryTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-11 items-center justify-center gap-2 rounded-[16px] text-sm font-black transition ${active ? "bg-white text-ink shadow-pill" : "text-muted"}`}>
      {label}
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-cream" : "bg-white/70"}`}>{count}</span>
    </button>
  );
}
