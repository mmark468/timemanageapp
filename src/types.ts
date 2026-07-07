export type CourseSystem = "A-Level" | "IB" | "AP" | "IGCSE" | "SAT" | "IELTS" | "TOEFL";

export type ExamBoard = "CAIE" | "Edexcel" | "AQA" | "OCR" | "IB" | "College Board";

export type GradeLevel = "G9" | "G10 / IGCSE" | "G11 / AS" | "G12 / A2" | "IB DP1" | "IB DP2" | "备考年";

export type SubjectName =
  | "经济"
  | "数学"
  | "心理学"
  | "计算机"
  | "英语"
  | "物理"
  | "化学"
  | "生物"
  | "商科";

export interface StudentProfile {
  name: string;
  grade: GradeLevel;
  systems: CourseSystem[];
  boards: ExamBoard[];
  subjects: string[];
  createdAt: string;
}

export type UnitStatus = "复习中" | "练习中" | "需要补" | "已完成";

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Unit {
  id: string;
  subjectId: string;
  title: string;
  progress: number;
  learningProgress?: number;
  practiceProgress?: number;
  status: UnitStatus;
  checklist: ChecklistItem[];
}

export interface Subject {
  id: string;
  name: string;
  board: ExamBoard;
  code: string;
  examTitle: string;
  examDate: string;
  mockExamTitle: string;
  mockExamDate: string;
  examStartTime?: string;
  examEndTime?: string;
  mockExamStartTime?: string;
  mockExamEndTime?: string;
  examConfigured?: boolean;
  mockExamConfigured?: boolean;
  progress: number;
  color: string;
  accent: string;
  emoji: string;
  iconKey?: StudyIconKey;
  wrongQuestions: number;
  units: Unit[];
}

export type StudyIconKey =
  | "math-basic"
  | "calculus"
  | "economics"
  | "biology"
  | "chemistry"
  | "physics"
  | "magnetism"
  | "geography"
  | "computer"
  | "design"
  | "literature"
  | "writing"
  | "psychology"
  | "language"
  | "history"
  | "business"
  | "microscope"
  | "art"
  | "music"
  | "research";

export type TaskType =
  | "大考"
  | "临时考试"
  | "考试"
  | "作业"
  | "课程"
  | "复习"
  | "错题复盘"
  | "个人安排"
  | "放假"
  | "突发事件"
  | "番茄钟任务";

export type Priority = "高" | "中" | "低";

export type TaskLevel = "S" | "A" | "B" | "C" | "D";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  subjectId?: string;
  unitId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  dueDate?: string;
  color?: string;
  priority: Priority;
  level: TaskLevel;
  completed: boolean;
}

export interface TaskSaveOptions {
  addTarget: "学习日历" | "今日时间轴" | "学校课表" | "科目进度" | "番茄钟任务";
  reminder: "无" | "提前10分钟" | "提前1小时" | "提前1天" | "自定义";
  repeat: "不重复" | "每天" | "每周" | "A/B周" | "自定义循环";
}

export interface TimetableClass {
  id: string;
  subjectId?: string;
  title: string;
  day: "周一" | "周二" | "周三" | "周四" | "周五" | "周六" | "周日";
  startTime: string;
  endTime: string;
  room: string;
  weekType: "A" | "B" | "ALL";
  color: string;
}

export interface HolidayPeriod {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
}

export interface PomodoroSession {
  id: string;
  subjectId?: string;
  unitId?: string;
  taskTitle: string;
  duration: number;
  completedAt: string;
}

export interface PomodoroTarget {
  subjectId?: string;
  unitId?: string;
  taskTitle: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: TaskType;
  date: string;
  time?: string;
  endTime?: string;
  sourceKind?: "task" | "timetable" | "exam" | "holiday";
  sourceId?: string;
  subjectId?: string;
  priority?: Priority;
  color?: string;
  description?: string;
}

export interface DailyTimelineItem {
  id: string;
  date: string;
  time: string;
  endTime: string;
  title: string;
  color: string;
  subjectId?: string;
  taskId?: string;
  sourceKind?: "task" | "timetable" | "timeline";
  sourceId?: string;
  tag?: string;
}

export type MainTab = "today" | "calendar" | "subjects" | "timetable" | "questionSearch";

export type VisualStyle = "light" | "dark";
