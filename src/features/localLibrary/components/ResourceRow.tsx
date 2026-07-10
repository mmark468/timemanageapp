import { MoreHorizontal, Star } from "lucide-react";
import { formatFileSize, formatLibraryDate, getCategoryLabel } from "../libraryUtils";
import type { LocalResource } from "../types";
import { ResourceFileIcon } from "./ResourceFileIcon";

export function ResourceRow({
  resource,
  subjectName,
  showSubject = false,
  onOpen,
  onToggleFavorite,
  onActions,
}: {
  resource: LocalResource;
  subjectName?: string;
  showSubject?: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onActions: () => void;
}) {
  return (
    <article className="library-resource-row rounded-[22px] bg-white p-3 shadow-soft sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <button type="button" onClick={onOpen} aria-label={`打开 ${resource.displayName}`}>
          <ResourceFileIcon resource={resource} />
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate text-sm font-black text-ink sm:text-base">{resource.displayName}</h3>
            <span className="rounded-full bg-cream px-2 py-1 text-[10px] font-black uppercase text-muted">{resource.fileExtension || "FILE"}</span>
          </div>
          <p className="mt-1 truncate text-xs font-bold text-muted">
            {showSubject && subjectName ? `${subjectName} · ` : ""}{getCategoryLabel(resource.category)} · {formatFileSize(resource.fileSize)}
          </p>
          <p className="mt-1 truncate text-[11px] font-bold text-muted">
            导入 {formatLibraryDate(resource.importedAt)} · 最近打开 {formatLibraryDate(resource.lastOpenedAt)}
          </p>
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`grid h-9 w-9 place-items-center rounded-full ${resource.isFavorite ? "bg-[#FFF3D6] text-[#B27818]" : "bg-cream text-muted"}`}
            aria-label={resource.isFavorite ? "取消收藏" : "收藏"}
          >
            <Star size={16} fill={resource.isFavorite ? "currentColor" : "none"} />
          </button>
          <button type="button" onClick={onActions} className="grid h-9 w-9 place-items-center rounded-full bg-cream text-ink" aria-label="更多操作">
            <MoreHorizontal size={17} />
          </button>
        </div>
      </div>
    </article>
  );
}
