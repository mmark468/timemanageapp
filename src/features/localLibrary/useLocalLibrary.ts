import { useCallback, useEffect, useState } from "react";
import {
  createSubject,
  deleteResource,
  deleteSubject,
  getResourceBlob,
  importLocalResources,
  initializeLibrary,
  reorderSubject,
  requestPersistentLibraryStorage,
  updateResource,
  updateSubject,
} from "./localLibraryService";
import type {
  DuplicateStrategy,
  ImportResult,
  LibrarySubject,
  LocalResource,
  ResourceCategory,
  StoragePersistence,
  SubjectDraft,
} from "./types";

export interface LocalLibraryController {
  subjects: LibrarySubject[];
  resources: LocalResource[];
  loading: boolean;
  error: string;
  persistence: StoragePersistence;
  refresh: () => Promise<void>;
  addSubject: (draft: SubjectDraft) => Promise<void>;
  editSubject: (subject: LibrarySubject, draft: SubjectDraft) => Promise<void>;
  removeSubject: (subjectId: string) => Promise<void>;
  moveSubject: (subjectId: string, direction: "up" | "down") => Promise<void>;
  importResources: (
    files: File[],
    subjectId: string,
    category: ResourceCategory,
    duplicateStrategy: DuplicateStrategy,
  ) => Promise<ImportResult>;
  editResource: (resource: LocalResource, patch: Partial<LocalResource>) => Promise<void>;
  removeResource: (resourceId: string) => Promise<void>;
  toggleFavorite: (resource: LocalResource) => Promise<void>;
  markOpened: (resource: LocalResource) => Promise<void>;
  getBlob: (resourceId: string) => Promise<Blob | null>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") return "本地存储空间不足，无法保存更多文件";
  return error instanceof Error ? error.message : "本地资料库操作失败，请重试";
}

export function useLocalLibrary(): LocalLibraryController {
  const [subjects, setSubjects] = useState<LibrarySubject[]>([]);
  const [resources, setResources] = useState<LocalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [persistence, setPersistence] = useState<StoragePersistence>("checking");

  const applySnapshot = useCallback((snapshot: { subjects: LibrarySubject[]; resources: LocalResource[] }) => {
    setSubjects(snapshot.subjects);
    setResources(snapshot.resources);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError("");
      applySnapshot(await initializeLibrary());
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    void refresh();
    void requestPersistentLibraryStorage().then(setPersistence).catch(() => setPersistence("not_granted"));
  }, [refresh]);

  const runAndRefresh = useCallback(async (operation: () => Promise<void>) => {
    try {
      setError("");
      await operation();
      await refresh();
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);
      setError(message);
      throw new Error(message);
    }
  }, [refresh]);

  const addSubject = useCallback(async (draft: SubjectDraft) => {
    await runAndRefresh(async () => {
      await createSubject(draft, subjects);
    });
  }, [runAndRefresh, subjects]);

  const editSubject = useCallback(async (subject: LibrarySubject, draft: SubjectDraft) => {
    await runAndRefresh(async () => {
      await updateSubject(subject, draft);
    });
  }, [runAndRefresh]);

  const removeSubject = useCallback(async (subjectId: string) => {
    await runAndRefresh(async () => {
      await deleteSubject(subjectId);
    });
  }, [runAndRefresh]);

  const moveSubject = useCallback(async (subjectId: string, direction: "up" | "down") => {
    await runAndRefresh(async () => {
      await reorderSubject(subjectId, direction, subjects);
    });
  }, [runAndRefresh, subjects]);

  const importResources = useCallback(async (
    files: File[],
    subjectId: string,
    category: ResourceCategory,
    duplicateStrategy: DuplicateStrategy,
  ) => {
    let result: ImportResult = { imported: [], rejected: [], replacedCount: 0 };
    await runAndRefresh(async () => {
      result = await importLocalResources({ files, subjectId, category, duplicateStrategy, currentResources: resources });
    });
    return result;
  }, [resources, runAndRefresh]);

  const editResource = useCallback(async (resource: LocalResource, patch: Partial<LocalResource>) => {
    await runAndRefresh(async () => {
      await updateResource(resource, patch);
    });
  }, [runAndRefresh]);

  const removeResource = useCallback(async (resourceId: string) => {
    await runAndRefresh(async () => {
      await deleteResource(resourceId);
    });
  }, [runAndRefresh]);

  const toggleFavorite = useCallback(async (resource: LocalResource) => {
    await runAndRefresh(async () => {
      await updateResource(resource, { isFavorite: !resource.isFavorite });
    });
  }, [runAndRefresh]);

  const markOpened = useCallback(async (resource: LocalResource) => {
    await runAndRefresh(async () => {
      await updateResource(resource, { lastOpenedAt: new Date().toISOString() });
    });
  }, [runAndRefresh]);

  return {
    subjects,
    resources,
    loading,
    error,
    persistence,
    refresh,
    addSubject,
    editSubject,
    removeSubject,
    moveSubject,
    importResources,
    editResource,
    removeResource,
    toggleFavorite,
    markOpened,
    getBlob: getResourceBlob,
  };
}
