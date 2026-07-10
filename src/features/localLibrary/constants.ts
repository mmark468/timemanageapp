import type { LibrarySubject } from "./types";

export const LIBRARY_DATABASE_NAME = "finished-local-library";
export const LIBRARY_DATABASE_VERSION = 1;
export const MAX_IMPORT_FILE_SIZE = 200 * 1024 * 1024;

export const SUPPORTED_FILE_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "txt",
] as const;

export const FILE_PICKER_ACCEPT = SUPPORTED_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(",");

export const SUBJECT_COLOR_OPTIONS = [
  "#EFE4D8",
  "#DDE9E2",
  "#E7E4D9",
  "#EEE0D2",
  "#DCE8E3",
  "#E4E7EF",
  "#F0E4EA",
  "#E5EBDA",
];

const DEFAULT_SUBJECT_SEEDS: Array<Pick<LibrarySubject, "name" | "icon" | "color">> = [
  { name: "Mathematics", icon: "calculus", color: "#EFE4D8" },
  { name: "Further Mathematics", icon: "math-basic", color: "#DDE9E2" },
  { name: "Physics", icon: "physics", color: "#E7E4D9" },
  { name: "Computer Science", icon: "computer", color: "#EEE0D2" },
  { name: "Economics", icon: "economics", color: "#DCE8E3" },
];

export function createDefaultLibrarySubjects(now = new Date().toISOString()): LibrarySubject[] {
  return DEFAULT_SUBJECT_SEEDS.map((subject, index) => ({
    id: `library-subject-${index + 1}`,
    ...subject,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));
}
