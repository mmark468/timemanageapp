import { Download, ExternalLink, Share2, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { LocalLibraryController } from "../useLocalLibrary";
import { exportResourceFile, openResourceFile, shareResourceFile } from "../localLibraryService";
import type { LocalResource, ResourceCategory } from "../types";
import { LibraryModal } from "./LibraryModal";

export function ResourceActionsDialog({
  resource,
  library,
  onClose,
  onDeleted,
  onMessage,
}: {
  resource: LocalResource;
  library: LocalLibraryController;
  onClose: () => void;
  onDeleted?: () => void;
  onMessage?: (message: string) => void;
}) {
  const [displayName, setDisplayName] = useState(resource.displayName);
  const [subjectId, setSubjectId] = useState(resource.subjectId);
  const [category, setCategory] = useState<ResourceCategory>(resource.category);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDisplayName(resource.displayName);
    setSubjectId(resource.subjectId);
    setCategory(resource.category);
    setConfirmingDelete(false);
  }, [resource]);

  const withBlob = async (action: (blob: Blob) => void | Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      const blob = await library.getBlob(resource.id);
      if (!blob) throw new Error("数据库记录存在，但本地文件已不存在。请删除该记录后重新导入。");
      await action(blob);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "无法读取本地文件");
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    if (!displayName.trim()) {
      setError("文件名称不能为空");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await library.editResource(resource, { displayName: displayName.trim(), subjectId, category });
      onMessage?.("资料信息已更新");
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "更新资料失败");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await library.removeResource(resource.id);
      onMessage?.("文件已从本地资料库删除");
      onClose();
      onDeleted?.();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "删除文件失败");
      setBusy(false);
    }
  };

  return (
    <LibraryModal
      title="资料操作"
      subtitle={resource.originalFileName}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-[1fr_1.5fr] gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-full bg-cream text-sm font-black text-ink">取消</button>
          <button type="button" onClick={() => void saveChanges()} disabled={busy} className="h-11 rounded-full bg-ink text-sm font-black text-white disabled:opacity-50">
            {busy ? "处理中…" : "保存更改"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-black text-ink">
          显示名称
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-bold outline-none" />
        </label>
        <label className="text-sm font-black text-ink">
          移动到科目
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-bold outline-none">
            {library.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-black text-ink">
          资料类型
          <select value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory)} className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-bold outline-none">
            <option value="paper">卷子</option>
            <option value="study_material">学习资料</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <ActionButton
          icon={<ExternalLink size={17} />}
          label="使用系统应用打开"
          onClick={() => void withBlob(async (blob) => {
            await openResourceFile(resource, blob);
            await library.markOpened(resource);
          })}
          disabled={busy}
        />
        <ActionButton
          icon={<Share2 size={17} />}
          label="分享"
          onClick={() => void withBlob(async (blob) => {
            const result = await shareResourceFile(resource, blob);
            onMessage?.(result === "shared" ? "已打开系统分享" : "当前浏览器不支持文件分享，已改为导出");
          })}
          disabled={busy}
        />
        <ActionButton
          icon={<Download size={17} />}
          label="导出文件"
          onClick={() => void withBlob((blob) => {
            exportResourceFile(resource, blob);
            onMessage?.("文件已导出");
          })}
          disabled={busy}
        />
      </div>

      <div className="mt-5 rounded-[20px] bg-[#FFF1EE] p-4">
        {confirmingDelete ? (
          <div>
            <p className="text-sm font-black text-[#8F4638]">确定从本地设备删除这个文件吗？此操作无法撤销。</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmingDelete(false)} className="h-10 rounded-full bg-white text-xs font-black text-ink">保留文件</button>
              <button type="button" onClick={() => void remove()} disabled={busy} className="h-10 rounded-full bg-[#B45E4D] text-xs font-black text-white">确认删除</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingDelete(true)} className="flex w-full items-center justify-center gap-2 text-sm font-black text-[#9B4D3F]">
            <Trash2 size={17} />
            删除文件
          </button>
        )}
      </div>
      {error ? <p className="mt-4 rounded-[18px] bg-[#FFF1EE] p-3 text-sm font-bold leading-5 text-[#93483B]">{error}</p> : null}
    </LibraryModal>
  );
}

function ActionButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-cream px-3 text-xs font-black text-ink disabled:opacity-50">
      {icon}
      {label}
    </button>
  );
}
