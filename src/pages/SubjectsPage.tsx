import { ChevronRight, Plus } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { PageHeader } from "../components/PageHeader";
import { ProgressBar } from "../components/ProgressBar";
import { SubjectIcon } from "../components/SubjectIcon";
import type { PomodoroSession, Subject } from "../types";
import { daysBetween, minutesToText, TODAY } from "../utils/date";

interface SubjectsPageProps {
  subjects: Subject[];
  sessions: PomodoroSession[];
  onOpenSubject: (subjectId: string) => void;
  onAddSubject: (name: string) => void;
  onOpenMistakes: () => void;
}

export function SubjectsPage({ subjects, sessions, onOpenSubject, onAddSubject }: SubjectsPageProps) {
  const [subjectName, setSubjectName] = useState("");

  const saveSubject = () => {
    onAddSubject(subjectName);
    setSubjectName("");
  };

  return (
    <main className="subjects-page px-5 pb-28 pt-7">
      <PageHeader title="我的科目" subtitle="点进科目后调整单元学习和刷题进度。" />

      <div className="subjects-management-layout">
      <section className="subjects-add-panel mb-4 rounded-[24px] bg-white p-3 shadow-soft">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            value={subjectName}
            onChange={(event) => setSubjectName(event.target.value)}
            placeholder="添加自定义科目"
            className="h-11 rounded-[16px] bg-cream px-3 text-sm font-black outline-none"
          />
          <button
            type="button"
            onClick={saveSubject}
            className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white"
            aria-label="添加科目"
          >
            <Plus size={18} />
          </button>
        </div>
      </section>

      <div className="subjects-grid space-y-3">
        {subjects.map((subject) => {
          const todayMinutes = sessions
            .filter((session) => session.subjectId === subject.id && session.completedAt.startsWith(TODAY))
            .reduce((sum, session) => sum + session.duration, 0);

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onOpenSubject(subject.id)}
              className="subject-card w-full rounded-[24px] bg-white p-4 text-left shadow-soft"
              style={
                {
                  "--subject-card-color": subject.color,
                  "--subject-card-accent": subject.accent,
                } as CSSProperties
              }
            >
              <div className="flex items-center gap-3">
                <SubjectIcon iconKey={subject.iconKey} label={subject.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-lg font-black text-ink">{subject.name}</h2>
                    <ChevronRight size={18} className="shrink-0 text-muted" />
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-muted">
                    {subject.board} {subject.code} · 今日 {minutesToText(todayMinutes)}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                <ProgressBar value={subject.progress} color={subject.accent} />
                <span className="text-sm font-black text-ink">{subject.progress}%</span>
              </div>

              {subject.examConfigured || subject.mockExamConfigured ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                  {subject.examConfigured ? (
                    <div className="rounded-[16px] bg-[#FEE2E2] px-3 py-2 text-[#B91C1C]">
                      大考 {daysBetween(TODAY, subject.examDate)}天
                    </div>
                  ) : null}
                  {subject.mockExamConfigured ? (
                    <div className="rounded-[16px] bg-[#FEF3C7] px-3 py-2 text-[#92400E]">
                      Mock {daysBetween(TODAY, subject.mockExamDate)}天
                    </div>
                  ) : null}
                </div>
              ) : null}
            </button>
          );
        })}
        {subjects.length === 0 ? (
          <div className="rounded-[24px] bg-white p-6 text-center text-sm font-bold text-muted shadow-soft">
            还没有科目，先添加一个自定义科目。
          </div>
        ) : null}
      </div>
      </div>
    </main>
  );
}
