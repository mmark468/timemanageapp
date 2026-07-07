import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BookOpenText, CalendarDays, ClipboardList, Home, ScanSearch, School, Settings } from "lucide-react";
import { AppLayout, type DesktopNavItem } from "./components/AppLayout";
import {
  defaultPomodoroTarget,
  mockHolidays,
  mockPomodoroSessions,
  mockSubjects,
  mockTasks,
  mockTimetable,
} from "./data/mockData";
import { AddTaskPage } from "./pages/AddTaskPage";
import { CalendarPage } from "./pages/CalendarPage";
import { EditTimeBlockPage } from "./pages/EditTimeBlockPage";
import { FocusPage } from "./pages/FocusPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { QuestionSearchPage } from "./pages/QuestionSearchPage";
import { SetupTimetablePage } from "./pages/SetupTimetablePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SubjectDetailPage } from "./pages/SubjectDetailPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { StudyTasksPage } from "./pages/StudyTasksPage";
import { TimelinePage } from "./pages/TimelinePage";
import { TimetablePage } from "./pages/TimetablePage";
import { TodayPage } from "./pages/TodayPage";
import { UnitDetailPage } from "./pages/UnitDetailPage";
import { WelcomePage } from "./pages/WelcomePage";
import type {
  CalendarEvent,
  DailyTimelineItem,
  MainTab,
  HolidayPeriod,
  PomodoroSession,
  PomodoroTarget,
  StudyIconKey,
  Subject,
  StudentProfile,
  Task,
  TaskSaveOptions,
  TaskType,
  TimetableClass,
  Unit,
  UnitStatus,
  VisualStyle,
} from "./types";
import type { EditableTimeBlock, EditableTimeBlockKind } from "./pages/EditTimeBlockPage";
import { getWeekdayLabel, TODAY } from "./utils/date";
import { readStorage, useStoredState } from "./utils/storage";

type Route =
  | { name: "welcome" }
  | { name: "onboarding" }
  | { name: "setupTimetable" }
  | { name: "today" }
  | { name: "calendar" }
  | { name: "timetable" }
  | { name: "questionSearch" }
  | { name: "timeline" }
  | { name: "settings" }
  | { name: "subjects" }
  | { name: "subjectDetail"; subjectId: string }
  | { name: "unitDetail"; subjectId: string; unitId: string }
  | { name: "tasks" }
  | { name: "focus" }
  | { name: "editTimeBlock"; sourceKind: EditableTimeBlockKind; sourceId: string; date?: string }
  | { name: "addTask"; defaultType?: TaskType };

type UnitProgressValue = number | { learningProgress?: number; practiceProgress?: number };
type UnitProgressStorage = Record<string, UnitProgressValue>;
type CustomUnitsStorage = Record<string, Unit[]>;
type SubjectOverridesStorage = Record<string, Partial<Pick<Subject, "examTitle" | "examDate" | "mockExamTitle" | "mockExamDate" | "examStartTime" | "examEndTime" | "mockExamStartTime" | "mockExamEndTime" | "progress">>>;
type UnitTitleStorage = Record<string, string>;
type SubjectStudyMode = "units" | "overall";
type SubjectStudyModeStorage = Record<string, SubjectStudyMode>;
type SubjectIconStorage = Record<string, StudyIconKey>;
type StoredVisualStyle = VisualStyle | string;

const lightSubjectThemes = [
  { color: "#EFE4D8", accent: "#D4825A" },
  { color: "#DDE9E2", accent: "#2D5A4B" },
  { color: "#F1E6D8", accent: "#B86D4C" },
  { color: "#E7E4D9", accent: "#6F7E62" },
  { color: "#EEE0D2", accent: "#A25F43" },
  { color: "#DCE8E3", accent: "#2D5A4B" },
];

const darkSubjectThemes = [
  { color: "#3C2F2A", accent: "#D4825A" },
  { color: "#243B34", accent: "#8CB8A7" },
  { color: "#3A332A", accent: "#C79A6D" },
  { color: "#2D3630", accent: "#94B69F" },
  { color: "#3B2C29", accent: "#C77955" },
  { color: "#253A38", accent: "#87B7B0" },
];

function normalizeVisualStyle(value: StoredVisualStyle): VisualStyle {
  return value === "dark" ? "dark" : "light";
}

function getStatus(progress: number, fallback: UnitStatus): UnitStatus {
  if (progress >= 100) return "已完成";
  if (progress <= 42) return "需要补";
  return fallback;
}

function applyUnitProgressStorage(subjects: Subject[], storage: UnitProgressStorage): Subject[] {
  return subjects.map((subject) => {
    const units = subject.units.map((unit) => {
      const storedProgress = storage[unit.id];
      const learningProgress =
        typeof storedProgress === "number"
          ? storedProgress
          : storedProgress?.learningProgress ?? unit.learningProgress ?? unit.progress;
      const practiceProgress =
        typeof storedProgress === "number"
          ? storedProgress
          : storedProgress?.practiceProgress ?? unit.practiceProgress ?? unit.progress;
      const progress = Math.round((learningProgress + practiceProgress) / 2);

      return {
        ...unit,
        learningProgress,
        practiceProgress,
        progress,
        status: getStatus(progress, unit.status),
      };
    });

    const hasStoredUnit = units.some((unit) => typeof storage[unit.id] !== "undefined");
    const progress = hasStoredUnit
      ? Math.round(units.reduce((sum, unit) => sum + unit.progress, 0) / Math.max(units.length, 1))
      : subject.progress;

    return {
      ...subject,
      units,
      progress,
    };
  });
}

function applyVisualSubjectTheme(subjects: Subject[], visualStyle: VisualStyle): Subject[] {
  const themes = visualStyle === "dark" ? darkSubjectThemes : lightSubjectThemes;

  return subjects.map((subject, index) => ({
    ...subject,
    color: themes[index % themes.length].color,
    accent: themes[index % themes.length].accent,
  }));
}

function applySubjectOverrides(subjects: Subject[], overrides: SubjectOverridesStorage): Subject[] {
  return subjects.map((subject) => {
    const override = overrides[subject.id] ?? {};

    return {
      ...subject,
      ...override,
      examConfigured: Boolean(override.examDate || override.examTitle || override.examStartTime || override.examEndTime),
      mockExamConfigured: Boolean(
        override.mockExamDate || override.mockExamTitle || override.mockExamStartTime || override.mockExamEndTime,
      ),
    };
  });
}

function applySubjectIconOverrides(subjects: Subject[], iconStorage: SubjectIconStorage): Subject[] {
  return subjects.map((subject) => ({ ...subject, iconKey: iconStorage[subject.id] ?? subject.iconKey }));
}

function applyUnitTitleOverrides(subjects: Subject[], unitTitles: UnitTitleStorage): Subject[] {
  return subjects.map((subject) => ({
    ...subject,
    units: subject.units.map((unit) => ({ ...unit, title: unitTitles[unit.id] ?? unit.title })),
  }));
}

function mergeSubjectUnits(subjects: Subject[], customUnits: CustomUnitsStorage, deletedUnitIds: string[]): Subject[] {
  const deleted = new Set(deletedUnitIds);
  return subjects.map((subject) => ({
    ...subject,
    units: [...subject.units, ...(customUnits[subject.id] ?? [])].filter((unit) => !deleted.has(unit.id)),
  }));
}

function emptySubjectTemplate(subject: Subject): Subject {
  return {
    ...subject,
    progress: 0,
    wrongQuestions: 0,
    units: [],
  };
}

const timedCalendarTaskTypes = new Set<TaskType>(["个人安排", "大考", "临时考试", "考试", "突发事件"]);

function isTimedCalendarTask(task: Task) {
  return timedCalendarTaskTypes.has(task.type) && Boolean(task.startTime && task.endTime);
}

function buildSyncedTimeline(
  date: string,
  tasks: Task[],
  timetable: TimetableClass[],
  timelineItems: DailyTimelineItem[],
): DailyTimelineItem[] {
  const day = getWeekdayLabel(date);
  const classItems = timetable
    .filter((item) => item.day === day && item.weekType !== "B")
    .map<DailyTimelineItem>((item) => ({
      id: `timeline-course-${item.id}-${date}`,
      date,
      time: item.startTime,
      endTime: item.endTime,
      title: `${item.title} · ${item.room}`,
      color: item.color,
      subjectId: item.subjectId,
      sourceKind: "timetable",
      sourceId: item.id,
      tag: "课表",
    }));

  const taskItems = tasks
    .filter((task) => task.date === date && isTimedCalendarTask(task))
    .map<DailyTimelineItem>((task) => ({
      id: `timeline-task-${task.id}`,
      date,
      time: task.startTime ?? "09:00",
      endTime: task.endTime ?? "09:45",
      title: task.title,
      color: task.color ?? (task.type === "突发事件" ? "#FCE7F3" : "#EEF2F7"),
      subjectId: task.subjectId,
      taskId: task.id,
      sourceKind: "task",
      sourceId: task.id,
      tag: task.type === "突发事件" ? "突发" : task.type,
    }));

  const customItems = timelineItems
    .filter((item) => item.date === date && !item.taskId && !item.subjectId)
    .map((item) => ({
      ...item,
      sourceKind: "timeline" as const,
      sourceId: item.id,
      tag: item.tag ?? "事项",
    }));

  return [...classItems, ...taskItems, ...customItems].sort((a, b) => a.time.localeCompare(b.time));
}

function getActiveTab(route: Route): MainTab {
  if (route.name === "calendar") return "calendar";
  if (route.name === "timetable") return "timetable";
  if (route.name === "questionSearch") return "questionSearch";
  if (["subjects", "subjectDetail", "unitDetail"].includes(route.name)) return "subjects";
  return "today";
}

export default function App() {
  const storedProfile = readStorage<StudentProfile | null>("finished.profile", null);
  const hasOnboarded = readStorage("finished.onboarded", false);
  const initialRoute: Route = storedProfile ? (hasOnboarded ? { name: "today" } : { name: "setupTimetable" }) : { name: "welcome" };
  const [route, setRoute] = useState<Route>(initialRoute);
  const [history, setHistory] = useState<Route[]>([]);
  const [, setOnboarded] = useStoredState("finished.onboarded", hasOnboarded);
  const [profile, setProfile] = useStoredState<StudentProfile | null>("finished.profile", storedProfile);
  const [unitProgressStorage, setUnitProgressStorage] = useStoredState<UnitProgressStorage>("finished.unitProgress", {});
  const [customSubjects, setCustomSubjects] = useStoredState<Subject[]>("finished.customSubjects", []);
  const [customUnits, setCustomUnits] = useStoredState<CustomUnitsStorage>("finished.customUnits", {});
  const [deletedUnitIds, setDeletedUnitIds] = useStoredState<string[]>("finished.deletedUnitIds", []);
  const [subjectOverrides, setSubjectOverrides] = useStoredState<SubjectOverridesStorage>("finished.subjectOverrides", {});
  const [deletedExamIds, setDeletedExamIds] = useStoredState<string[]>("finished.deletedExamIds", []);
  const [subjectStudyModes, setSubjectStudyModes] = useStoredState<SubjectStudyModeStorage>("finished.subjectStudyModes", {});
  const [unitTitleOverrides, setUnitTitleOverrides] = useStoredState<UnitTitleStorage>("finished.unitTitles", {});
  const [subjectIconStorage, setSubjectIconStorage] = useStoredState<SubjectIconStorage>("finished.subjectIcons", {});
  const [storedVisualStyle, setStoredVisualStyle] = useStoredState<StoredVisualStyle>("finished.visualStyle", "light");
  const visualStyle = normalizeVisualStyle(storedVisualStyle);
  const [tasks, setTasks] = useStoredState<Task[]>("finished.tasks", []);
  const [timetable, setTimetable] = useStoredState<TimetableClass[]>("finished.timetable", []);
  const [timelineItems, setTimelineItems] = useStoredState<DailyTimelineItem[]>("finished.timeline", []);
  const [holidays, setHolidays] = useStoredState<HolidayPeriod[]>("finished.holidays", []);
  const [sessions, setSessions] = useStoredState<PomodoroSession[]>("finished.pomodoros", []);
  const [focusTarget, setFocusTarget] = useStoredState<PomodoroTarget>("finished.focusTarget", defaultPomodoroTarget);
  const [calendarDate, setCalendarDate] = useStoredState("finished.calendarDate", TODAY);
  const [toast, setToast] = useState("");

  const baseSubjects = useMemo(
    () =>
      applyVisualSubjectTheme(
        applySubjectIconOverrides(
          applySubjectOverrides(
            applyUnitTitleOverrides(
              applyUnitProgressStorage(
                mergeSubjectUnits([...mockSubjects.map(emptySubjectTemplate), ...customSubjects], customUnits, deletedUnitIds),
                unitProgressStorage,
              ),
              unitTitleOverrides,
            ),
            subjectOverrides,
          ),
          subjectIconStorage,
        ),
        visualStyle,
      ),
    [
      customSubjects,
      customUnits,
      deletedUnitIds,
      subjectIconStorage,
      subjectOverrides,
      unitProgressStorage,
      unitTitleOverrides,
      visualStyle,
    ],
  );
  const subjects = useMemo(() => {
    if (!profile) return baseSubjects;
    if (!profile.subjects.length) return [];
    const filteredSubjects = baseSubjects.filter((subject) => profile.subjects.includes(subject.name));
    return filteredSubjects;
  }, [baseSubjects, profile]);
  const selectedSubjectIds = useMemo(() => new Set(subjects.map((subject) => subject.id)), [subjects]);
  const selectedSubjectNames = useMemo(() => new Set(subjects.map((subject) => subject.name)), [subjects]);
  const visibleTasks = useMemo(
    () => tasks.filter((task) => !task.subjectId || selectedSubjectIds.has(task.subjectId)),
    [selectedSubjectIds, tasks],
  );
  const visibleTimetable = useMemo(
    () =>
      timetable.filter(
        (item) =>
          !item.subjectId ||
          selectedSubjectIds.has(item.subjectId) ||
          selectedSubjectNames.has(item.title as Subject["name"]),
      ).map((item) => ({
        ...item,
        color: subjects.find((subject) => subject.id === item.subjectId || subject.name === item.title)?.color ?? "#EEF2F7",
      })),
    [selectedSubjectIds, selectedSubjectNames, subjects, timetable],
  );
  const visibleSessions = useMemo(
    () => sessions.filter((session) => !session.subjectId || selectedSubjectIds.has(session.subjectId)),
    [selectedSubjectIds, sessions],
  );
  const syncedTodayTimeline = useMemo(
    () => buildSyncedTimeline(TODAY, visibleTasks, visibleTimetable, timelineItems),
    [timelineItems, visibleTasks, visibleTimetable],
  );

  useEffect(() => {
    const seedTimelineIds = new Set([
      "line-wake",
      "line-econ",
      "line-math",
      "line-lunch",
      "line-psych",
      "line-gym",
      "line-review",
      "line-pomodoro",
      "line-club",
    ]);
    const seedTaskIds = new Set(mockTasks.map((task) => task.id));
    const seedTimetableIds = new Set(mockTimetable.map((item) => item.id));
    const seedSessionIds = new Set(mockPomodoroSessions.map((session) => session.id));
    const seedHolidayIds = new Set(mockHolidays.map((holiday) => holiday.id));

    setTasks((current) => {
      const normalizedTasks = current
        .filter((task) => !seedTaskIds.has(task.id))
        .filter((task) => task.id !== "task-club-interview")
        .map((task) => {
          if (task.id === "task-math-mock" || task.title.toLowerCase().includes("mock")) {
            return { ...task, type: "临时考试" as const };
          }
          return task;
        });

      return normalizedTasks;
    });
    setTimetable((current) => current.filter((item) => !seedTimetableIds.has(item.id)));
    setTimelineItems((current) =>
      current.filter((item) => !seedTimelineIds.has(item.id) && item.taskId !== "task-club-interview"),
    );
    setHolidays((current) => current.filter((holiday) => !seedHolidayIds.has(holiday.id)));
    setSessions((current) => current.filter((session) => !seedSessionIds.has(session.id)));
  }, [setHolidays, setSessions, setTasks, setTimetable, setTimelineItems]);

  useEffect(() => {
    if (focusTarget.taskTitle === "做分类真题") {
      setFocusTarget({ ...focusTarget, taskTitle: "自定义学习任务" });
    }
  }, [focusTarget, setFocusTarget]);

  useEffect(() => {
    if (calendarDate < TODAY) {
      setCalendarDate(TODAY);
    }
  }, [calendarDate, setCalendarDate]);

  useEffect(() => {
    if (storedVisualStyle !== visualStyle) {
      setStoredVisualStyle(visualStyle);
    }
  }, [setStoredVisualStyle, storedVisualStyle, visualStyle]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle("theme-light", visualStyle === "light");
    root.classList.toggle("theme-dark", visualStyle === "dark");
    body.classList.toggle("theme-light", visualStyle === "light");
    body.classList.toggle("theme-dark", visualStyle === "dark");

    return () => {
      root.classList.remove("theme-light", "theme-dark");
      body.classList.remove("theme-light", "theme-dark");
    };
  }, [visualStyle]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  const navigate = (nextRoute: Route, replace = false) => {
    if (!replace) {
      setHistory((items) => [...items, route]);
    }
    setRoute(nextRoute);
  };

  const goToTab = (tab: MainTab) => {
    setHistory([]);
    if (tab === "today") setRoute({ name: "today" });
    if (tab === "calendar") setRoute({ name: "calendar" });
    if (tab === "subjects") setRoute({ name: "subjects" });
    if (tab === "timetable") setRoute({ name: "timetable" });
    if (tab === "questionSearch") setRoute({ name: "questionSearch" });
  };

  const goBack = () => {
    const previous = history[history.length - 1];
    setHistory((items) => items.slice(0, -1));
    setRoute(previous ?? { name: "today" });
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const saveProfile = (nextProfile: StudentProfile) => {
    setProfile(nextProfile);
    showToast("设置已保存");
    navigate({ name: "today" }, true);
  };

  const updateUnitProgress = (unitId: string, progress: number) => {
    const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
    setUnitProgressStorage((current) => ({
      ...current,
      [unitId]: {
        learningProgress: safeProgress,
        practiceProgress: safeProgress,
      },
    }));
  };

  const clearSubjectProgressOverride = (subjectId: string) => {
    setSubjectOverrides((current) => {
      const override = current[subjectId];
      if (!override || typeof override.progress === "undefined") return current;
      const { progress: _progress, ...nextOverride } = override;
      if (Object.keys(nextOverride).length === 0) {
        const { [subjectId]: _removed, ...rest } = current;
        return rest;
      }
      return {
        ...current,
        [subjectId]: nextOverride,
      };
    });
  };

  const setSubjectStudyMode = (subjectId: string, mode: SubjectStudyMode) => {
    setSubjectStudyModes((current) => ({ ...current, [subjectId]: mode }));
    if (mode === "units") {
      clearSubjectProgressOverride(subjectId);
    }
  };

  const updateSubjectOverallProgress = (subject: Subject, progress: number) => {
    const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
    setSubjectOverrides((current) => ({
      ...current,
      [subject.id]: {
        ...(current[subject.id] ?? {}),
        progress: safeProgress,
      },
    }));
    setUnitProgressStorage((current) => {
      const nextStorage = { ...current };
      subject.units.forEach((unit) => {
        nextStorage[unit.id] = {
          learningProgress: safeProgress,
          practiceProgress: safeProgress,
        };
      });
      return nextStorage;
    });
  };

  const updateUnitProgressPart = (unitId: string, field: "learningProgress" | "practiceProgress", progress: number) => {
    const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
    const ownerSubject = baseSubjects.find((subject) => subject.units.some((unit) => unit.id === unitId));
    if (ownerSubject) {
      clearSubjectProgressOverride(ownerSubject.id);
    }
    setUnitProgressStorage((current) => {
      const currentValue = current[unitId];
      const base =
        typeof currentValue === "number"
          ? { learningProgress: currentValue, practiceProgress: currentValue }
          : currentValue ?? {};

      return {
        ...current,
        [unitId]: {
          ...base,
          [field]: safeProgress,
        },
      };
    });
  };

  const saveTimetableClass = (item: TimetableClass) => {
    setTimetable((current) => {
      const exists = current.some((course) => course.id === item.id);
      return exists ? current.map((course) => (course.id === item.id ? item : course)) : [item, ...current];
    });
    showToast("课表已更新");
  };

  const saveTimetableSeries = (title: string, items: TimetableClass[]) => {
    setTimetable((current) => [...current.filter((item) => item.title !== title), ...items]);
    showToast("每周课表已更新");
  };

  const deleteTimetableClass = (classId: string) => {
    setTimetable((current) => current.filter((item) => item.id !== classId));
    if (classId.startsWith("tt-task-")) {
      const taskId = classId.replace("tt-task-", "");
      setTasks((current) => current.filter((item) => item.id !== taskId));
      setTimelineItems((current) => current.filter((item) => item.taskId !== taskId));
    }
    showToast("课程已删除");
  };

  const saveHoliday = (holiday: HolidayPeriod) => {
    setHolidays((current) => {
      const exists = current.some((item) => item.id === holiday.id);
      return exists ? current.map((item) => (item.id === holiday.id ? holiday : item)) : [holiday, ...current];
    });
    showToast("放假时间已保存");
  };

  const toggleTask = (taskId: string) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
    );
  };

  const setUnitAsFocus = (subject: Subject, unit: Unit) => {
    setFocusTarget({
      subjectId: subject.id,
      unitId: unit.id,
      taskTitle: "自定义学习任务",
    });
    showToast("已添加到番茄钟");
    navigate({ name: "focus" });
  };

  const addCustomSubject = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const id = `subject-${Date.now()}`;
    setCustomSubjects((current) => [
      {
        id,
        name: cleanName,
        board: "CAIE",
        code: "自定义",
        examTitle: `${cleanName} 大考`,
        examDate: "2026-06-30",
        mockExamTitle: `${cleanName} 模拟考`,
        mockExamDate: "2026-06-10",
        progress: 0,
        color: "#EEF2F7",
        accent: "#111827",
        emoji: "▣",
        iconKey: "literature",
        wrongQuestions: 0,
        units: [],
      },
      ...current,
    ]);
    setProfile((current) =>
      current
        ? {
            ...current,
            subjects: Array.from(new Set([...current.subjects, cleanName])),
          }
        : current,
    );
    showToast("科目已添加");
  };

  const updateSubjectIcon = (subjectId: string, iconKey: StudyIconKey) => {
    setSubjectIconStorage((current) => ({ ...current, [subjectId]: iconKey }));
    showToast("图标已更新");
  };

  const addCustomUnit = (subjectId: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const unit: Unit = {
      id: `unit-${subjectId}-${Date.now()}`,
      subjectId,
      title: cleanTitle,
      progress: 0,
      learningProgress: 0,
      practiceProgress: 0,
      status: "需要补",
      checklist: [],
    };
    setCustomUnits((current) => ({
      ...current,
      [subjectId]: [unit, ...(current[subjectId] ?? [])],
    }));
    showToast("单元已添加");
  };

  const deleteUnit = (unitId: string) => {
    setDeletedUnitIds((current) => Array.from(new Set([...current, unitId])));
    showToast("单元已删除");
  };

  const renameUnit = (unitId: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setUnitTitleOverrides((current) => ({ ...current, [unitId]: cleanTitle }));
    showToast("单元已更新");
  };

  const setUnitFocusMode = (subject: Subject, unit: Unit, mode: "学习" | "刷题") => {
    setFocusTarget({
      subjectId: subject.id,
      unitId: unit.id,
      taskTitle: `${subject.name} · ${unit.title} · ${mode}`,
    });
    showToast(`已标记为正在${mode}`);
  };

  const addUnitToToday = (subject: Subject, unit: Unit) => {
    const task: Task = {
      id: `task-unit-${Date.now()}`,
      title: `${subject.name} · ${unit.title}`,
      type: "复习",
      subjectId: subject.id,
      unitId: unit.id,
      date: TODAY,
      startTime: "19:00",
      endTime: "19:45",
      dueDate: TODAY,
      priority: "中",
      level: "C",
      completed: false,
    };
    setTasks((current) => [task, ...current]);
    showToast("已加入今日计划");
  };

  const startSubjectReview = (subject: Subject) => {
    setFocusTarget({
      subjectId: subject.id,
      taskTitle: "科目复习",
    });
    navigate({ name: "focus" });
  };

  const focusTask = (task: Task) => {
    setFocusTarget({
      subjectId: task.subjectId,
      unitId: task.unitId,
      taskTitle: task.title,
    });
    showToast("已添加到番茄钟");
    navigate({ name: "focus" });
  };

  const completeSession = (duration: number) => {
    const now = new Date();
    const completedAt = `${TODAY}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
      2,
      "0",
    )}:${String(now.getSeconds()).padStart(2, "0")}`;

    setSessions((current) => [
      {
        id: `pom-${Date.now()}`,
        subjectId: focusTarget.subjectId,
        unitId: focusTarget.unitId,
        taskTitle: focusTarget.taskTitle.trim() || "自定义专注",
        duration,
        completedAt,
      },
      ...current,
    ]);
    showToast("本轮专注完成啦");
  };

  const saveTask = (task: Task, options: TaskSaveOptions) => {
    if (task.type === "放假") {
      setHolidays((current) => [
        {
          id: `holiday-task-${task.id}`,
          title: task.title,
          startDate: task.date,
          endDate: task.dueDate ?? task.date,
          color: task.color ?? "#DCFCE7",
        },
        ...current,
      ]);
      showToast("假期已加入日历");
      navigate({ name: "calendar" }, true);
      return;
    }

    setTasks((current) => [task, ...current]);

    if (task.type === "课程" || options.addTarget === "学校课表") {
      const subject = subjects.find((item) => item.id === task.subjectId);
      const timetableClass: TimetableClass = {
        id: `tt-task-${task.id}`,
        subjectId: task.subjectId,
        title: task.title,
        day: getWeekdayLabel(task.date),
        startTime: task.startTime ?? "09:00",
        endTime: task.endTime ?? "09:45",
        room: "待定",
        weekType: options.repeat === "A/B周" ? "A" : "ALL",
        color: task.color ?? subject?.color ?? "#EEF2F7",
      };
      setTimetable((current) => [timetableClass, ...current]);
    }

    if (options.addTarget === "今日时间轴" || (task.date === TODAY && task.type === "突发事件")) {
      if (!isTimedCalendarTask(task)) {
        showToast("任务已按 DDL 加入日历");
        navigate({ name: "today" }, true);
        return;
      }
      const subject = subjects.find((item) => item.id === task.subjectId);
      const timelineItem: DailyTimelineItem = {
        id: `line-task-${task.id}`,
        date: task.date,
        time: task.startTime ?? "09:00",
        endTime: task.endTime ?? "09:45",
        title: task.title,
        color: task.color ?? (task.type === "突发事件" ? "#FCE7F3" : subject?.color ?? "#EEF2F7"),
        subjectId: task.subjectId,
        taskId: task.id,
      };
      setTimelineItems((current) => [timelineItem, ...current]);
    }

    if (options.addTarget === "番茄钟任务") {
      setFocusTarget({
        subjectId: task.subjectId,
        unitId: task.unitId,
        taskTitle: task.title,
      });
    }

    showToast("已添加到学习计划");
    navigate({ name: "today" }, true);
  };

  const updateTask = (task: Task) => {
    setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
    showToast("日历事项已更新");
  };

  const updateTimelineItem = (item: DailyTimelineItem) => {
    setTimelineItems((current) => current.map((timelineItem) => (timelineItem.id === item.id ? item : timelineItem)));
  };

  const deleteTask = (taskId: string) => {
    setTasks((current) => current.filter((item) => item.id !== taskId));
    setTimelineItems((current) => current.filter((item) => item.taskId !== taskId));
    setTimetable((current) => current.filter((item) => item.id !== `tt-task-${taskId}`));
    showToast("任务已删除");
  };

  const deleteTimelineItem = (itemId: string) => {
    setTimelineItems((current) => current.filter((item) => item.id !== itemId));
    showToast("时间轴事项已删除");
  };

  const deleteHoliday = (holidayId: string) => {
    setHolidays((current) => current.filter((item) => item.id !== holidayId));
    showToast("假期已删除");
  };

  const deleteExam = (examId: string) => {
    setDeletedExamIds((current) => Array.from(new Set([...current, examId])));
    showToast("考试已删除");
  };

  const saveExamBlock = (block: EditableTimeBlock) => {
    const [examKind, subjectId] = block.sourceId.split(":");
    if (!subjectId) return;
    const isMock = examKind === "mock";

    setSubjectOverrides((current) => ({
      ...current,
      [subjectId]: {
        ...(current[subjectId] ?? {}),
        ...(isMock
          ? {
              mockExamTitle: block.title.trim() || "临时考试",
              mockExamDate: block.date,
              mockExamStartTime: block.startTime,
              mockExamEndTime: block.endTime,
            }
          : {
              examTitle: block.title.trim() || "大考",
              examDate: block.date,
              examStartTime: block.startTime,
              examEndTime: block.endTime,
            }),
      },
    }));
    setDeletedExamIds((current) => current.filter((id) => id !== block.sourceId));
    showToast("考试已更新");
  };

  const saveHolidayBlock = (block: EditableTimeBlock) => {
    saveHoliday({
      id: block.sourceId,
      title: block.title.trim() || "休假",
      startDate: block.date,
      endDate: block.endDate ?? block.date,
      color: holidays.find((item) => item.id === block.sourceId)?.color ?? "#DCFCE7",
    });
  };

  const deleteCalendarEvent = (event: CalendarEvent) => {
    if (!event.sourceId) return;
    if (event.sourceKind === "task") deleteTask(event.sourceId);
    if (event.sourceKind === "timetable") deleteTimetableClass(event.sourceId);
    if (event.sourceKind === "exam") deleteExam(event.sourceId);
    if (event.sourceKind === "holiday") deleteHoliday(event.sourceId);
  };

  const deleteTimeBlock = (block: EditableTimeBlock) => {
    if (block.sourceKind === "task") {
      deleteTask(block.sourceId);
    } else if (block.sourceKind === "timetable") {
      deleteTimetableClass(block.sourceId);
    } else if (block.sourceKind === "exam") {
      deleteExam(block.sourceId);
    } else if (block.sourceKind === "holiday") {
      deleteHoliday(block.sourceId);
    } else if (block.sourceKind === "timeline") {
      deleteTimelineItem(block.sourceId);
    }
    goBack();
  };

  const getEditableTimeBlock = (): EditableTimeBlock | null => {
    if (route.name !== "editTimeBlock") return null;

    if (route.sourceKind === "task") {
      const task = tasks.find((item) => item.id === route.sourceId);
      if (!task) return null;
      const timed = isTimedCalendarTask(task);

      return {
        sourceKind: "task",
        sourceId: task.id,
        title: task.title,
        date: route.date ?? task.dueDate ?? task.date,
        startTime: task.startTime ?? "09:00",
        endTime: task.endTime ?? "09:45",
        timed,
        label: timed ? "日历日程" : "任务 DDL",
        helper: timed ? "保存后会同步到学习任务和日历时间轴。" : "任务只记录 DDL，不占用日历时间轴。",
      };
    }

    if (route.sourceKind === "exam") {
      const [examKind, subjectId] = route.sourceId.split(":");
      const subject = subjects.find((item) => item.id === subjectId);
      if (!subject) return null;
      const isMock = examKind === "mock";

      return {
        sourceKind: "exam",
        sourceId: route.sourceId,
        title: isMock ? subject.mockExamTitle : subject.examTitle,
        date: route.date ?? (isMock ? subject.mockExamDate : subject.examDate),
        startTime: isMock ? subject.mockExamStartTime ?? "14:00" : subject.examStartTime ?? "09:00",
        endTime: isMock ? subject.mockExamEndTime ?? "16:00" : subject.examEndTime ?? "11:00",
        label: isMock ? "Mock / 临时考试" : "大考",
        helper: "保存后会同步到科目页、大考倒计时和日历。",
      };
    }

    if (route.sourceKind === "holiday") {
      const holiday = holidays.find((item) => item.id === route.sourceId);
      if (!holiday) return null;

      return {
        sourceKind: "holiday",
        sourceId: holiday.id,
        title: holiday.title,
        date: holiday.startDate,
        endDate: holiday.endDate,
        startTime: "09:00",
        endTime: "10:00",
        label: "休假时间",
        helper: "休假只会暂停常规学校课表，仍然可以添加学习任务。",
      };
    }

    if (route.sourceKind === "timetable") {
      const course = timetable.find((item) => item.id === route.sourceId);
      if (!course) return null;

      return {
        sourceKind: "timetable",
        sourceId: course.id,
        title: course.title,
        date: route.date ?? TODAY,
        startTime: course.startTime,
        endTime: course.endTime,
        label: "课程时间",
        helper: "保存后会同步到课表，并自动反映到日历。",
      };
    }

    const timelineItem = timelineItems.find((item) => item.id === route.sourceId);
    if (!timelineItem) return null;

    return {
      sourceKind: "timeline",
      sourceId: timelineItem.id,
      title: timelineItem.title,
      date: timelineItem.date,
      startTime: timelineItem.time,
      endTime: timelineItem.endTime,
      label: "今日时间轴",
      helper: "保存后会同步到今日时间轴。",
    };
  };

  const saveTimeBlock = (block: EditableTimeBlock) => {
    if (block.sourceKind === "task") {
      const task = tasks.find((item) => item.id === block.sourceId);
      if (task) {
        updateTask({
          ...task,
          title: block.title.trim() || task.title,
          date: block.date,
          dueDate: block.date,
          startTime: block.timed ? block.startTime : undefined,
          endTime: block.timed ? block.endTime : undefined,
        });
        if (block.timed) {
          setTimelineItems((current) =>
            current.map((item) =>
              item.taskId === task.id
                ? {
                    ...item,
                    title: block.title.trim() || item.title,
                    date: block.date,
                    time: block.startTime,
                    endTime: block.endTime,
                  }
                : item,
            ),
          );
          setTimetable((current) =>
            current.map((item) =>
              item.id === `tt-task-${task.id}`
                ? {
                    ...item,
                    title: block.title.trim() || item.title,
                    day: getWeekdayLabel(block.date),
                    startTime: block.startTime,
                    endTime: block.endTime,
                  }
                : item,
            ),
          );
        } else {
          setTimelineItems((current) => current.filter((item) => item.taskId !== task.id));
          setTimetable((current) => current.filter((item) => item.id !== `tt-task-${task.id}`));
        }
      }
    }

    if (block.sourceKind === "timetable") {
      const course = timetable.find((item) => item.id === block.sourceId);
      if (course) {
        saveTimetableClass({
          ...course,
          title: block.title.trim() || course.title,
          day: getWeekdayLabel(block.date),
          startTime: block.startTime,
          endTime: block.endTime,
        });
      }
    }

    if (block.sourceKind === "exam") {
      saveExamBlock(block);
    }

    if (block.sourceKind === "holiday") {
      saveHolidayBlock(block);
    }

    if (block.sourceKind === "timeline") {
      const timelineItem = timelineItems.find((item) => item.id === block.sourceId);
      if (timelineItem) {
        const nextItem = {
          ...timelineItem,
          title: block.title.trim() || timelineItem.title,
          date: block.date,
          time: block.startTime,
          endTime: block.endTime,
        };
        updateTimelineItem(nextItem);

        if (nextItem.taskId) {
          const task = tasks.find((item) => item.id === nextItem.taskId);
          if (task) {
            updateTask({
              ...task,
              title: nextItem.title,
              date: nextItem.date,
              dueDate: nextItem.date,
              startTime: nextItem.time,
              endTime: nextItem.endTime,
            });
          }
        }
      }
      showToast("时间轴已更新");
    }

    goBack();
  };

  const completeOnboarding = (nextProfile: StudentProfile) => {
    setProfile(nextProfile);
    setOnboarded(false);
    setTimetable([]);
    setTasks([]);
    setTimelineItems([]);
    setHolidays([]);
    setDeletedExamIds([]);
    setSubjectStudyModes({});
    setCalendarDate(TODAY);
    setSessions([]);
    setFocusTarget(defaultPomodoroTarget);
    setHistory([]);
    setRoute({ name: "setupTimetable" });
  };

  const completeTimetableSetup = () => {
    setOnboarded(true);
    setHistory([]);
    setRoute({ name: "today" });
    showToast("你的学习空间已准备好");
  };

  const renderPage = () => {
    if (route.name === "welcome") {
      return <WelcomePage onStart={() => navigate({ name: "onboarding" })} />;
    }

    if (route.name === "onboarding") {
      return <OnboardingPage onComplete={completeOnboarding} />;
    }

    if (route.name === "setupTimetable") {
      return (
        <SetupTimetablePage
          subjects={subjects}
          timetable={visibleTimetable}
          onSaveSeries={saveTimetableSeries}
          onComplete={completeTimetableSetup}
        />
      );
    }

    if (route.name === "today") {
      return (
        <TodayPage
          studentName={profile?.name ?? "同学"}
          subjects={subjects}
          tasks={visibleTasks}
          timetable={visibleTimetable}
          timelineItems={syncedTodayTimeline}
          sessions={visibleSessions}
          focusTarget={focusTarget}
          onToggleTask={toggleTask}
          onOpenCalendar={() => navigate({ name: "calendar" })}
          onEditTimelineItem={(item) =>
            navigate({
              name: "editTimeBlock",
              sourceKind: (item.sourceKind ?? "timeline") as EditableTimeBlockKind,
              sourceId: item.sourceId ?? item.id,
              date: item.date,
            })
          }
          onAddTask={() => navigate({ name: "addTask", defaultType: "作业" })}
          onDeleteTask={deleteTask}
          onUpdateFocusTitle={(taskTitle) => setFocusTarget((current) => ({ ...current, taskTitle }))}
          onCompleteSession={completeSession}
          onOpenFocus={() => navigate({ name: "focus" })}
          onOpenQuestionSearch={() => navigate({ name: "questionSearch" })}
          onOpenSettings={() => navigate({ name: "settings" })}
        />
      );
    }

    if (route.name === "settings") {
      return (
        <SettingsPage
          profile={profile}
          subjects={baseSubjects}
          visualStyle={visualStyle}
          onVisualStyleChange={setStoredVisualStyle}
          onBack={goBack}
          onSave={saveProfile}
        />
      );
    }

    if (route.name === "calendar") {
      return (
        <CalendarPage
          subjects={subjects}
          tasks={visibleTasks}
          timetable={visibleTimetable}
          holidays={holidays}
          deletedExamIds={deletedExamIds}
          selectedDate={calendarDate}
          onSelectedDateChange={setCalendarDate}
          onEditTimeBlock={(event) =>
            navigate({
              name: "editTimeBlock",
              sourceKind: event.sourceKind as EditableTimeBlockKind,
              sourceId: event.sourceId ?? event.id,
              date: event.date,
            })
          }
          onAddTask={() => navigate({ name: "addTask" })}
        />
      );
    }

    if (route.name === "timetable") {
      return (
        <TimetablePage
          timetable={visibleTimetable}
          onSaveClass={saveTimetableClass}
          onSaveSeries={saveTimetableSeries}
          onDeleteClass={deleteTimetableClass}
        />
      );
    }

    if (route.name === "questionSearch") {
      return <QuestionSearchPage subjects={subjects} />;
    }

    if (route.name === "timeline") {
      return (
        <TimelinePage
          subjects={subjects}
          tasks={visibleTasks}
          timelineItems={syncedTodayTimeline}
          onBack={goBack}
          onEditItem={(item) =>
            navigate({
              name: "editTimeBlock",
              sourceKind: (item.sourceKind ?? "timeline") as EditableTimeBlockKind,
              sourceId: item.sourceId ?? item.id,
              date: item.date,
            })
          }
        />
      );
    }

    if (route.name === "subjects") {
      return (
        <SubjectsPage
          subjects={subjects}
          sessions={visibleSessions}
          onOpenSubject={(subjectId) => navigate({ name: "subjectDetail", subjectId })}
          onAddSubject={addCustomSubject}
        />
      );
    }

    if (route.name === "subjectDetail") {
      const subject = subjects.find((item) => item.id === route.subjectId) ?? subjects[0]!;
      return (
        <SubjectDetailPage
          subject={subject}
          sessions={visibleSessions}
          onBack={goBack}
          onOpenUnit={(unitId) => navigate({ name: "unitDetail", subjectId: subject.id, unitId })}
          onStartReview={() => startSubjectReview(subject)}
          studyMode={subjectStudyModes[subject.id] ?? "units"}
          onStudyModeChange={(mode) => setSubjectStudyMode(subject.id, mode)}
          onUpdateOverallProgress={(progress) => updateSubjectOverallProgress(subject, progress)}
          onSetUnitFocus={(unit, mode) => setUnitFocusMode(subject, unit, mode)}
          onUpdateProgress={updateUnitProgressPart}
          onAddUnit={(title) => addCustomUnit(subject.id, title)}
          onDeleteUnit={deleteUnit}
          onChangeIcon={(iconKey) => updateSubjectIcon(subject.id, iconKey)}
        />
      );
    }

    if (route.name === "unitDetail") {
      const subject = subjects.find((item) => item.id === route.subjectId) ?? subjects[0]!;
      const unit = subject.units.find((item) => item.id === route.unitId) ?? subject.units[0]!;
      return (
        <UnitDetailPage
          subject={subject}
          unit={unit}
          onBack={goBack}
          onRenameUnit={renameUnit}
          onDeleteUnit={deleteUnit}
          onUpdateProgress={updateUnitProgressPart}
          onAddToPomodoro={() => setUnitAsFocus(subject, unit)}
          onJoinToday={() => addUnitToToday(subject, unit)}
        />
      );
    }

    if (route.name === "tasks") {
      return (
        <StudyTasksPage
          tasks={visibleTasks}
          subjects={subjects}
          onBack={goBack}
          onToggleTask={toggleTask}
          onAddTask={() => navigate({ name: "addTask" })}
          onEditTask={(taskId) => navigate({ name: "editTimeBlock", sourceKind: "task", sourceId: taskId })}
          onDeleteTask={deleteTask}
          onFocusTask={focusTask}
        />
      );
    }

    if (route.name === "focus") {
      return (
        <FocusPage
          target={focusTarget}
          sessions={visibleSessions}
          onBack={goBack}
          onUpdateTargetTitle={(taskTitle) => setFocusTarget((current) => ({ ...current, taskTitle }))}
          onCompleteSession={completeSession}
        />
      );
    }

    if (route.name === "addTask") {
      return (
        <AddTaskPage
          subjects={subjects}
          defaultType={route.defaultType}
          onBack={goBack}
          onSave={saveTask}
        />
      );
    }

    if (route.name === "editTimeBlock") {
      return <EditTimeBlockPage block={getEditableTimeBlock()} onBack={goBack} onSave={saveTimeBlock} onDelete={deleteTimeBlock} />;
    }

    return null;
  };

  const showAppNavigation =
    route.name !== "welcome" && route.name !== "onboarding" && route.name !== "setupTimetable" && route.name !== "focus";
  const activeTab = getActiveTab(route);
  const desktopNavItems: DesktopNavItem[] = [
    {
      id: "today",
      label: "今天",
      description: "Dashboard",
      icon: Home,
      active: route.name === "today" || route.name === "timeline",
      onClick: () => goToTab("today"),
    },
    {
      id: "calendar",
      label: "日历",
      description: "月视图与时间轴",
      icon: CalendarDays,
      active: route.name === "calendar" || route.name === "editTimeBlock",
      onClick: () => goToTab("calendar"),
    },
    {
      id: "tasks",
      label: "任务",
      description: "DDL 与学习事项",
      icon: ClipboardList,
      active: route.name === "tasks" || route.name === "addTask",
      onClick: () => navigate({ name: "tasks" }),
    },
    {
      id: "subjects",
      label: "资料库",
      description: "本地文件查找",
      icon: BookOpenText,
      active: ["subjects", "subjectDetail", "unitDetail"].includes(route.name),
      onClick: () => goToTab("subjects"),
    },
    {
      id: "timetable",
      label: "课表",
      description: "学校周计划",
      icon: School,
      active: route.name === "timetable",
      onClick: () => goToTab("timetable"),
    },
    {
      id: "questionSearch",
      label: "搜题",
      description: "题库与资料入口",
      icon: ScanSearch,
      active: route.name === "questionSearch",
      onClick: () => goToTab("questionSearch"),
    },
    {
      id: "settings",
      label: "设置",
      description: "个人信息",
      icon: Settings,
      active: route.name === "settings",
      onClick: () => navigate({ name: "settings" }),
    },
  ];

  return (
    <div className={`theme-${visualStyle} min-h-screen`}>
      <AppLayout
        activeTab={activeTab}
        navItems={desktopNavItems}
        showNavigation={showAppNavigation}
        studentName={profile?.name}
        onTabChange={goToTab}
      >
        <div key={JSON.stringify(route)} className="page-enter min-h-screen md:h-full md:min-h-0">
          {renderPage()}
        </div>
      </AppLayout>

      {toast ? (
        <div className="fixed left-1/2 top-5 z-40 w-[calc(100%_-_40px)] max-w-[360px] -translate-x-1/2 rounded-full bg-ink px-4 py-3 text-center text-sm font-black text-white shadow-soft md:max-w-[420px]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
