import { MAX_IMPORT_FILE_SIZE, SUPPORTED_FILE_EXTENSIONS } from "./constants";
import type { LocalResource, ResourceSort } from "./types";

const supportedExtensions = new Set<string>(SUPPORTED_FILE_EXTENSIONS);

export function getFileExtension(fileName: string): string {
  const normalized = fileName.trim();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === normalized.length - 1) return "";
  return normalized.slice(dotIndex + 1).toLowerCase();
}

export function isSupportedFile(fileName: string): boolean {
  return supportedExtensions.has(getFileExtension(fileName));
}

export function validateImportFile(file: Pick<File, "name" | "size">): string | null {
  if (!isSupportedFile(file.name)) return "暂不支持此文件格式";
  if (file.size <= 0) return "文件为空或无法读取";
  if (file.size > MAX_IMPORT_FILE_SIZE) return "文件超过 200 MB 大小限制";
  return null;
}

export function createFileFingerprint(file: Pick<File, "name" | "size" | "lastModified">): string {
  return `${file.name.trim().toLowerCase()}::${file.size}::${file.lastModified}`;
}

export function createId(prefix: string): string {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomId}`;
}

export function makeUniqueDisplayName(fileName: string, usedNames: Iterable<string>): string {
  const normalizedNames = new Set(Array.from(usedNames, (name) => name.trim().toLowerCase()));
  if (!normalizedNames.has(fileName.trim().toLowerCase())) return fileName;

  const extension = getFileExtension(fileName);
  const suffix = extension ? `.${extension}` : "";
  const baseName = suffix ? fileName.slice(0, -suffix.length) : fileName;
  let copyIndex = 2;
  let candidate = `${baseName} (${copyIndex})${suffix}`;

  while (normalizedNames.has(candidate.toLowerCase())) {
    copyIndex += 1;
    candidate = `${baseName} (${copyIndex})${suffix}`;
  }

  return candidate;
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function formatLibraryDate(value: string | null): string {
  if (!value) return "尚未打开";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function matchesResourceQuery(resource: LocalResource, query: string): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return `${resource.displayName} ${resource.originalFileName} ${resource.fileExtension} ${resource.mimeType}`
    .toLowerCase()
    .includes(keyword);
}

export function sortResources(resources: LocalResource[], sort: ResourceSort): LocalResource[] {
  return [...resources].sort((left, right) => {
    if (sort === "name") return left.displayName.localeCompare(right.displayName, "zh-CN", { numeric: true });
    if (sort === "last_opened_at") {
      return (right.lastOpenedAt ?? "").localeCompare(left.lastOpenedAt ?? "") || right.importedAt.localeCompare(left.importedAt);
    }
    return right.importedAt.localeCompare(left.importedAt);
  });
}

export function canPreviewInApp(resource: LocalResource): "pdf" | "image" | "text" | "unsupported" {
  if (resource.fileExtension === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "webp"].includes(resource.fileExtension)) return "image";
  if (resource.fileExtension === "txt") return "text";
  return "unsupported";
}

export function getCategoryLabel(category: LocalResource["category"]): string {
  return category === "paper" ? "卷子" : "学习资料";
}
