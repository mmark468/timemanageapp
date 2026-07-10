import { Download, ExternalLink, FileWarning, MoreHorizontal, Share2, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { ResourceActionsDialog } from "../features/localLibrary/components/ResourceActionsDialog";
import { ResourceFileIcon } from "../features/localLibrary/components/ResourceFileIcon";
import {
  exportResourceFile,
  openResourceFile,
  shareResourceFile,
} from "../features/localLibrary/localLibraryService";
import { canPreviewInApp, formatFileSize, formatLibraryDate, getCategoryLabel } from "../features/localLibrary/libraryUtils";
import type { LocalResource } from "../features/localLibrary/types";
import type { LocalLibraryController } from "../features/localLibrary/useLocalLibrary";

export function ResourcePreviewPage({
  resourceId,
  library,
  onBack,
}: {
  resourceId: string;
  library: LocalLibraryController;
  onBack: () => void;
}) {
  const resource = library.resources.find((item) => item.id === resourceId);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [loadingFile, setLoadingFile] = useState(true);
  const [fileError, setFileError] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const markedResourceId = useRef("");
  const previewKind = useMemo(() => resource ? canPreviewInApp(resource) : "unsupported", [resource]);

  useEffect(() => {
    let active = true;
    let url = "";
    setLoadingFile(true);
    setFileError("");
    setBlob(null);
    setObjectUrl("");
    setTextContent("");

    void library.getBlob(resourceId).then(async (fileBlob) => {
      if (!active) return;
      if (!fileBlob) {
        setFileError("数据库记录存在，但本地文件已不存在。你可以删除此记录后重新导入文件。");
        setLoadingFile(false);
        return;
      }
      setBlob(fileBlob);
      url = URL.createObjectURL(fileBlob);
      setObjectUrl(url);
      if (previewKind === "text") {
        if (fileBlob.size > 2 * 1024 * 1024) setFileError("文本文件超过 2 MB，请使用其他应用打开以保证性能。");
        else setTextContent(await fileBlob.text());
      }
      if (resource && markedResourceId.current !== resource.id) {
        markedResourceId.current = resource.id;
        void library.markOpened(resource).catch(() => undefined);
      }
      setLoadingFile(false);
    }).catch((caughtError) => {
      if (!active) return;
      setFileError(caughtError instanceof Error ? caughtError.message : "无法读取本地文件");
      setLoadingFile(false);
    });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [library.getBlob, library.markOpened, previewKind, resource?.id, resourceId]);

  if (library.loading) {
    return <main className="px-4 pb-28 pt-7 md:px-6 md:pb-8"><div className="h-[60dvh] animate-pulse rounded-[28px] bg-white/70 shadow-soft" /></main>;
  }

  if (!resource) {
    return (
      <main className="px-4 pb-28 pt-7 md:px-6 md:pb-8">
        <PageHeader title="文件不存在" subtitle="该文件记录可能已被删除。" onBack={onBack} />
        <div className="rounded-[28px] bg-white p-8 text-center text-sm font-bold text-muted shadow-soft">返回资料库继续浏览。</div>
      </main>
    );
  }

  const useBlob = async (action: (currentBlob: Blob) => void | Promise<void>) => {
    if (!blob) {
      setFileError("本地文件不可用，请重新导入");
      return;
    }
    try {
      await action(blob);
    } catch (caughtError) {
      setFileError(caughtError instanceof Error ? caughtError.message : "文件操作失败");
    }
  };

  return (
    <main className="resource-preview-page px-4 pb-28 pt-7 md:px-6 md:pb-8 md:pt-6 lg:px-7">
      <PageHeader
        title={resource.displayName}
        subtitle={`${getCategoryLabel(resource.category)} · ${resource.fileExtension.toUpperCase() || "FILE"} · ${formatFileSize(resource.fileSize)}`}
        onBack={onBack}
        action={
          <button type="button" onClick={() => void library.toggleFavorite(resource)} className={`grid h-11 w-11 place-items-center rounded-full ${resource.isFavorite ? "bg-[#FFF3D6] text-[#B27818]" : "bg-white text-muted shadow-soft"}`} aria-label={resource.isFavorite ? "取消收藏" : "收藏"}>
            <Star size={18} fill={resource.isFavorite ? "currentColor" : "none"} />
          </button>
        }
      />

      {notice ? <button type="button" onClick={() => setNotice("")} className="mb-4 w-full rounded-[20px] bg-[#EDF8F2] p-3 text-left text-sm font-bold text-[#2D5A4B]">{notice}</button> : null}
      {fileError ? <div className="mb-4 rounded-[20px] bg-[#FFF1EE] p-3 text-sm font-bold leading-5 text-[#93483B]">{fileError}</div> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-[52dvh] overflow-hidden rounded-[28px] bg-white shadow-soft">
          {loadingFile ? <div className="grid min-h-[52dvh] place-items-center text-sm font-black text-muted">正在读取本地文件…</div> : null}
          {!loadingFile && blob && previewKind === "image" ? <img src={objectUrl} alt={resource.displayName} className="mx-auto max-h-[72dvh] w-full object-contain" /> : null}
          {!loadingFile && blob && previewKind === "pdf" ? <iframe title={resource.displayName} src={objectUrl} className="h-[72dvh] w-full border-0" /> : null}
          {!loadingFile && blob && previewKind === "text" && textContent ? <pre className="max-h-[72dvh] overflow-auto whitespace-pre-wrap break-words p-5 text-sm leading-7 text-ink sm:p-7">{textContent}</pre> : null}
          {!loadingFile && blob && previewKind === "unsupported" ? (
            <div className="grid min-h-[52dvh] place-items-center p-8 text-center">
              <div>
                <ResourceFileIcon resource={resource} size="lg" />
                <h2 className="mt-4 text-xl font-black text-ink">暂不支持在 App 内预览此格式</h2>
                <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-muted">文件已安全保存在本地。可以使用系统默认应用打开，或导出后在 Word / PowerPoint 中查看。</p>
                <button type="button" onClick={() => void useBlob((currentBlob) => openResourceFile(resource, currentBlob))} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-black text-white">
                  <ExternalLink size={17} />
                  使用其他应用打开
                </button>
              </div>
            </div>
          ) : null}
          {!loadingFile && !blob ? (
            <div className="grid min-h-[52dvh] place-items-center p-8 text-center">
              <div><FileWarning size={34} className="mx-auto text-[#B45E4D]" /><h2 className="mt-4 text-lg font-black text-ink">本地文件不可用</h2><p className="mt-2 text-sm font-bold text-muted">记录仍然存在，但文件内容无法读取。</p></div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-[26px] bg-white p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <ResourceFileIcon resource={resource} />
              <div className="min-w-0">
                <h2 className="truncate text-base font-black text-ink">{resource.displayName}</h2>
                <p className="mt-1 text-xs font-bold text-muted">原文件：{resource.originalFileName}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Metadata label="文件大小" value={formatFileSize(resource.fileSize)} />
              <Metadata label="文件类型" value={resource.fileExtension.toUpperCase() || "FILE"} />
              <Metadata label="导入时间" value={formatLibraryDate(resource.importedAt)} />
              <Metadata label="最近打开" value={formatLibraryDate(resource.lastOpenedAt)} />
            </dl>
          </section>

          <section className="grid gap-2 rounded-[26px] bg-white p-3 shadow-soft">
            <PreviewAction icon={<ExternalLink size={17} />} label="使用系统应用打开" onClick={() => void useBlob(async (currentBlob) => { await openResourceFile(resource, currentBlob); await library.markOpened(resource); })} />
            <PreviewAction icon={<Share2 size={17} />} label="分享文件" onClick={() => void useBlob(async (currentBlob) => { const result = await shareResourceFile(resource, currentBlob); setNotice(result === "shared" ? "已打开系统分享" : "已导出文件"); })} />
            <PreviewAction icon={<Download size={17} />} label="导出文件" onClick={() => void useBlob((currentBlob) => { exportResourceFile(resource, currentBlob); setNotice("文件已导出"); })} />
            <PreviewAction icon={<MoreHorizontal size={17} />} label="移动、重命名或删除" onClick={() => setActionsOpen(true)} />
          </section>
        </aside>
      </div>

      {actionsOpen ? (
        <ResourceActionsDialog resource={resource} library={library} onClose={() => setActionsOpen(false)} onDeleted={onBack} onMessage={setNotice} />
      ) : null}
    </main>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-cream p-3"><dt className="font-black text-muted">{label}</dt><dd className="mt-1 truncate font-black text-ink">{value}</dd></div>;
}

function PreviewAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex h-11 items-center gap-2 rounded-[17px] bg-cream px-4 text-left text-xs font-black text-ink">{icon}{label}</button>;
}
