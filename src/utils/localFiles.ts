export interface LocalLibraryFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
  importedAt: string;
}

export interface LocalFileStats {
  total: number;
  papers: number;
  answers: number;
  notes: number;
  unsorted: number;
}

export type LocalLibraryStorage = Record<string, LocalLibraryFile[]>;

export function createLocalLibraryFiles(files: FileList): LocalLibraryFile[] {
  return Array.from(files).map((file) => {
    const webkitPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;

    return {
      id: `${webkitPath || file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      path: webkitPath || file.name,
      size: file.size,
      type: file.type || "unknown",
      lastModified: file.lastModified,
      importedAt: new Date().toISOString(),
    };
  });
}

export function summarizeLocalFiles(files: LocalLibraryFile[]): LocalFileStats {
  return files.reduce<LocalFileStats>(
    (summary, file) => {
      const category = getLocalFileCategory(file);

      return {
        total: summary.total + 1,
        papers: summary.papers + (category === "paper" ? 1 : 0),
        answers: summary.answers + (category === "answer" ? 1 : 0),
        notes: summary.notes + (category === "note" ? 1 : 0),
        unsorted: summary.unsorted + (category === "unsorted" ? 1 : 0),
      };
    },
    { total: 0, papers: 0, answers: 0, notes: 0, unsorted: 0 },
  );
}

export function getLocalFileCategory(file: LocalLibraryFile): "paper" | "answer" | "note" | "unsorted" {
  const value = `${file.name} ${file.path}`.toLowerCase();

  if (/(mark|scheme|answer|答案|解析|ms_|_ms|solution)/.test(value)) return "answer";
  if (/(paper|question|qp_|_qp|past|exam|真题|试卷)/.test(value)) return "paper";
  if (/(note|notes|笔记|summary|revision|复习|讲义)/.test(value)) return "note";
  return "unsorted";
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
