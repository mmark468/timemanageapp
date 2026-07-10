import type { StudyIconKey } from "../../types";

export type ResourceCategory = "paper" | "study_material";

export type ResourceSort = "name" | "imported_at" | "last_opened_at";

export type DuplicateStrategy = "keep_both" | "replace" | "cancel";

export interface LibrarySubject {
  id: string;
  name: string;
  icon: StudyIconKey;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocalResource {
  id: string;
  subjectId: string;
  category: ResourceCategory;
  originalFileName: string;
  displayName: string;
  localPath: string;
  fileExtension: string;
  mimeType: string;
  fileSize: number;
  importedAt: string;
  lastOpenedAt: string | null;
  isFavorite: boolean;
  fingerprint: string;
}

export interface StoredResourceFile {
  id: string;
  blob: Blob;
}

export interface LibrarySnapshot {
  subjects: LibrarySubject[];
  resources: LocalResource[];
}

export interface ImportIssue {
  fileName: string;
  message: string;
}

export interface ImportResult {
  imported: LocalResource[];
  rejected: ImportIssue[];
  replacedCount: number;
}

export interface SubjectDraft {
  name: string;
  icon: StudyIconKey;
  color: string;
}

export type StoragePersistence = "checking" | "granted" | "not_granted" | "unsupported";
