import { Palette, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import type { Priority, Subject, Task, TaskLevel, TaskSaveOptions, TaskType } from "../types";
import { TODAY } from "../utils/date";

interface AddTaskPageProps {
  subjects: Subject[];
  defaultType?: TaskType;
  onBack: () => void;
  onSave: (task: Task, options: TaskSaveOptions) => void;
}

const taskTypes: TaskType[] = [
  "个人安排",
  "作业",
  "复习",
  "课程",
  "大考",
  "临时考试",
  "放假",
  "突发事件",
  "错题复盘",
  "番茄钟任务",
];
const priorities: Priority[] = ["高", "中", "低"];
const addTargets: TaskSaveOptions["addTarget"][] = ["学习日历", "今日时间轴", "学校课表", "番茄钟任务"];
const reminders: TaskSaveOptions["reminder"][] = ["无", "提前10分钟", "提前1小时", "提前1天", "自定义"];
const repeats: TaskSaveOptions["repeat"][] = ["不重复", "每天", "每周", "A/B周", "自定义循环"];
const deadlineTaskTypes = new Set<TaskType>(["作业", "复习", "错题复盘", "番茄钟任务"]);
const timedTaskTypes = new Set<TaskType>(["个人安排", "课程", "大考", "临时考试", "考试", "突发事件"]);
const colorOptions = [
  "#EEF2F7",
  "#E5E7EB",
  "#F3F4F6",
  "#FEE2E2",
  "#FEF3C7",
  "#DCFCE7",
  "#DBEAFE",
  "#FCE7F3",
];

function defaultColorForType(type: TaskType) {
  if (type === "大考") return "#FEE2E2";
  if (type === "临时考试" || type === "考试") return "#FEF3C7";
  if (type === "放假") return "#DCFCE7";
  if (type === "突发事件") return "#FCE7F3";
  if (type === "课程") return "#DBEAFE";
  return "#EEF2F7";
}

function titlePlaceholder(type: TaskType) {
  if (type === "放假") return "例如：Half Term / 暑假";
  if (type === "大考") return "例如：CAIE 经济 Paper 1";
  if (type === "临时考试") return "例如：数学 Mock";
  if (type === "课程") return "例如：经济课";
  if (type === "个人安排") return "例如：休息 / 通勤 / 运动";
  return "例如：经济 Essay 修改";
}

export function AddTaskPage({ subjects, defaultType = "个人安排", onBack, onSave }: AddTaskPageProps) {
  const [title, setTitle] = useState(defaultType === "课程" ? "新增课程" : "");
  const [type, setType] = useState<TaskType>(defaultType);
  const [date, setDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [unitId, setUnitId] = useState(subjects[0]?.units[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("中");
  const [color, setColor] = useState(defaultColorForType(defaultType));
  const [addTarget, setAddTarget] = useState<TaskSaveOptions["addTarget"]>(
    defaultType === "课程" ? "学校课表" : "学习日历",
  );
  const [reminder, setReminder] = useState<TaskSaveOptions["reminder"]>("提前1小时");
  const [repeat, setRepeat] = useState<TaskSaveOptions["repeat"]>("不重复");

  const selectedSubject = subjects.find((subject) => subject.id === subjectId);
  const units = selectedSubject?.units ?? [];
  const level: TaskLevel = priority === "高" ? "A" : priority === "中" ? "B" : "C";
  const isHoliday = type === "放假";
  const isDeadlineTask = deadlineTaskTypes.has(type);
  const isTimedTask = timedTaskTypes.has(type);

  const unitOptions = useMemo(
    () =>
      units.length > 0
        ? units
        : [
            {
              id: "",
              title: "无指定单元",
            },
          ],
    [units],
  );

  const updateType = (nextType: TaskType) => {
    setType(nextType);
    setColor(defaultColorForType(nextType));
    if (nextType === "课程") setAddTarget("学校课表");
    if (nextType === "番茄钟任务") setAddTarget("番茄钟任务");
    if (nextType === "放假") setAddTarget("学习日历");
    if (deadlineTaskTypes.has(nextType) && addTarget !== "番茄钟任务") setAddTarget("学习日历");
  };

  const saveTask = () => {
    const cleanTitle = title.trim() || (isHoliday ? "放假" : `${selectedSubject?.name ?? "时间"} ${type}`);
    const id = `task-${Date.now()}`;

    onSave(
      {
        id,
        title: cleanTitle,
        type,
        subjectId: subjectId || undefined,
        unitId: unitId || undefined,
        date,
        startTime: isTimedTask ? startTime : undefined,
        endTime: isTimedTask ? endTime : undefined,
        dueDate: isHoliday ? endDate : date,
        color,
        priority,
        level,
        completed: false,
      },
      {
        addTarget,
        reminder,
        repeat,
      },
    );
  };

  return (
    <main className="px-5 pb-36 pt-7 md:px-6 md:pb-8 md:pt-6 lg:px-7">
      <PageHeader title="添加时间" subtitle="课程、待办、考试、假期都从这里添加。" onBack={onBack} />

      <section className="space-y-4 rounded-[30px] bg-white p-5 shadow-soft md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <label className="block md:col-span-2">
          <span className="text-sm font-black text-ink">标题</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={titlePlaceholder(type)}
            className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-ink"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <Field label="类型" value={type} onChange={(value) => updateType(value as TaskType)} options={taskTypes} />
          <Field label={isHoliday ? "开始日期" : isDeadlineTask ? "DDL" : "日期"} type="date" value={date} onChange={setDate} />
          {isHoliday ? (
            <Field label="结束日期" type="date" value={endDate} onChange={setEndDate} />
          ) : isTimedTask ? (
            <>
              <Field label="开始时间" type="time" value={startTime} onChange={setStartTime} />
              <Field label="结束时间" type="time" value={endTime} onChange={setEndTime} />
            </>
          ) : null}
        </div>

        {isTimedTask || isDeadlineTask ? (
          <>
            <Field
              label="科目"
              value={subjectId}
              onChange={(value) => {
                const nextSubject = subjects.find((subject) => subject.id === value);
                setSubjectId(value);
                setUnitId(nextSubject?.units[0]?.id ?? "");
              }}
              options={[{ label: "不关联科目", value: "" }, ...subjects.map((subject) => ({ label: subject.name, value: subject.id }))]}
            />

            <Field
              label="单元"
              value={unitId}
              onChange={setUnitId}
              options={unitOptions.map((unit) => ({ label: unit.title, value: unit.id }))}
            />
          </>
        ) : null}

        <Field label="优先级" value={priority} onChange={(value) => setPriority(value as Priority)} options={priorities} />

        {!isHoliday ? (
          <Field
            label={isDeadlineTask ? "保存位置" : "保存位置"}
            value={addTarget}
            onChange={(value) => setAddTarget(value as TaskSaveOptions["addTarget"])}
            options={isDeadlineTask ? addTargets.filter((target) => target !== "今日时间轴" && target !== "学校课表") : addTargets}
          />
        ) : null}

        <div className="md:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-ink">
            <Palette size={16} />
            颜色
          </div>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((item) => (
              <button
                key={item}
                type="button"
                aria-label={`选择颜色 ${item}`}
                onClick={() => setColor(item)}
                className={`h-9 w-9 rounded-full border-2 ${color === item ? "border-ink" : "border-white"} shadow-soft`}
                style={{ backgroundColor: item }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <Field
            label="提醒"
            value={reminder}
            onChange={(value) => setReminder(value as TaskSaveOptions["reminder"])}
            options={reminders}
          />
          <Field
            label="重复"
            value={repeat}
            onChange={(value) => setRepeat(value as TaskSaveOptions["repeat"])}
            options={repeats}
          />
        </div>
      </section>

      <div className="fixed bottom-24 left-1/2 z-20 w-full max-w-[390px] -translate-x-1/2 px-5 md:sticky md:bottom-0 md:mt-5 md:max-w-none md:translate-x-0 md:px-0 md:pb-2">
        <button
          type="button"
          onClick={saveTask}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-black text-white shadow-pill"
        >
          <Save size={18} />
          保存
        </button>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: Array<string | { label: string; value: string }>;
  type?: "text" | "date" | "time";
}

function Field({ label, value, onChange, options, type = "text" }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink">{label}</span>
      {options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-3 text-sm font-semibold text-ink outline-none focus:border-ink"
        >
          {options.map((option) => {
            const item = typeof option === "string" ? { label: option, value: option } : option;
            return (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-3 text-sm font-semibold outline-none focus:border-ink"
        />
      )}
    </label>
  );
}
