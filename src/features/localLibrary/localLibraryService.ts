import {
  initializeLocalLibrary,
  putLibrarySubject,
  putLibrarySubjects,
  putLocalResource,
  readLibrarySnapshot,
  readResourceBlob,
  removeLibrarySubject,
  removeLocalResource,
  writeImportedResources,
} from "./localLibraryDb";
import {
  createFileFingerprint,
  createId,
  getFileExtension,
  makeUniqueDisplayName,
  validateImportFile,
} from "./libraryUtils";
import type {
  DuplicateStrategy,
  ImportResult,
  LibrarySnapshot,
  LibrarySubject,
  LocalResource,
  ResourceCategory,
  SubjectDraft,
} from "./types";

export async function initializeLibrary(): Promise<LibrarySnapshot> {
  await initializeLocalLibrary();
  return readLibrarySnapshot();
}

export async function createSubject(draft: SubjectDraft, currentSubjects: LibrarySubject[]): Promise<LibrarySubject> {
  const now = new Date().toISOString();
  const subject: LibrarySubject = {
    id: createId("library-subject"),
    name: draft.name.trim(),
    icon: draft.icon,
    color: draft.color,
    sortOrder: currentSubjects.length,
    createdAt: now,
    updatedAt: now,
  };
  await putLibrarySubject(subject);
  return subject;
}

export async function updateSubject(subject: LibrarySubject, draft: SubjectDraft): Promise<LibrarySubject> {
  const updated = {
    ...subject,
    name: draft.name.trim(),
    icon: draft.icon,
    color: draft.color,
    updatedAt: new Date().toISOString(),
  };
  await putLibrarySubject(updated);
  return updated;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  await removeLibrarySubject(subjectId);
}

export async function reorderSubject(
  subjectId: string,
  direction: "up" | "down",
  currentSubjects: LibrarySubject[],
): Promise<void> {
  const sorted = [...currentSubjects].sort((left, right) => left.sortOrder - right.sortOrder);
  const currentIndex = sorted.findIndex((subject) => subject.id === subjectId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;
  [sorted[currentIndex], sorted[targetIndex]] = [sorted[targetIndex], sorted[currentIndex]];
  const now = new Date().toISOString();
  await putLibrarySubjects(sorted.map((subject, index) => ({ ...subject, sortOrder: index, updatedAt: now })));
}

export async function importLocalResources({
  files,
  subjectId,
  category,
  duplicateStrategy,
  currentResources,
}: {
  files: File[];
  subjectId: string;
  category: ResourceCategory;
  duplicateStrategy: DuplicateStrategy;
  currentResources: LocalResource[];
}): Promise<ImportResult> {
  const validFiles: File[] = [];
  const rejected: ImportResult["rejected"] = [];
  files.forEach((file) => {
    const validationError = validateImportFile(file);
    if (validationError) rejected.push({ fileName: file.name, message: validationError });
    else validFiles.push(file);
  });

  const targetResources = currentResources.filter(
    (resource) => resource.subjectId === subjectId && resource.category === category,
  );
  const duplicateIds = new Set<string>();
  validFiles.forEach((file) => {
    const fingerprint = createFileFingerprint(file);
    targetResources
      .filter((resource) => resource.fingerprint === fingerprint)
      .forEach((resource) => duplicateIds.add(resource.id));
  });

  if (duplicateIds.size > 0 && duplicateStrategy === "cancel") {
    return { imported: [], rejected, replacedCount: 0 };
  }

  const now = new Date().toISOString();
  const usedNames = new Set(
    targetResources
      .filter((resource) => duplicateStrategy !== "replace" || !duplicateIds.has(resource.id))
      .map((resource) => resource.displayName),
  );
  const entries = validFiles.map((file) => {
    const id = createId("resource");
    const displayName = makeUniqueDisplayName(file.name, usedNames);
    usedNames.add(displayName);
    const resource: LocalResource = {
      id,
      subjectId,
      category,
      originalFileName: file.name,
      displayName,
      localPath: `indexeddb:${id}`,
      fileExtension: getFileExtension(file.name),
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      importedAt: now,
      lastOpenedAt: null,
      isFavorite: false,
      fingerprint: createFileFingerprint(file),
    };
    return { resource, file };
  });

  const replacedResourceIds = duplicateStrategy === "replace" ? [...duplicateIds] : [];
  await writeImportedResources(entries, replacedResourceIds);
  return {
    imported: entries.map((entry) => entry.resource),
    rejected,
    replacedCount: replacedResourceIds.length,
  };
}

export async function updateResource(resource: LocalResource, patch: Partial<LocalResource>): Promise<LocalResource> {
  const updated = { ...resource, ...patch, id: resource.id };
  await putLocalResource(updated);
  return updated;
}

export async function deleteResource(resourceId: string): Promise<void> {
  await removeLocalResource(resourceId);
}

export async function getResourceBlob(resourceId: string): Promise<Blob | null> {
  return readResourceBlob(resourceId);
}

export async function requestPersistentLibraryStorage(): Promise<"granted" | "not_granted" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return "unsupported";
  if (await navigator.storage.persisted?.()) return "granted";
  return (await navigator.storage.persist()) ? "granted" : "not_granted";
}

export async function openResourceFile(resource: LocalResource, blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!opened) throw new Error("浏览器阻止了打开窗口，请允许弹出窗口后重试");
}

export function exportResourceFile(resource: LocalResource, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = resource.displayName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareResourceFile(resource: LocalResource, blob: Blob): Promise<"shared" | "exported"> {
  const file = new File([blob], resource.displayName, { type: resource.mimeType });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], title: resource.displayName });
    return "shared";
  }
  exportResourceFile(resource, blob);
  return "exported";
}
