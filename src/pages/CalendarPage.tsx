import { ChevronLeft, ChevronRight, Globe2, LocateFixed, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import type { CalendarEvent, HolidayPeriod, Subject, Task, TaskType, TimetableClass } from "../types";
import { daysLeftText, getMonthDays, getWeekdayLabel, TODAY, toDate } from "../utils/date";

interface CalendarPageProps {
  subjects: Subject[];
  tasks: Task[];
  timetable: TimetableClass[];
  holidays: HolidayPeriod[];
  deletedExamIds: string[];
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  onEditTimeBlock: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  onAddTask: () => void;
}

const hours = Array.from({ length: 24 }, (_, index) => index);
const hourHeight = 58;
const datePillStep = 66;
const timeColumnWidth = 48;

const eventColor: Record<TaskType, string> = {
  大考: "#B45E4D",
  临时考试: "#B97946",
  考试: "#B97946",
  作业: "#D4825A",
  课程: "#2D5A4B",
  复习: "#6F7E62",
  错题复盘: "#A25F43",
  个人安排: "#7C6D5E",
  放假: "#4D7C63",
  突发事件: "#B85E68",
  番茄钟任务: "#8C6A4C",
};

const eventBg: Record<TaskType, string> = {
  大考: "#F2D7CF",
  临时考试: "#F1DEC1",
  考试: "#F1DEC1",
  作业: "#F0D8C8",
  课程: "#DDE8E2",
  复习: "#E7E4D9",
  错题复盘: "#EEDACB",
  个人安排: "#E6DED5",
  放假: "#D9E8DD",
  突发事件: "#EED5D9",
  番茄钟任务: "#E7DDD0",
};

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date: string, days: number) {
  const value = toDate(date);
  value.setDate(value.getDate() + days);
  return formatDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

function monthFromDate(date: string) {
  const value = toDate(date);
  return { year: value.getFullYear(), month: value.getMonth() + 1 };
}

function shiftMonthDate(date: string, delta: number) {
  const value = toDate(date);
  const day = value.getDate();
  const targetFirstDay = new Date(value.getFullYear(), value.getMonth() + delta, 1);
  const targetYear = targetFirstDay.getFullYear();
  const targetMonth = targetFirstDay.getMonth() + 1;
  const targetDay = Math.min(day, new Date(targetYear, targetMonth, 0).getDate());
  return formatDate(targetYear, targetMonth, targetDay);
}

function timeToMinutes(time?: string) {
  if (!time) return 0;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToClock(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isWithin(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function holidayForDate(holidays: HolidayPeriod[], date: string) {
  return holidays.find((holiday) => isWithin(date, holiday.startDate, holiday.endDate));
}

function isWeekendDate(date: string) {
  const weekday = getWeekdayLabel(date);
  return weekday === "周六" || weekday === "周日";
}

function normalizeTaskType(task: Task): TaskType {
  if (task.type === "考试") return "临时考试";
  return task.type;
}

function isSameMonth(date: string, year: number, month: number) {
  return date.startsWith(`${year}-${String(month).padStart(2, "0")}`);
}

function getMonthSummary(events: CalendarEvent[], holidays: HolidayPeriod[], year: number, month: number) {
  const monthEvents = events.filter((event) => isSameMonth(event.date, year, month));
  return {
    majorExams: monthEvents.filter((event) => event.type === "大考").length,
    temporaryExams: monthEvents.filter((event) => event.type === "临时考试" || event.type === "考试").length,
    holidays: holidays.filter((holiday) => isSameMonth(holiday.startDate, year, month)).length,
  };
}

function eventCategory(event: CalendarEvent) {
  if (event.type === "课程") return "课程";
  if (["作业", "大考", "临时考试", "考试"].includes(event.type)) return "DDL";
  if (["个人安排", "放假", "突发事件"].includes(event.type)) return "生活";
  return "学习";
}

function greetingForCurrentTime() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了，慢慢收尾";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function buildEvents(
  subjects: Subject[],
  tasks: Task[],
  timetable: TimetableClass[],
  holidays: HolidayPeriod[],
  deletedExamIds: string[],
  selectedDate: string,
): CalendarEvent[] {
  const deletedExams = new Set(deletedExamIds);
  const examEvents = subjects.flatMap((subject) => {
    const events: CalendarEvent[] = [];

    if (subject.examConfigured) {
      events.push({
        id: `major-${subject.id}`,
        title: subject.examTitle,
        type: "大考",
        date: subject.examDate,
        sourceKind: "exam",
        sourceId: `major:${subject.id}`,
        subjectId: subject.id,
        time: subject.examStartTime ?? "09:00",
        endTime: subject.examEndTime ?? "11:00",
        description: `${subject.board} ${subject.code} · ${subject.examStartTime ?? "09:00"}-${subject.examEndTime ?? "11:00"}`,
      });
    }

    if (subject.mockExamConfigured) {
      events.push({
        id: `mock-${subject.id}`,
        title: subject.mockExamTitle,
        type: "临时考试",
        date: subject.mockExamDate,
        sourceKind: "exam",
        sourceId: `mock:${subject.id}`,
        subjectId: subject.id,
        time: subject.mockExamStartTime ?? "14:00",
        endTime: subject.mockExamEndTime ?? "16:00",
        description: `模拟 / 临时考试 · ${subject.mockExamStartTime ?? "14:00"}-${subject.mockExamEndTime ?? "16:00"}`,
      });
    }

    return events.filter((event) => event.sourceId && !deletedExams.has(event.sourceId));
  });

  const holidayEvents = holidays.flatMap((holiday) => {
    const start = toDate(holiday.startDate);
    const end = toDate(holiday.endDate);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

    return Array.from({ length: days }, (_, index) => ({
      id: `${holiday.id}-${index}`,
      title: holiday.title,
      type: "放假" as const,
      date: addDays(holiday.startDate, index),
      sourceKind: "holiday" as const,
      sourceId: holiday.id,
      color: holiday.color,
      description: `${holiday.startDate} 至 ${holiday.endDate}`,
    }));
  });

  const taskEvents = tasks
    .filter((task) => task.type !== "课程" && task.type !== "番茄钟任务" && task.id !== "task-math-mock")
    .map((task) => {
      const type = normalizeTaskType(task);
      const eventDate = task.dueDate ?? task.date;

      return {
        id: task.id,
        title: task.title,
        type,
        date: eventDate,
        time: task.startTime,
        endTime: task.endTime,
        sourceKind: "task" as const,
        sourceId: task.id,
        subjectId: task.subjectId,
        priority: task.priority,
        color: task.color,
        description:
          type === "作业"
            ? `Deadline：${daysLeftText(eventDate)}`
            : task.startTime && task.endTime
              ? `${task.startTime}-${task.endTime}`
              : undefined,
      };
    });

  const classEvents: CalendarEvent[] = [];
  const selectedMonth = monthFromDate(selectedDate);
  const monthDays = getMonthDays(selectedMonth.year, selectedMonth.month).filter(Boolean) as string[];
  monthDays.forEach((date) => {
    if (holidayForDate(holidays, date)) return;
    const day = getWeekdayLabel(date);
    timetable
      .filter((item) => item.day === day && item.weekType !== "B")
      .forEach((item) => {
        classEvents.push({
          id: `${item.id}-${date}`,
          title: item.title,
          type: "课程",
          date,
          time: item.startTime,
          endTime: item.endTime,
          sourceKind: "timetable",
          sourceId: item.id,
          subjectId: item.subjectId,
          description: `${item.startTime}-${item.endTime} · ${item.room}`,
        });
      });
  });

  return [...examEvents, ...holidayEvents, ...classEvents, ...taskEvents];
}

function sortEvents(events: CalendarEvent[]) {
  const order: Record<string, number> = { 放假: 0, 大考: 1, 突发事件: 2, 临时考试: 3, 课程: 4 };
  return [...events].sort((a, b) => {
    const rankDiff = (order[a.type] ?? 9) - (order[b.type] ?? 9);
    if (rankDiff !== 0) return rankDiff;
    return (a.time ?? "00:00").localeCompare(b.time ?? "00:00");
  });
}

function eventStyle(event: CalendarEvent): CSSProperties {
  const start = timeToMinutes(event.time);
  const end = timeToMinutes(event.endTime) || start + 45;
  const top = Math.max(0, (start / 60) * hourHeight);
  const height = Math.max(42, ((end - start) / 60) * hourHeight);

  return {
    top,
    height,
    "--event-bg": event.color ?? eventBg[event.type],
    "--event-accent": eventColor[event.type],
  } as CSSProperties;
}

export function CalendarPage({
  subjects,
  tasks,
  timetable,
  holidays,
  deletedExamIds,
  selectedDate,
  onSelectedDateChange,
  onEditTimeBlock,
  onDeleteEvent,
  onAddTask,
}: CalendarPageProps) {
  const calendarScrollerRef = useRef<HTMLDivElement | null>(null);
  const hasAlignedInitialDate = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const wheelLockRef = useRef(0);
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const selectedMonth = useMemo(() => monthFromDate(selectedDate), [selectedDate]);
  const selectedMonthDates = useMemo(
    () => getMonthDays(selectedMonth.year, selectedMonth.month).filter(Boolean) as string[],
    [selectedMonth.month, selectedMonth.year],
  );
  const events = useMemo(
    () => buildEvents(subjects, tasks, timetable, holidays, deletedExamIds, selectedDate),
    [deletedExamIds, holidays, selectedDate, subjects, tasks, timetable],
  );
  const selectedEvents = sortEvents(events.filter((event) => event.date === selectedDate));
  const allDaySelectedEvents = selectedEvents.filter((event) => !event.time);
  const timedSelectedEvents = selectedEvents.filter((event) => event.time);
  const selectedHoliday = holidayForDate(holidays, selectedDate);
  const showCurrentTime = selectedDate === TODAY && currentMinutes >= 0 && currentMinutes <= 24 * 60;
  const currentTimeTop = (currentMinutes / 60) * hourHeight;
  const monthSummary = getMonthSummary(events, holidays, selectedMonth.year, selectedMonth.month);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "), []);
  const greeting = greetingForCurrentTime();
  const nextEvent = timedSelectedEvents[0] ?? allDaySelectedEvents[0];

  const alignDateInScroller = useCallback(
    (date: string, behavior: ScrollBehavior = "smooth") => {
      const activeIndex = selectedMonthDates.indexOf(date);
      const scroller = calendarScrollerRef.current;
      if (activeIndex < 0 || !scroller) return;

      scroller.scrollTo({
        left: Math.max(0, activeIndex * datePillStep - datePillStep * 2.5),
        behavior,
      });
    },
    [selectedMonthDates],
  );

  useLayoutEffect(() => {
    alignDateInScroller(selectedDate, hasAlignedInitialDate.current ? "smooth" : "auto");
    hasAlignedInitialDate.current = true;
  }, [alignDateInScroller, selectedDate]);

  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    };

    updateCurrentTime();
    const timer = window.setInterval(updateCurrentTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const jumpToToday = () => {
    onSelectedDateChange(TODAY);
    window.requestAnimationFrame(() => alignDateInScroller(TODAY));
  };

  const goToAdjacentMonth = useCallback(
    (direction: 1 | -1) => {
      onSelectedDateChange(shiftMonthDate(selectedDate, direction));
    },
    [onSelectedDateChange, selectedDate],
  );

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    goToAdjacentMonth(deltaX > 0 ? 1 : -1);
  };

  const handleMonthWheel = (event: WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaX) < 42 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
    const now = Date.now();
    if (now - wheelLockRef.current < 650) return;
    wheelLockRef.current = now;
    goToAdjacentMonth(event.deltaX > 0 ? 1 : -1);
  };

  const openEventEditor = (event: CalendarEvent) => {
    if (!event.sourceId || !["task", "timetable", "exam", "holiday"].includes(event.sourceKind ?? "")) {
      return;
    }

    onSelectedDateChange(event.date);
    onEditTimeBlock(event);
  };

  return (
    <main className="calendar-page bg-cream px-4 pb-32 pt-6 text-ink">
      <div className="calendar-desktop-grid">
      <section className="calendar-overview-card mb-4 rounded-[32px] p-5 shadow-soft">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-white/80">{greeting}</p>
            <h1 className="mt-1 text-3xl font-black leading-tight tracking-normal text-white">今天的节奏</h1>
          </div>
          <button
            type="button"
            onClick={jumpToToday}
            className="calendar-today-button flex h-10 items-center gap-1 rounded-full px-3 text-xs font-black text-white"
          >
            <LocateFixed size={15} />
            今天
          </button>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <p className="text-5xl font-black leading-none tracking-normal text-white">{Number(selectedDate.slice(-2))}</p>
            <p className="mt-2 text-sm font-black text-white/78">
              {selectedMonth.year}年{selectedMonth.month}月 · {getWeekdayLabel(selectedDate)}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-xs font-black text-white/72">
              <Globe2 className="mr-1 inline" size={13} />
              {timezone}
            </p>
            <p className="mt-2 text-sm font-black text-white">
              {nextEvent ? `下一段 ${nextEvent.time ?? "全天"}` : "今天留白"}
            </p>
          </div>
        </div>
      </section>

      <div className="calendar-month-header mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-black text-muted">每日计划</p>
          <h2 className="text-3xl font-black tracking-normal text-ink">
            {selectedMonth.month}月
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="上个月" onClick={() => goToAdjacentMonth(-1)} className="calendar-month-button">
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="下个月" onClick={() => goToAdjacentMonth(1)} className="calendar-month-button">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <section
        className="calendar-gantt-card overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-soft"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onWheel={handleMonthWheel}
      >
        <div className="calendar-date-strip border-b border-black/5 px-3 pb-3 pt-3">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-black text-ink">{selectedDate}</p>
            <div className="flex gap-1.5 text-[11px] font-black text-muted">
              <span>{timedSelectedEvents.length} 定时</span>
              <span>·</span>
              <span>{monthSummary.majorExams + monthSummary.temporaryExams} 考试</span>
              <span>·</span>
              <span>{monthSummary.holidays} 假期</span>
            </div>
          </div>

          <div ref={calendarScrollerRef} className="overflow-x-auto pb-1 hide-scrollbar">
            <div className="flex gap-2">
              {selectedMonthDates.map((date) => {
                const holiday = holidayForDate(holidays, date);
                const dateEvents = events.filter((event) => event.date === date);
                const hasMajorExam = dateEvents.some((event) => event.type === "大考");
                const hasTimedEvent = dateEvents.some((event) => event.time);
                const active = date === selectedDate;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onSelectedDateChange(date)}
                    className={`calendar-date-pill min-w-[58px] rounded-[20px] border px-2 py-2 text-center transition ${
                      active
                        ? "calendar-date-pill-active border-ink bg-ink text-white"
                        : holiday
                          ? "calendar-date-pill-holiday border-[#BBF7D0] bg-[#F0FDF4] text-ink"
                          : isWeekendDate(date)
                            ? "calendar-date-pill-weekend border-white/80 bg-[#F8FAFC] text-ink"
                            : "calendar-date-pill-default border-white/80 bg-cream text-ink"
                    }`}
                  >
                    <span className={`block text-[11px] font-black ${active ? "text-white/70" : "text-muted"}`}>
                      {getWeekdayLabel(date).replace("周", "")}
                    </span>
                    <span className="mt-1 block text-lg font-black leading-none">{Number(date.slice(-2))}</span>
                    <div className="mt-2 flex h-1.5 justify-center gap-1">
                      {date === TODAY ? (
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-ink"}`} />
                      ) : null}
                      {hasTimedEvent ? (
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white/70" : "bg-muted/40"}`} />
                      ) : null}
                      {hasMajorExam ? <span className="h-1.5 w-1.5 rounded-full bg-[#D94747]" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {allDaySelectedEvents.length > 0 || selectedHoliday ? (
          <div className="border-b border-black/5 px-3 py-3">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {selectedHoliday ? (
                <span className="shrink-0 rounded-full bg-[#DCFCE7] px-3 py-2 text-xs font-black text-[#166534]">
                  {selectedHoliday.title}
                </span>
              ) : null}
              {allDaySelectedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEventEditor(event)}
                  className="shrink-0 rounded-full px-3 py-2 text-xs font-black"
                  style={{ backgroundColor: event.color ?? eventBg[event.type], color: eventColor[event.type] }}
                >
                  {event.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="calendar-time-grid grid grid-cols-[48px_minmax(0,1fr)]">
          <div className="calendar-time-column bg-white" style={{ width: timeColumnWidth }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="calendar-hour-label border-t border-black/5 pr-1 text-right text-[10px] font-bold text-muted"
                style={{ height: hourHeight }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          <div
            className={`calendar-timeline-surface relative min-w-0 ${
              selectedHoliday ? "calendar-timeline-holiday bg-[#F0FDF4]" : isWeekendDate(selectedDate) ? "calendar-timeline-weekend bg-[#F8FAFC]" : "bg-white"
            }`}
            style={{ height: hours.length * hourHeight }}
          >
            {hours.map((hour) => (
              <div key={hour} className="calendar-hour-line border-t border-black/5" style={{ height: hourHeight }} />
            ))}

            {showCurrentTime ? (
              <div className="calendar-current-time-line absolute left-0 right-0 z-30" style={{ top: currentTimeTop }}>
                <span className="absolute -left-[48px] -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[10px] font-black text-white shadow-pill">
                  {minutesToClock(currentMinutes)}
                </span>
                <span className="absolute -left-1 top-0 h-2.5 w-2.5 -translate-y-1/2 rounded-full" />
                <span className="block h-[2px] w-full -translate-y-1/2" />
              </div>
            ) : null}

            {timedSelectedEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => openEventEditor(event)}
                data-category={eventCategory(event)}
                className="calendar-event-block absolute left-2 right-2 overflow-hidden rounded-[16px] px-3 py-2 text-left text-sm font-black leading-tight text-ink shadow-pill ring-1 ring-white/70"
                style={eventStyle(event)}
              >
                <span className="block truncate">{event.title}</span>
                <span className="mt-1 block truncate text-[11px] font-bold opacity-70">
                  {event.time}-{event.endTime} · {event.type}
                </span>
              </button>
            ))}

            {timedSelectedEvents.length === 0 ? (
              <div className="calendar-empty-slot absolute inset-x-3 top-5 rounded-[22px] bg-white/75 p-5 text-center text-sm font-bold text-muted">
                这一天还没有定时计划
              </div>
            ) : null}
          </div>
        </div>
      </section>


      <section className="calendar-detail-card mt-3 overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-soft">
        <div className="px-4 py-3 text-sm font-black text-muted">{selectedDate} 详情</div>
        {selectedEvents.length > 0 ? (
          selectedEvents.map((event) => {
            const editable = Boolean(event.sourceId) && ["task", "timetable", "exam", "holiday"].includes(event.sourceKind ?? "");
            const deletable =
              event.sourceKind === "task" ||
              event.sourceKind === "timetable" ||
              event.sourceKind === "exam" ||
              event.sourceKind === "holiday";

            return (
              <div key={event.id} className="flex items-stretch gap-2 border-t border-black/5 px-3 py-2">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => openEventEditor(event)}
                  className={`flex min-w-0 flex-1 gap-3 rounded-[18px] px-1 py-1 text-left ${editable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="w-14 shrink-0 text-sm font-black" style={{ color: eventColor[event.type] }}>
                    {event.time ?? event.type}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black">{event.title}</p>
                    <p className="mt-1 truncate text-xs font-bold text-muted">
                      {event.endTime ? `${event.time}-${event.endTime} · ` : ""}
                      {event.description ??
                        (event.subjectId ? subjects.find((subject) => subject.id === event.subjectId)?.name : "个人事项")}
                    </p>
                  </div>
                </button>
                {deletable ? (
                <button
                  type="button"
                  onClick={() => onDeleteEvent(event)}
                    className="grid h-10 w-10 shrink-0 place-items-center self-center rounded-full bg-[#FEE2E2] text-[#B91C1C]"
                    aria-label="删除事项"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="border-t border-black/5 py-5 text-center text-sm font-bold text-muted">当天暂无事项</div>
        )}
      </section>
      </div>

      <button
        type="button"
        aria-label="快捷添加日程"
        onClick={onAddTask}
        className="calendar-add-fab"
      >
        <Plus size={26} />
      </button>
    </main>
  );
}
