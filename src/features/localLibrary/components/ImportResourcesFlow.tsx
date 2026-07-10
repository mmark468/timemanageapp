import { AlertTriangle, FileUp, Files } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FILE_PICKER_ACCEPT } from "../constants";
import { createFileFingerprint, formatFileSize, validateImportFile } from "../libraryUtils";
import type {
  DuplicateStrategy,
  ImportResult,
  LibrarySubject,
  LocalResource,
  ResourceCategory,
} from "../types";
import { LibraryModal } from "./LibraryModal";

export function ImportResourcesFlow({
  subjects,
  resources,
  initialSubjectId,
  initialCategory = "paper",
  renderTrigger,
  onImport,
  onComplete,
}: {
  subjects: LibrarySubject[];
  resources: LocalResource[];
  initialSubjectId?: string;
  initialCategory?: ResourceCategory;
  renderTrigger: (openPicker: () => void, disabled: boolean) => ReactNode;
  onImport: (
    files: File[],
    subjectId: string,
    category: ResourceCategory,
    duplicateStrategy: DuplicateStrategy,
  ) => Promise<ImportResult>;
  onComplete?: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const close = () => setSelectedFiles([]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_PICKER_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) setSelectedFiles(files);
        }}
      />
      {renderTrigger(() => inputRef.current?.click(), subjects.length === 0)}
      {selectedFiles.length ? (
        <ImportResourcesDialog
          files={selectedFiles}
          subjects={subjects}
          resources={resources}
          initialSubjectId={initialSubjectId}
          initialCategory={initialCategory}
          onClose={close}
          onImport={onImport}
          onComplete={onComplete}
        />
      ) : null}
    </>
  );
}

function ImportResourcesDialog({
  files,
  subjects,
  resources,
  initialSubjectId,
  initialCategory,
  onClose,
  onImport,
  onComplete,
}: {
  files: File[];
  subjects: LibrarySubject[];
  resources: LocalResource[];
  initialSubjectId?: string;
  initialCategory: ResourceCategory;
  onClose: () => void;
  onImport: (
    files: File[],
    subjectId: string,
    category: ResourceCategory,
    duplicateStrategy: DuplicateStrategy,
  ) => Promise<ImportResult>;
  onComplete?: (message: string) => void;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? subjects[0]?.id ?? "");
  const [category, setCategory] = useState<ResourceCategory>(initialCategory);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("keep_both");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSubjectId(initialSubjectId ?? subjects[0]?.id ?? "");
    setCategory(initialCategory);
    setDuplicateStrategy("keep_both");
  }, [files, initialCategory, initialSubjectId, subjects]);

  const analysis = useMemo(() => {
    const valid: File[] = [];
    const rejected: Array<{ file: File; message: string }> = [];
    files.forEach((file) => {
      const issue = validateImportFile(file);
      if (issue) rejected.push({ file, message: issue });
      else valid.push(file);
    });
    const fingerprints = new Set(valid.map(createFileFingerprint));
    const duplicateCount = resources.filter(
      (resource) => resource.subjectId === subjectId && resource.category === category && fingerprints.has(resource.fingerprint),
    ).length;
    return { valid, rejected, duplicateCount };
  }, [category, files, resources, subjectId]);

  const confirmImport = async () => {
    if (!subjectId) {
      setError("请先选择所属科目");
      return;
    }
    if (!analysis.valid.length) {
      setError("没有可导入的受支持文件");
      return;
    }
    if (analysis.duplicateCount > 0 && duplicateStrategy === "cancel") {
      onClose();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await onImport(files, subjectId, category, duplicateStrategy);
      const details = [
        `已导入 ${result.imported.length} 个文件`,
        result.replacedCount ? `替换 ${result.replacedCount} 个重复文件` : "",
        result.rejected.length ? `跳过 ${result.rejected.length} 个文件` : "",
      ].filter(Boolean).join("，");
      onComplete?.(details);
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "导入失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <LibraryModal
      title="确认导入文件"
      subtitle="文件只会保存在当前设备的浏览器本地存储中。"
      onClose={onClose}
      size="lg"
      footer={
        <div className="grid grid-cols-[1fr_1.5fr] gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-full bg-cream text-sm font-black text-ink">
            取消
          </button>
          <button
            type="button"
            onClick={() => void confirmImport()}
            disabled={busy || !analysis.valid.length}
            className="h-11 rounded-full bg-ink text-sm font-black text-white disabled:opacity-50"
          >
            {busy ? "正在保存到本地…" : analysis.duplicateCount > 0 && duplicateStrategy === "cancel" ? "取消导入" : `确认导入 ${analysis.valid.length} 个文件`}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-black text-ink">
          所属科目
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-bold outline-none"
          >
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-black text-ink">
          资料类型
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ResourceCategory)}
            className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-bold outline-none"
          >
            <option value="paper">卷子</option>
            <option value="study_material">学习资料</option>
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-[22px] bg-cream p-4">
        <div className="flex items-center gap-2">
          <Files size={18} />
          <h3 className="text-sm font-black text-ink">已选择 {files.length} 个文件</h3>
        </div>
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {files.map((file, index) => {
            const issue = validateImportFile(file);
            return (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-[15px] bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-ink">{file.name}</p>
                  <p className={`mt-0.5 text-[11px] font-bold ${issue ? "text-[#B45E4D]" : "text-muted"}`}>{issue ?? formatFileSize(file.size)}</p>
                </div>
                <FileUp size={16} className={issue ? "text-[#B45E4D]" : "text-muted"} />
              </div>
            );
          })}
        </div>
      </div>

      {analysis.duplicateCount > 0 ? (
        <div className="mt-4 rounded-[22px] border border-[#D4825A]/25 bg-[#FFF7F1] p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#B96442]" />
            <div>
              <h3 className="text-sm font-black text-ink">发现 {analysis.duplicateCount} 个重复文件</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-muted">按文件名、大小和最后修改时间识别当前科目与资料区中的重复项。</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {([
              ["keep_both", "保留两个文件"],
              ["replace", "替换原文件"],
              ["cancel", "取消导入"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDuplicateStrategy(value)}
                className={`h-10 rounded-full text-xs font-black ${duplicateStrategy === value ? "bg-ink text-white" : "bg-white text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {analysis.rejected.length ? (
        <p className="mt-4 rounded-[18px] bg-[#FFF1EE] p-3 text-xs font-bold leading-5 text-[#93483B]">
          {analysis.rejected.length} 个文件因格式、大小或读取状态不符合要求，将被跳过。
        </p>
      ) : null}
      {error ? <p className="mt-4 rounded-[18px] bg-[#FFF1EE] p-3 text-sm font-bold text-[#93483B]">{error}</p> : null}
    </LibraryModal>
  );
}
