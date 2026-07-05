import { ChevronLeft, ChevronRight, Globe2, LocateFixed, Plus } from "lucide-react";
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
  onAddTask: () => void;
}

const hours = Array.from({ length: 24 }, (_, index) => index);
const hourHeight = 72;
const datePillStep = 66;
const timeColumnWidth = 48;
const deadlineTaskTypes = new Set<TaskType>(["作业", "复习", "错题复盘"]);
const timedTaskTypes = new Set<TaskType>(["个人安排", "大考", "临时考试", "考试", "突发事件"]);

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
    specialEvents: monthEvents.filter((event) => event.type === "突发事件").length,
    holidays: holidays.filter((holiday) => isSameMonth(holiday.startDate, year, month)).length,
  };
}

function eventCategory(event: CalendarEvent) {
  if (event.type === "课程") return "课程";
  if (deadlineTaskTypes.has(event.type)) return "DDL";
  if (["个人安排", "放假", "突发事件"].includes(event.type)) return "生活";
  return "学习";
}

function isDeadlineTaskType(type: TaskType) {
  return deadlineTaskTypes.has(type);
}

function isTimedTaskType(type: TaskType) {
  return timedTaskTypes.has(type);
}

function isExamEvent(event: CalendarEvent) {
  return event.type === "大考" || event.type === "临时考试" || event.type === "考试";
}

function isSpecialEvent(event: CalendarEvent) {
  return event.type === "突发事件";
}

function isChineseHoliday(title?: string) {
  if (!title) return false;
  return /元旦|春节|除夕|清明|劳动|五一|端午|中秋|国庆|寒假|暑假|调休|法定|中国/.test(title);
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
      const isTimed = isTimedTaskType(type) && Boolean(task.startTime && task.endTime);
      const isDeadline = isDeadlineTaskType(type);

      return {
        id: task.id,
        title: task.title,
        type,
        date: eventDate,
        time: isTimed ? task.startTime : undefined,
        endTime: isTimed ? task.endTime : undefined,
        sourceKind: "task" as const,
        sourceId: task.id,
        subjectId: task.subjectId,
        priority: task.priority,
        color: task.color,
        description:
          isDeadline
            ? `Deadline：${daysLeftText(eventDate)}`
            : isTimed && task.startTime && task.endTime
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
  const selectedMonthCells = useMemo(
    () => getMonthDays(selectedMonth.year, selectedMonth.month),
    [selectedMonth.month, selectedMonth.year],
  );
  const selectedMonthDates = useMemo(
    () => selectedMonthCells.filter(Boolean) as string[],
    [selectedMonthCells],
  );
  const events = useMemo(
    () => buildEvents(subjects, tasks, timetable, holidays, deletedExamIds, selectedDate),
    [deletedExamIds, holidays, selectedDate, subjects, tasks, timetable],
  );
  const selectedEvents = sortEvents(events.filter((event) => event.date === selectedDate));
  const deadlineSelectedEvents = selectedEvents.filter((event) => !event.time && event.type !== "放假");
  const timedSelectedEvents = selectedEvents.filter((event) => event.time);
  const selectedHoliday = holidayForDate(holidays, selectedDate);
  const showCurrentTime = selectedDate === TODAY && currentMinutes >= 0 && currentMinutes <= 24 * 60;
  const currentTimeTop = (currentMinutes / 60) * hourHeight;
  const monthSummary = getMonthSummary(events, holidays, selectedMonth.year, selectedMonth.month);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " "), []);
  const greeting = greetingForCurrentTime();

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
    <main className="calendar-page bg-cream px-4 pb-32 pt-6 text-ink md:grid md:grid-cols-1 md:items-start md:gap-5 md:px-6 md:pb-8 md:pt-6 lg:h-full lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden lg:px-7 xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="calendar-manager-sidebar min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:pr-1">
        <section className="calendar-overview-card mb-4 rounded-[32px] p-5 shadow-soft md:mb-0 lg:hidden">
          <div className="mb-7 flex items-start justify-between gap-3 lg:mb-5">
            <div>
              <p className="text-sm font-black text-white/80">{greeting}</p>
              <h1 className="mt-1 text-3xl font-black leading-tight tracking-normal text-white lg:text-2xl">日历管理</h1>
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
                {timedSelectedEvents.length} 日程 · {deadlineSelectedEvents.length + (selectedHoliday ? 1 : 0)} DDL
              </p>
            </div>
          </div>
        </section>

        <section className="mb-3 rounded-[28px] border border-white/80 bg-white p-4 shadow-soft md:mb-0 lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
          <div className="mb-4 flex items-center justify-between gap-3 lg:flex-none">
            <div>
              <p className="text-xs font-black text-muted">选择月份和日期</p>
              <h2 className="text-3xl font-black tracking-normal text-ink">
                {selectedMonth.year}年{selectedMonth.month}月
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

          <div className="hidden min-h-0 lg:flex lg:flex-1 lg:flex-col">
            <div className="mb-2 grid grid-cols-7 gap-1.5 px-1 text-center text-[10px] font-black text-muted">
              {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1.5">
              {selectedMonthCells.map((date, index) => {
                if (!date) {
                  return <span key={`blank-${index}`} className="min-h-0" aria-hidden />;
                }

                const holiday = holidayForDate(holidays, date);
                const dateEvents = events.filter((event) => event.date === date);
                const hasTimedEvent = dateEvents.some((event) => event.time);
                const hasDeadline = dateEvents.some((event) => !event.time && event.type !== "放假");
                const hasExam = dateEvents.some(isExamEvent);
                const hasSpecial = dateEvents.some(isSpecialEvent);
                const holidayTitle = holiday?.title ?? dateEvents.find((event) => event.type === "放假")?.title;
                const chinaHoliday = isChineseHoliday(holidayTitle);
                const active = date === selectedDate;
                const activeMarkerClass = active ? "bg-white/25 text-white ring-1 ring-white/30" : "";

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => onSelectedDateChange(date)}
                    className={`calendar-month-date-button flex min-h-0 flex-col items-center justify-center rounded-[16px] text-sm font-black transition ${
                      active
                        ? "calendar-date-pill-active text-white"
                        : holiday
                          ? "calendar-date-pill-holiday text-ink"
                          : isWeekendDate(date)
                            ? "calendar-date-pill-weekend text-ink"
                            : "bg-cream text-ink"
                    }`}
                  >
                    <span>{Number(date.slice(-2))}</span>
                    <span className="mt-0.5 flex justify-center gap-0.5">
                      {hasTimedEvent ? <i className={`h-1 w-1 rounded-full ${active ? "bg-white" : "bg-muted/50"}`} /> : null}
                      {hasDeadline ? <i className={`h-1 w-1 rounded-full ${active ? "bg-white/70" : "bg-[#D4825A]"}`} /> : null}
                    </span>
                    <span className="mt-1 flex flex-wrap justify-center gap-1 px-1">
                      {holiday ? (
                        <span className={`calendar-date-marker calendar-date-marker--holiday ${activeMarkerClass}`}>
                          {chinaHoliday ? "中假" : "假"}
                        </span>
                      ) : null}
                      {hasExam ? (
                        <span className={`calendar-date-marker calendar-date-marker--exam ${activeMarkerClass}`}>考</span>
                      ) : null}
                      {hasSpecial ? (
                        <span className={`calendar-date-marker calendar-date-marker--special ${activeMarkerClass}`}>特</span>
                      ) : null}
                      {hasDeadline ? (
                        <span className={`calendar-date-marker calendar-date-marker--ddl ${activeMarkerClass}`}>DDL</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-black">
              <span className="calendar-date-marker calendar-date-marker--holiday">中假/假期</span>
              <span className="calendar-date-marker calendar-date-marker--exam">考试</span>
              <span className="calendar-date-marker calendar-date-marker--special">特别事项</span>
              <span className="calendar-date-marker calendar-date-marker--ddl">DDL</span>
            </div>

            <div className="mt-4 grid flex-none grid-cols-3 gap-2">
              <div className="rounded-[18px] bg-cream p-3">
                <p className="text-[10px] font-black text-muted">本月考试</p>
                <p className="mt-1 text-xl font-black text-ink">{monthSummary.majorExams + monthSummary.temporaryExams}</p>
              </div>
              <div className="rounded-[18px] bg-cream p-3">
                <p className="text-[10px] font-black text-muted">特别</p>
                <p className="mt-1 text-xl font-black text-ink">{monthSummary.specialEvents}</p>
              </div>
              <div className="rounded-[18px] bg-cream p-3">
                <p className="text-[10px] font-black text-muted">假期</p>
                <p className="mt-1 text-xl font-black text-ink">{monthSummary.holidays}</p>
              </div>
            </div>
          </div>
        </section>
      </aside>

      <section
        className="calendar-gantt-card overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-soft md:min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onWheel={handleMonthWheel}
      >
        <div className="calendar-desktop-heading hidden border-b border-black/5 p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch lg:gap-3">
          <div className="calendar-overview-card min-w-0 rounded-[26px] p-4 shadow-none">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-white/80">{greeting}</p>
                <h2 className="mt-1 truncate text-2xl font-black leading-tight text-white">
                  {selectedDate} · {getWeekdayLabel(selectedDate)}
                </h2>
                <p className="mt-2 truncate text-xs font-black text-white/70">
                  <Globe2 className="mr-1 inline" size={13} />
                  {timezone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black leading-none text-white">{Number(selectedDate.slice(-2))}</p>
                <p className="mt-2 text-sm font-black text-white/80">
                  {timedSelectedEvents.length} 日程 · {deadlineSelectedEvents.length + (selectedHoliday ? 1 : 0)} DDL
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-2 rounded-[24px] bg-cream p-3">
            <button
              type="button"
              onClick={jumpToToday}
              className="calendar-month-button h-11 w-11"
              aria-label="回到今天"
            >
              <LocateFixed size={18} />
            </button>
            <button
              type="button"
              onClick={onAddTask}
              className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white"
              aria-label="新增日程"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="calendar-date-strip border-b border-black/5 px-3 pb-3 pt-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-black text-ink">{selectedDate}</p>
            <div className="flex gap-1.5 text-[11px] font-black text-muted">
              <span>{timedSelectedEvents.length} 日程</span>
              <span>·</span>
              <span>{deadlineSelectedEvents.length} DDL</span>
              <span>·</span>
              <span>{monthSummary.majorExams + monthSummary.temporaryExams} 考试</span>
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

        <div className="calendar-ddl-lane border-b border-black/5 px-3 py-3 lg:px-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-black text-muted">DDL / 全天</p>
            <span className="rounded-full bg-cream px-2 py-1 text-[10px] font-black text-muted">
              {deadlineSelectedEvents.length + (selectedHoliday ? 1 : 0)} 项
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {selectedHoliday || deadlineSelectedEvents.length > 0 ? (
              <>
                {selectedHoliday ? (
                  <span className="shrink-0 rounded-full bg-[#DCFCE7] px-3 py-2 text-xs font-black text-[#166534]">
                    {selectedHoliday.title}
                  </span>
                ) : null}
                {deadlineSelectedEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEventEditor(event)}
                    className="shrink-0 rounded-full px-3 py-2 text-xs font-black"
                    style={{ backgroundColor: event.color ?? eventBg[event.type], color: eventColor[event.type] }}
                  >
                    <span className="mr-1 opacity-70">{isDeadlineTaskType(event.type) ? "DDL" : event.type}</span>
                    {event.title}
                  </button>
                ))}
              </>
            ) : (
              <span className="shrink-0 rounded-full bg-cream px-3 py-2 text-xs font-black text-muted">
                这一天没有 DDL
              </span>
            )}
          </div>
        </div>

        <div className="calendar-time-scroll min-h-0 overflow-y-auto lg:flex-1">
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
                  这一天还没有带时间的日程
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        aria-label="快捷添加日程"
        onClick={onAddTask}
        className="calendar-add-fab lg:hidden"
      >
        <Plus size={26} />
      </button>
    </main>
  );
}
