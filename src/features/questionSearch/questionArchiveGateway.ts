import type { ExamBoard, Subject } from "../../types";
import { buildMath9709QuestionSearchSource } from "./math9709QuestionSource";
import type { QuestionSearchDataSource } from "./questionSearchEngine";

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

const subjectDescriptions: Record<string, string> = {
  "CAIE-9709": "数学题库可按年份、考试月份和卷号直达试卷与答案。",
  "CAIE-9708": "经济题库沿用同样的年份、月份和卷号结构，链接接入后可直达试卷与答案。",
  "CAIE-9990": "心理学题库沿用同样的年份、月份和卷号结构，链接接入后可直达试卷与答案。",
  "CAIE-9618": "计算机题库沿用同样的年份、月份和卷号结构，链接接入后可直达试卷与答案。",
  "CAIE-9093": "英语题库沿用同样的年份、月份和卷号结构，链接接入后可直达试卷与答案。",
  "CAIE-9702": "物理题库沿用同样的年份、月份和卷号结构，链接接入后可直达试卷与答案。",
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
        availabilityLabel: isBundledMath ? "可直达" : "结构已预留",
        sourceKind: isBundledMath ? "bundled-database" : "remote-database",
        description: subjectDescriptions[key] ?? `${subject.name} 题库沿用同样的年份、月份和卷号结构。`,
      } satisfies QuestionArchiveSubject;
    });

  if (!seen.has("caie-9709")) {
    archiveSubjects.push(fallbackMathArchiveSubject);
  }

  return archiveSubjects;
}

export function getQuestionArchiveSource(subject?: QuestionArchiveSubject | null): QuestionSearchDataSource | null {
  if (!subject) return null;
  if (subject.board !== "CAIE" || subject.syllabusCode !== "9709") return null;

  return {
    kind: "bundled-database",
    questions: buildMath9709QuestionSearchSource(subject.fromYear),
  };
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
  availabilityLabel: "可直达",
  sourceKind: "bundled-database",
  description: subjectDescriptions["CAIE-9709"],
};
