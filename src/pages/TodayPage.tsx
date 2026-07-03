import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Circle,
  Flag,
  ListChecks,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScanSearch,
  Settings,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ProgressBar } from "../components/ProgressBar";
import type { DailyTimelineItem, PomodoroSession, PomodoroTarget, Subject, Task, TimetableClass } from "../types";
import { daysBetween, daysLeftText, formatChineseDate, getWeekdayLabel, minutesToText, TODAY } from "../utils/date";
import { useStoredState } from "../utils/storage";

interface TodayPageProps {
  studentName: string;
  subjects: Subject[];
  tasks: Task[];
  timetable: TimetableClass[];
  timelineItems: DailyTimelineItem[];
  sessions: PomodoroSession[];
  focusTarget: PomodoroTarget;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateFocusTitle: (title: string) => void;
  onCompleteSession: (duration: number) => void;
  onOpenFocus: () => void;
  onOpenTimeline: () => void;
  onEditTimelineItem: (item: DailyTimelineItem) => void;
  onAddTask: () => void;
  onOpenQuestionSearch: () => void;
  onOpenSettings: () => void;
}

interface TodayScheduleEntry {
  id: string;
  time: string;
  endTime?: string;
  title: string;
  color: string;
  tag?: string;
  urgent: boolean;
  timelineItem?: DailyTimelineItem;
  task?: Task;
  subject?: Subject;
}

export function TodayPage({
  studentName,
  subjects,
  tasks,
  timetable,
  timelineItems,
  sessions,
  focusTarget,
  onToggleTask,
  onDeleteTask,
  onUpdateFocusTitle,
  onCompleteSession,
  onOpenFocus,
  onOpenTimeline,
  onEditTimelineItem,
  onAddTask,
  onOpenQuestionSearch,
  onOpenSettings,
}: TodayPageProps) {
  const [examIndex, setExamIndex] = useState(0);
  const examSubjects = subjects.filter((subject) => subject.examConfigured);
  const examSubject = examSubjects[examIndex] ?? examSubjects[0];
  const daysLeft = examSubject ? daysBetween(TODAY, examSubject.examDate) : 0;
  const todayTaskPool = tasks.filter(
    (task) =>
      (task.date === TODAY || task.dueDate === TODAY) &&
      !["课程", "大考", "临时考试", "考试", "放假", "突发事件", "番茄钟任务"].includes(task.type),
  );
  const todaySessions = sessions.filter((session) => session.completedAt.startsWith(TODAY));
  const focusMinutes = todaySessions.reduce((sum, session) => sum + session.duration, 0);
  const taskById = new Map(todayTaskPool.map((task) => [task.id, task]));
  const scheduledTaskIds = new Set(timelineItems.map((item) => item.taskId).filter(Boolean));
  const todaySchedule: TodayScheduleEntry[] = [
    ...timelineItems.map((item) => {
      const task = item.taskId ? taskById.get(item.taskId) : undefined;

      return {
        id: item.id,
        time: item.time,
        endTime: item.endTime,
        title: item.title,
        color: item.color,
        tag: item.tag,
        urgent: item.tag === "突发",
        timelineItem: item,
        task,
        subject: subjects.find((subject) => subject.id === (task?.subjectId ?? item.subjectId)),
      } satisfies TodayScheduleEntry;
    }),
    ...todayTaskPool
      .filter((task) => !scheduledTaskIds.has(task.id))
      .map((task) => ({
        id: `today-due-${task.id}`,
        time: task.startTime ?? "截止",
        endTime: task.endTime,
        title: task.title,
        color: task.color ?? subjects.find((subject) => subject.id === task.subjectId)?.color ?? "#EEF2F7",
        tag: task.startTime ? task.type : "截止",
        urgent: task.priority === "高",
        task,
        subject: subjects.find((subject) => subject.id === task.subjectId),
      })),
  ].sort((left, right) => scheduleSortValue(left).localeCompare(scheduleSortValue(right)));
  const visibleSchedule = todaySchedule.slice(0, 7);
  const nextSchedule = todaySchedule[0];
  const examProgress = Math.max(8, Math.min(96, 100 - daysLeft * 1.6));

  const goPreviousExam = () => {
    setExamIndex((current) => (current - 1 + examSubjects.length) % examSubjects.length);
  };

  const goNextExam = () => {
    setExamIndex((current) => (current + 1) % examSubjects.length);
  };

  return (
    <main className="today-page px-5 pb-32 pt-7">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-muted">时间规划</p>
          <h1 className="mt-1 text-2xl font-black leading-tight tracking-normal text-ink">
            嗨 {studentName || "同学"}，今天准备好了吗？
          </h1>
          <p className="mt-2 text-sm font-semibold text-muted">{formatChineseDate(TODAY)}</p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-soft"
          aria-label="个人设置"
        >
          <Settings size={18} />
        </button>
      </header>

      <section className="today-quick-stats mb-4 grid grid-cols-3 gap-2">
        <QuickStat
          icon={<ListChecks size={15} />}
          label="今日任务"
          value={`${todayTaskPool.filter((task) => !task.completed).length}`}
        />
        <QuickStat icon={<Clock3 size={15} />} label="下一段" value={nextSchedule?.time ?? "空"} />
        <QuickStat icon={<CalendarDays size={15} />} label="专注" value={minutesToText(focusMinutes)} />
      </section>

      <section className="today-search-card mb-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[26px] border border-white/80 bg-white p-4 shadow-soft">
        <div>
          <p className="text-sm font-black text-ink">A-Level 搜题</p>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">按科目、Paper 和知识点查本地题库</p>
        </div>
        <button
          type="button"
          onClick={onOpenQuestionSearch}
          className="flex h-10 items-center gap-1 rounded-full bg-ink px-3 text-xs font-black text-white"
        >
          <ScanSearch size={15} />
          去搜题
        </button>
      </section>

      {examSubject ? (
        <section className="today-exam-card rounded-[30px] border border-[#F7CACA] bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-[#D94747] px-3 py-1.5 text-xs font-black text-white">大考倒计时</span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="上一个大考"
                onClick={goPreviousExam}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#F6F8FB] text-ink"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="下一个大考"
                onClick={goNextExam}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#F6F8FB] text-ink"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-[24px] bg-[#FFF1F1] p-4">
            <div className="min-w-0">
              <p className="text-sm font-black text-[#A33A3A]">
                {examSubject.board} {examSubject.code}
              </p>
              <h2 className="mt-2 text-xl font-black leading-tight text-ink">{examSubject.examTitle}</h2>
              <p className="mt-3 text-sm font-bold text-ink/65">{examSubject.examDate}</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black text-[#D94545]">{daysLeft}</p>
              <p className="text-sm font-black text-[#A33A3A]">天</p>
            </div>
          </div>

          <ProgressBar value={examProgress} color="#D94747" className="mt-4" />
          <div className="mt-4 flex justify-center gap-1.5">
            {examSubjects.map((subject, index) => (
              <span
                key={subject.id}
                className={`h-2 rounded-full transition-all ${index === examIndex ? "w-7 bg-[#D94747]" : "w-2 bg-[#E5E7EB]"}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="today-schedule-card mt-5 rounded-[28px] border border-white/80 bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-ink">今日安排</p>
            <p className="text-xs text-muted">课表 + 任务截止时间</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddTask}
              aria-label="添加待办"
              className="grid h-9 w-9 place-items-center rounded-full bg-cream text-ink"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={onOpenTimeline}
              className="flex h-9 items-center gap-1 rounded-full bg-skySoft px-3 text-xs font-black text-ink"
            >
              时间轴
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {visibleSchedule.map((item) => {
            return (
              <div
                role={item.timelineItem ? "button" : undefined}
                tabIndex={item.timelineItem ? 0 : undefined}
                key={item.id}
                onClick={() => {
                  if (item.timelineItem) onEditTimelineItem(item.timelineItem);
                }}
                onKeyDown={(event) => {
                  if (!item.timelineItem) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onEditTimelineItem(item.timelineItem);
                  }
                }}
                className={`grid w-full grid-cols-[72px_8px_1fr] items-center gap-3 rounded-[22px] p-3 text-left ${
                  item.urgent ? "bg-[#FFF1F1] ring-1 ring-[#F7CACA]" : "bg-cream"
                }`}
              >
                <div className={`rounded-[18px] px-2.5 py-2 text-center ${item.urgent ? "bg-[#D94747] text-white" : "bg-white text-ink"}`}>
                  <p className="text-base font-black leading-none">{item.time}</p>
                  <p className="mt-1 truncate text-[10px] font-black">{item.tag ?? "事项"}</p>
                </div>
                <span className="h-14 rounded-full" style={{ backgroundColor: item.urgent ? "#D94747" : item.color }} aria-hidden />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className={`min-w-0 truncate text-sm font-black text-ink ${item.task?.completed ? "line-through opacity-60" : ""}`}>
                      {item.title}
                    </p>
                    {item.task ? (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={item.task.completed ? "标记未完成" : "标记完成"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleTask(item.task!.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggleTask(item.task!.id);
                          }
                        }}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                          item.task.completed ? "bg-mint text-ink" : "bg-white text-muted"
                        }`}
                      >
                        {item.task.completed ? <Check size={16} /> : <Circle size={15} />}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black text-muted">
                    {item.endTime ? <span className="rounded-full bg-white px-2 py-1">{item.endTime}</span> : null}
                    {item.subject ? <span className="rounded-full bg-white px-2 py-1">{item.subject.name}</span> : null}
                    {item.task ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1">
                          <Flag size={12} />
                          截止 {daysLeftText(item.task.dueDate)}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1">{item.task.priority}</span>
                        <span className="rounded-full bg-white px-2 py-1">{item.task.level}级</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          {visibleSchedule.length === 0 ? (
            <div className="rounded-[22px] bg-cream p-5 text-center text-sm font-bold text-muted">今天暂时没有安排</div>
          ) : null}
          {todaySchedule.length > visibleSchedule.length ? (
            <button
              type="button"
              onClick={onOpenTimeline}
              className="flex h-10 w-full items-center justify-center gap-1 rounded-full bg-white text-xs font-black text-ink"
            >
              查看全部 {todaySchedule.length} 条
              <ArrowRight size={14} />
            </button>
          ) : null}
        </div>
      </section>

      <section className="today-focus-card mt-5 rounded-[28px] bg-white p-4 shadow-soft">
        <HomePomodoro
          target={focusTarget}
          focusMinutes={focusMinutes}
          sessionCount={todaySessions.length}
          onUpdateTitle={onUpdateFocusTitle}
          onCompleteSession={onCompleteSession}
          onOpenFocus={onOpenFocus}
          onOpenSettings={onOpenSettings}
        />
      </section>
    </main>
  );
}

function scheduleSortValue(entry: TodayScheduleEntry) {
  if (/^\d{2}:\d{2}$/.test(entry.time)) return entry.time;
  return entry.task?.priority === "高" ? "23:40" : "23:50";
}

function QuickStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const compactValue = value.length >= 5;

  return (
    <div className="quick-stat min-w-0 rounded-[22px] border border-white/80 bg-white p-3 shadow-soft">
      <div className="mb-2 flex items-center gap-1 text-muted">
        {icon}
        <span className="truncate text-[11px] font-black">{label}</span>
      </div>
      <p className={`break-keep font-black leading-tight text-ink ${compactValue ? "text-sm" : "text-lg"}`}>
        {value}
      </p>
    </div>
  );
}

interface FocusSettings {
  focusDuration: number;
  breakDuration: number;
  breakEvery: number;
}

const defaultFocusSettings: FocusSettings = {
  focusDuration: 30,
  breakDuration: 5,
  breakEvery: 1,
};

function formatSeconds(seconds: number) {
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function HomePomodoro({
  target,
  focusMinutes,
  sessionCount,
  onUpdateTitle,
  onCompleteSession,
  onOpenFocus,
  onOpenSettings,
}: {
  target: PomodoroTarget;
  focusMinutes: number;
  sessionCount: number;
  onUpdateTitle: (title: string) => void;
  onCompleteSession: (duration: number) => void;
  onOpenFocus: () => void;
  onOpenSettings: () => void;
}) {
  const [settings] = useStoredState<FocusSettings>("finished.focusSettings", defaultFocusSettings);
  const [secondsLeft, setSecondsLeft] = useState(() => settings.focusDuration * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) {
      setSecondsLeft(settings.focusDuration * 60);
    }
  }, [settings.focusDuration]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          onCompleteSession(settings.focusDuration);
          return settings.focusDuration * 60;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onCompleteSession, running, settings.focusDuration]);

  const completeRound = () => {
    setRunning(false);
    setSecondsLeft(settings.focusDuration * 60);
    onCompleteSession(settings.focusDuration);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-ink">首页番茄钟</p>
          <p className="mt-1 text-xs font-bold text-muted">
            今日 {minutesToText(focusMinutes)} · {sessionCount} 组
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenFocus}
            className="flex h-10 items-center gap-1 rounded-full bg-ink px-3 text-xs font-black text-white"
          >
            <ArrowRight size={14} />
            纯净模式
          </button>
          <button type="button" onClick={onOpenSettings} className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink" aria-label="设置">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 rounded-[24px] bg-[#F1F4F8] p-3">
        <div className="grid h-28 place-items-center rounded-[22px] bg-white text-center shadow-soft">
          <div>
            <p className="text-[11px] font-black text-muted">{running ? "专注中" : `${settings.focusDuration} 分钟`}</p>
            <p className="mt-1 text-3xl font-black tracking-normal text-ink">{formatSeconds(secondsLeft)}</p>
          </div>
        </div>
        <div className="min-w-0">
          <input
            value={target.taskTitle}
            onChange={(event) => onUpdateTitle(event.target.value)}
            placeholder="自定义学习任务"
            className="h-10 w-full rounded-[16px] border border-white bg-white px-3 text-sm font-black text-ink outline-none focus:border-ink/20"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRunning(true)}
              className="grid h-10 place-items-center rounded-full bg-sky text-ink shadow-pill"
              aria-label="开始番茄钟"
            >
              <Play size={16} />
            </button>
            <button
              type="button"
              onClick={() => setRunning(false)}
              className="grid h-10 place-items-center rounded-full bg-white text-ink shadow-soft"
              aria-label="暂停番茄钟"
            >
              <Pause size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(settings.focusDuration * 60);
              }}
              className="grid h-10 place-items-center rounded-full bg-white text-ink shadow-soft"
              aria-label="重置番茄钟"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={completeRound}
            className="mt-2 flex h-10 w-full items-center justify-center gap-1 rounded-full bg-mint text-xs font-black text-ink shadow-soft"
          >
            <Trophy size={15} />
            完成本轮
          </button>
        </div>
      </div>
    </div>
  );
}
