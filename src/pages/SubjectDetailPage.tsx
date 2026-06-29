import { BookOpenCheck, NotebookTabs, Pencil, Play, Settings2, SlidersHorizontal, Target } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { ProgressBar } from "../components/ProgressBar";
import { SubjectIcon, studyIconOptions } from "../components/SubjectIcon";
import type { PomodoroSession, StudyIconKey, Subject, Unit } from "../types";
import { daysBetween, minutesToText, TODAY } from "../utils/date";

interface SubjectDetailPageProps {
  subject: Subject;
  sessions: PomodoroSession[];
  studyMode: SubjectStudyMode;
  onBack: () => void;
  onOpenUnit: (unitId: string) => void;
  onOpenMistakes: () => void;
  onStartReview: () => void;
  onStudyModeChange: (mode: SubjectStudyMode) => void;
  onUpdateOverallProgress: (progress: number) => void;
  onSetUnitFocus: (unit: Unit, mode: "学习" | "刷题") => void;
  onUpdateProgress: (unitId: string, field: "learningProgress" | "practiceProgress", progress: number) => void;
  onAddUnit: (title: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onChangeIcon: (iconKey: StudyIconKey) => void;
}

type SubjectStudyMode = "units" | "overall";

export function SubjectDetailPage({
  subject,
  sessions,
  studyMode,
  onBack,
  onOpenUnit,
  onOpenMistakes,
  onStartReview,
  onStudyModeChange,
  onUpdateOverallProgress,
  onSetUnitFocus,
  onUpdateProgress,
  onAddUnit,
  onChangeIcon,
}: SubjectDetailPageProps) {
  const [unitTitle, setUnitTitle] = useState("");
  const todayMinutes = sessions
    .filter((session) => session.subjectId === subject.id && session.completedAt.startsWith(TODAY))
    .reduce((sum, session) => sum + session.duration, 0);

  const saveUnit = () => {
    onAddUnit(unitTitle);
    setUnitTitle("");
  };

  return (
    <main className="px-4 pb-28 pt-7">
      <PageHeader title={`${subject.name} · ${subject.board} ${subject.code}`} subtitle="单元进度可以直接在这里改。" onBack={onBack} />

      <section className="rounded-[26px] bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SubjectIcon iconKey={subject.iconKey} label={subject.name} size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-black text-muted">总完成度</p>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-4xl font-black text-ink">{subject.progress}%</p>
                <p className="pb-1 text-xs font-bold text-muted">今日 {minutesToText(todayMinutes)}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartReview}
            className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-ink px-4 text-xs font-black text-white"
          >
            <Play size={15} />
            开始复习
          </button>
        </div>
        <ProgressBar value={subject.progress} color={subject.accent} className="mt-3" />
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-cream p-1">
          {[
            { mode: "units" as const, label: "按单元", icon: BookOpenCheck },
            { mode: "overall" as const, label: "总进度", icon: SlidersHorizontal },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => onStudyModeChange(item.mode)}
                className={`flex h-10 items-center justify-center gap-1 rounded-full text-sm font-black transition ${
                  studyMode === item.mode ? "bg-white text-ink shadow-pill" : "text-muted"
                }`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {subject.examConfigured ? <Info label="大考" value={`${daysBetween(TODAY, subject.examDate)}天`} tone="red" /> : null}
          {subject.mockExamConfigured ? <Info label="Mock" value={`${daysBetween(TODAY, subject.mockExamDate)}天`} tone="amber" /> : null}
          <button type="button" onClick={onOpenMistakes} className="rounded-[18px] bg-cream px-3 py-2 text-left">
            <p className="text-[11px] font-black text-muted">错题本</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-black text-ink">
              <NotebookTabs size={14} />
              {subject.wrongQuestions}
            </p>
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-[26px] bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black text-ink">图标</h2>
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-muted">20 个</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {studyIconOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onChangeIcon(option.key)}
              className="grid justify-items-center gap-1 rounded-[18px] p-1.5 text-[10px] font-black text-muted transition hover:bg-cream"
              aria-label={`选择${option.label}图标`}
            >
              <SubjectIcon iconKey={option.key} label={option.label} size="sm" selected={subject.iconKey === option.key} />
              <span className="w-full truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      {studyMode === "overall" ? (
        <section className="mt-4 rounded-[26px] bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-muted">总进度</p>
              <p className="mt-1 text-2xl font-black text-ink">{subject.progress}%</p>
            </div>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-muted">
              {subject.units.length || 1} 项
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={subject.progress}
            onChange={(event) => onUpdateOverallProgress(Number(event.target.value))}
            className="h-2 w-full accent-[#111827]"
          />
          <div className="mt-3 flex items-center justify-between text-[11px] font-black text-muted">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </section>
      ) : (
        <>
          <section className="mt-4 rounded-[24px] bg-white p-3 shadow-soft">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={unitTitle}
                onChange={(event) => setUnitTitle(event.target.value)}
                placeholder="新增单元"
                className="h-10 rounded-[15px] bg-cream px-3 text-sm font-black outline-none"
              />
              <button type="button" onClick={saveUnit} className="h-10 rounded-full bg-ink px-4 text-xs font-black text-white">
                添加
              </button>
            </div>
          </section>

          <section className="mt-4 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <BookOpenCheck size={17} />
              <h2 className="text-base font-black text-ink">单元</h2>
            </div>
            {subject.units.map((unit) => (
              <UnitRow
                key={unit.id}
                unit={unit}
                onOpen={() => onOpenUnit(unit.id)}
                onFocus={onSetUnitFocus}
                onUpdateProgress={onUpdateProgress}
              />
            ))}
            {subject.units.length === 0 ? (
              <div className="rounded-[22px] bg-white p-6 text-center text-sm font-bold text-muted shadow-soft">
                还没有单元，先添加一个单元。
              </div>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone: "red" | "amber" }) {
  return (
    <div
      className={
        tone === "red"
          ? "rounded-[18px] bg-[#FEE2E2] px-3 py-2 text-[#B91C1C]"
          : "rounded-[18px] bg-[#FEF3C7] px-3 py-2 text-[#92400E]"
      }
    >
      <p className="text-[11px] font-black opacity-75">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function UnitRow({
  unit,
  onOpen,
  onFocus,
  onUpdateProgress,
}: {
  unit: Unit;
  onOpen: () => void;
  onFocus: (unit: Unit, mode: "学习" | "刷题") => void;
  onUpdateProgress: (unitId: string, field: "learningProgress" | "practiceProgress", progress: number) => void;
}) {
  const learning = unit.learningProgress ?? unit.progress;
  const practice = unit.practiceProgress ?? unit.progress;

  return (
    <article className="rounded-[22px] bg-white p-3 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className="truncate text-sm font-black text-ink">{unit.title}</h3>
          <p className="mt-0.5 text-[11px] font-bold text-muted">
            综合 {unit.progress}% · 学 {learning}% · 题 {practice}%
          </p>
        </button>
        <button type="button" onClick={onOpen} className="grid h-9 w-9 place-items-center rounded-full bg-cream text-ink" aria-label="单元设置">
          <Settings2 size={15} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-[42px_1fr_44px] items-center gap-2">
        <span className="text-[11px] font-black text-muted">学习</span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={learning}
          onChange={(event) => onUpdateProgress(unit.id, "learningProgress", Number(event.target.value))}
          className="h-2 accent-[#111827]"
        />
        <span className="text-right text-xs font-black text-ink">{learning}%</span>
      </div>
      <div className="mt-2 grid grid-cols-[42px_1fr_44px] items-center gap-2">
        <span className="text-[11px] font-black text-muted">刷题</span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={practice}
          onChange={(event) => onUpdateProgress(unit.id, "practiceProgress", Number(event.target.value))}
          className="h-2 accent-[#D98A35]"
        />
        <span className="text-right text-xs font-black text-ink">{practice}%</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onFocus(unit, "学习")} className="flex h-9 items-center justify-center gap-1 rounded-full bg-cream text-xs font-black text-ink">
          <Pencil size={14} />
          正在学习
        </button>
        <button type="button" onClick={() => onFocus(unit, "刷题")} className="flex h-9 items-center justify-center gap-1 rounded-full bg-cream text-xs font-black text-ink">
          <Target size={14} />
          正在刷题
        </button>
      </div>
    </article>
  );
}
