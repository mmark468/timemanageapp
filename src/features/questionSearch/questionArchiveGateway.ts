import type { ExamBoard, Subject } from "../../types";
import { readStorage, writeStorage } from "../../utils/storage";
import { math9709PaperDatabaseStats } from "./math9709PaperDatabase";
import { buildMath9709QuestionSearchSource } from "./math9709QuestionSource";
import type { QuestionSearchDataSource } from "./questionSearchEngine";

const archiveMetaKey = "finished.questionSearch.archives.v1";
const archiveFromYear = 2018;

export type QuestionArchiveSourceKind = "bundled-seed" | "bundled-database" | "remote-database";
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
  "CAIE-9709": "当前 MVP 内置数学 9709 从 2018 年后的 QP/MS 索引，并保留后续 database 接口。",
  "CAIE-9708": "经济题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9990": "心理学题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9618": "计算机题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9093": "英语题库会通过后端 database 接入，当前先保留科目入口。",
  "CAIE-9702": "物理题库会通过后端 database 接入，当前先保留科目入口。",
};

export function buildQuestionArchiveSubjects(subjects: Subject[]): QuestionArchiveSubject[] {
  const seen = new Set<string>();
  const archiveSubjects: QuestionArchiveSubject[] = subjects
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
        sourceKind: isBundledMath ? "bundled-database" : "remote-database",
        description: subjectDescriptions[key] ?? `${subject.name} 题库入口已预留，后续可接后端索引。`,
      } satisfies QuestionArchiveSubject;
    });

  if (!seen.has("caie-9709")) {
    archiveSubjects.push(fallbackMathArchiveSubject);
  }

  return archiveSubjects;
}

export function readQuestionArchiveMetas(): LocalQuestionArchiveMetaMap {
  return normaliseQuestionArchiveMetas(readStorage<LocalQuestionArchiveMetaMap>(archiveMetaKey, {}));
}

export function writeQuestionArchiveMetas(metas: LocalQuestionArchiveMetaMap) {
  writeStorage(archiveMetaKey, metas);
}

export async function downloadQuestionArchive(subject: QuestionArchiveSubject): Promise<QuestionArchiveDownloadResult> {
  const source = getQuestionArchiveSource(subject);
  if (!source) {
    throw new Error(`${subject.name} 题库还没有连接 database。`);
  }

  const isMath9709 = subject.board === "CAIE" && subject.syllabusCode === "9709";
  const meta: LocalQuestionArchiveMeta = {
    subjectArchiveId: subject.id,
    subjectId: subject.subjectId,
    syllabusCode: subject.syllabusCode,
    fromYear: subject.fromYear,
    downloadedAt: new Date().toISOString(),
    questionCount: isMath9709 ? math9709PaperDatabaseStats.questionPaperCount : source.questions.length,
    answerCount: isMath9709 ? math9709PaperDatabaseStats.markSchemeCount : source.questions.filter((question) => question.answer.trim()).length,
    sourceKind: subject.sourceKind,
    storageMode: subject.sourceKind === "bundled-seed" || subject.sourceKind === "bundled-database" ? "bundled-manifest" : "local-cache",
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
    kind: "bundled-database",
    questions: buildMath9709QuestionSearchSource(subject.fromYear),
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

function normaliseQuestionArchiveMetas(metas: LocalQuestionArchiveMetaMap): LocalQuestionArchiveMetaMap {
  const mathMeta = metas["caie-9709"];
  if (!mathMeta) return metas;

  if (
    mathMeta.sourceKind === "bundled-database" &&
    mathMeta.questionCount === math9709PaperDatabaseStats.questionPaperCount &&
    mathMeta.answerCount === math9709PaperDatabaseStats.markSchemeCount
  ) {
    return metas;
  }

  return {
    ...metas,
    "caie-9709": {
      ...mathMeta,
      fromYear: archiveFromYear,
      questionCount: math9709PaperDatabaseStats.questionPaperCount,
      answerCount: math9709PaperDatabaseStats.markSchemeCount,
      sourceKind: "bundled-database",
      storageMode: "bundled-manifest",
    },
  };
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
  sourceKind: "bundled-database",
  description: subjectDescriptions["CAIE-9709"],
};
