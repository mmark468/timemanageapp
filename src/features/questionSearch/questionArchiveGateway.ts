import type { ExamBoard, Subject } from "../../types";
import { readStorage, writeStorage } from "../../utils/storage";
import { cieMathQuestionBank } from "./cieMathQuestionBank";
import type { QuestionSearchDataSource } from "./questionSearchEngine";

const archiveMetaKey = "finished.questionSearch.archives.v1";
const archiveFromYear = 2018;

export type QuestionArchiveSourceKind = "bundled-seed" | "remote-database";
export type QuestionArchiveAvailability = "ready" | "planned";

export interface QuestionArchiveSubject {
  id: string;
  subjectId: string;
  name: string;
  board: ExamBoard;
  syllabusCode: string;
  color: string;
  accent: string;
  fromYear: number;
  availability: QuestionArchiveAvailability;
  availabilityLabel: string;
  sourceKind: QuestionArchiveSourceKind;
  description: string;
}

export interface LocalQuestionArchiveMeta {
  subjectArchiveId: string;
  subjectId: string;
  syllabusCode: string;
  fromYear: number;
  downloadedAt: string;
  questionCount: number;
  answerCount: number;
  sourceKind: QuestionArchiveSourceKind;
  storageMode: "bundled-manifest" | "local-cache";
}

export type LocalQuestionArchiveMetaMap = Record<string, LocalQuestionArchiveMeta>;

export interface QuestionArchiveDownloadResult {
  meta: LocalQuestionArchiveMeta;
  source: QuestionSearchDataSource;
}

const subjectDescriptions: Record<string, string> = {
  "CAIE-9709": "当前 MVP 内置数学 9709 本地题包，可离线完成关键词和 OCR 匹配。",
  "CAIE-9708": "经济题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9990": "心理学题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9618": "计算机题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9093": "英语题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9702": "物理题库会通过后端 database 接入，当前先保留科目入口。",
};

export function buildQuestionArchiveSubjects(subjects: Subject[]): QuestionArchiveSubject[] {
  const seen = new Set<string>();
  const archiveSubjects = subjects
    .filter((subject) => subject.board && subject.code)
    .map((subject) => {
      const archiveId = createQuestionArchiveId(subject.board, subject.code);
      const key = `${subject.board}-${subject.code}`;
      const isBundledMath = subject.board === "CAIE" && subject.code === "9709";
      seen.add(archiveId);

      return {
        id: archiveId,
        subjectId: subject.id,
        name: subject.name,
        board: subject.board,
        syllabusCode: subject.code,
        color: subject.color,
        accent: subject.accent,
        fromYear: archiveFromYear,
        availability: isBundledMath ? "ready" : "planned",
        availabilityLabel: isBundledMath ? "可下载" : "待接 database",
        sourceKind: isBundledMath ? "bundled-seed" : "remote-database",
        description: subjectDescriptions[key] ?? `${subject.name} 题库入口已预留，后续可接后端索引。`,
      } satisfies QuestionArchiveSubject;
    });

  if (!seen.has("caie-9709")) {
    archiveSubjects.push(fallbackMathArchiveSubject);
  }

  return archiveSubjects;
}

export function readQuestionArchiveMetas(): LocalQuestionArchiveMetaMap {
  return readStorage<LocalQuestionArchiveMetaMap>(archiveMetaKey, {});
}

export function writeQuestionArchiveMetas(metas: LocalQuestionArchiveMetaMap) {
  writeStorage(archiveMetaKey, metas);
}

export async function downloadQuestionArchive(subject: QuestionArchiveSubject): Promise<QuestionArchiveDownloadResult> {
  const source = getQuestionArchiveSource(subject);
  if (!source) {
    throw new Error(`${subject.name} 题库还没有连接 database。`);
  }

  const meta: LocalQuestionArchiveMeta = {
    subjectArchiveId: subject.id,
    subjectId: subject.subjectId,
    syllabusCode: subject.syllabusCode,
    fromYear: subject.fromYear,
    downloadedAt: new Date().toISOString(),
    questionCount: source.questions.length,
    answerCount: source.questions.filter((question) => question.answer.trim()).length,
    sourceKind: subject.sourceKind,
    storageMode: subject.sourceKind === "bundled-seed" ? "bundled-manifest" : "local-cache",
  };

  writeQuestionArchiveMetas({
    ...readQuestionArchiveMetas(),
    [subject.id]: meta,
  });

  return { meta, source };
}

export function getQuestionArchiveSource(subject?: QuestionArchiveSubject | null): QuestionSearchDataSource | null {
  if (!subject) return null;
  if (subject.board !== "CAIE" || subject.syllabusCode !== "9709") return null;

  return {
    kind: "local-seed",
    questions: cieMathQuestionBank.filter((question) => question.year >= subject.fromYear),
  };
}

export function getDownloadedQuestionArchiveSource(
  subject: QuestionArchiveSubject | null | undefined,
  meta: LocalQuestionArchiveMeta | undefined,
): QuestionSearchDataSource | null {
  if (!subject || !meta) return null;
  if (meta.subjectArchiveId !== subject.id) return null;
  return getQuestionArchiveSource(subject);
}

export function createQuestionArchiveId(board: ExamBoard, syllabusCode: string) {
  return `${board}-${syllabusCode}`.toLowerCase();
}

const fallbackMathArchiveSubject: QuestionArchiveSubject = {
  id: "caie-9709",
  subjectId: "math",
  name: "数学",
  board: "CAIE",
  syllabusCode: "9709",
  color: "#BDE7F8",
  accent: "#4CAFD6",
  fromYear: archiveFromYear,
  availability: "ready",
  availabilityLabel: "可下载",
  sourceKind: "bundled-seed",
  description: subjectDescriptions["CAIE-9709"],
};
