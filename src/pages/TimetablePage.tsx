import { CalendarPlus, Clock3, MapPin, Minus, Plus, Repeat, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Chip } from "../components/Chip";
import { PageHeader } from "../components/PageHeader";
import type { TimetableClass } from "../types";
import { minutesToText } from "../utils/date";

interface TimetablePageProps {
  timetable: TimetableClass[];
  onSaveClass: (item: TimetableClass) => void;
  onSaveSeries: (title: string, items: TimetableClass[]) => void;
  onDeleteClass: (classId: string) => void;
}

interface SeriesSlot {
  day: TimetableClass["day"];
  startTime: string;
  endTime: string;
}

interface CourseSummary {
  title: string;
  count: number;
  totalMinutes: number;
  color: string;
  items: TimetableClass[];
}

const weekdays: TimetableClass["day"][] = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const schoolDays: TimetableClass["day"][] = ["周一", "周二", "周三", "周四", "周五"];
const weekTypes: TimetableClass["weekType"][] = ["ALL", "A", "B"];
const courseColors = ["#E8EDF5", "#F3F4F6", "#DDE3EA", "#EEF2F7", "#E5E7EB", "#F8FAFC"];
const defaultSeriesSlots: SeriesSlot[] = [
  { day: "周一", startTime: "08:30", endTime: "09:40" },
  { day: "周二", startTime: "10:00", endTime: "11:10" },
  { day: "周三", startTime: "13:30", endTime: "14:40" },
  { day: "周五", startTime: "15:00", endTime: "16:10" },
  { day: "周四", startTime: "18:30", endTime: "19:40" },
  { day: "周六", startTime: "10:00", endTime: "11:10" },
  { day: "周日", startTime: "14:00", endTime: "15:10" },
];

function blankCourse(day: TimetableClass["day"]): TimetableClass {
  return {
    id: `tt-custom-${Date.now()}`,
    title: "新增课程",
    day,
    startTime: "08:30",
    endTime: "09:40",
    room: "教室",
    weekType: "ALL",
    color: "#BDE7F8",
  };
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function classDuration(item: TimetableClass) {
  return Math.max(0, timeToMinutes(item.endTime) - timeToMinutes(item.startTime));
}

export function TimetablePage({ timetable, onSaveClass, onSaveSeries, onDeleteClass }: TimetablePageProps) {
  const [planMode, setPlanMode] = useState<"学校周" | "编辑时间线">("学校周");
  const [useABWeek, setUseABWeek] = useState(false);
  const [weekType, setWeekType] = useState<"A" | "B">("A");
  const [selectedDay, setSelectedDay] = useState<TimetableClass["day"]>("周一");
  const [editing, setEditing] = useState<TimetableClass>(() => blankCourse("周一"));
  const [seriesTitle, setSeriesTitle] = useState("经济");
  const [seriesRoom, setSeriesRoom] = useState("A203");
  const [seriesColor, setSeriesColor] = useState("#E8EDF5");
  const [seriesFrequency, setSeriesFrequency] = useState(4);
  const [seriesWeekType, setSeriesWeekType] = useState<TimetableClass["weekType"]>("ALL");
  const [seriesSlots, setSeriesSlots] = useState<SeriesSlot[]>(defaultSeriesSlots);

  const visibleClasses = useMemo(
    () =>
      timetable
        .filter((item) => (useABWeek ? item.weekType === "ALL" || item.weekType === weekType : item.weekType === "ALL"))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timetable, useABWeek, weekType],
  );
  const dayClasses = visibleClasses.filter((item) => item.day === selectedDay);
  const courseSummaries = useMemo<CourseSummary[]>(() => {
    const grouped = new Map<string, CourseSummary>();

    visibleClasses.forEach((item) => {
      const summary =
        grouped.get(item.title) ??
        ({
          title: item.title,
          count: 0,
          totalMinutes: 0,
          color: item.color,
          items: [],
        } satisfies CourseSummary);

      summary.count += 1;
      summary.totalMinutes += classDuration(item);
      summary.items.push(item);
      grouped.set(item.title, summary);
    });

    return [...grouped.values()].sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [visibleClasses]);

  const startNewCourse = () => {
    setEditing(blankCourse(selectedDay));
    setPlanMode("编辑时间线");
  };

  const updateEditing = <K extends keyof TimetableClass>(key: K, value: TimetableClass[K]) => {
    setEditing((current) => ({ ...current, [key]: value }));
  };

  const updateSeriesSlot = (index: number, patch: Partial<SeriesSlot>) => {
    setSeriesSlots((current) => current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot)));
  };

  const changeFrequency = (next: number) => {
    setSeriesFrequency(Math.max(1, Math.min(7, next)));
  };

  const saveSeries = () => {
    const title = seriesTitle.trim() || "新增课程";
    const createdAt = Date.now();
    const items = seriesSlots.slice(0, seriesFrequency).map<TimetableClass>((slot, index) => ({
      id: `tt-series-${createdAt}-${index}`,
      title,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: seriesRoom.trim() || "教室",
      weekType: useABWeek ? seriesWeekType : "ALL",
      color: seriesColor,
    }));

    onSaveSeries(title, items);
    setSelectedDay(items[0]?.day ?? selectedDay);
    setPlanMode("学校周");
  };

  const editCourseSummary = (summary: CourseSummary) => {
    const source = summary.items[0];
    const slots = [
      ...summary.items.map((item) => ({
        day: item.day,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
      ...defaultSeriesSlots,
    ].slice(0, 7);

    setSeriesTitle(summary.title);
    setSeriesRoom(source?.room ?? "教室");
    setSeriesColor(summary.color);
    setSeriesFrequency(Math.max(1, Math.min(summary.items.length, 7)));
    setUseABWeek(Boolean(source && source.weekType !== "ALL"));
    setSeriesWeekType(source?.weekType ?? "ALL");
    setSeriesSlots(slots);
    if (source) {
      setEditing(source);
      setSelectedDay(source.day);
    }
    setPlanMode("编辑时间线");
  };

  return (
    <main className="timetable-page px-5 pb-28 pt-7">
      <PageHeader
        title="我的课表"
        subtitle="按一周几次来改课表，保存后会自动进日历。"
        action={
          <button
            type="button"
            onClick={startNewCourse}
            className="flex h-10 items-center gap-1 rounded-full bg-sky px-3 text-xs font-black text-ink shadow-pill"
          >
            <CalendarPlus size={16} />
            单节
          </button>
        }
      />

      <section className="rounded-[26px] bg-white/85 p-4 shadow-soft">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-cream p-1">
          {(["学校周", "编辑时间线"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPlanMode(mode)}
              className={`h-10 rounded-full text-sm font-black transition ${
                planMode === mode ? "bg-sky text-ink shadow-pill" : "text-muted"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip selected={!useABWeek} color="green" onClick={() => setUseABWeek(false)}>
            常规每周
          </Chip>
          <Chip selected={useABWeek} color="purple" onClick={() => setUseABWeek(true)}>
            启用隔周课
          </Chip>
          {useABWeek ? (
            <>
              <Chip selected={weekType === "A"} color="yellow" onClick={() => setWeekType("A")}>
                查看 A 周
              </Chip>
              <Chip selected={weekType === "B"} color="purple" onClick={() => setWeekType("B")}>
                查看 B 周
              </Chip>
            </>
          ) : null}
        </div>
        <p className="mt-3 rounded-[18px] bg-cream px-3 py-2 text-xs font-bold text-muted">
          默认只使用常规课表；只有主动启用隔周课，才会出现 A/B 周。
        </p>
      </section>

      {planMode === "学校周" ? (
        <section className="mt-5 space-y-4">
          <section className="rounded-[28px] bg-white/85 p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-muted">课程管理 List</p>
                <h2 className="text-xl font-black text-ink">每门课总量</h2>
              </div>
              <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-muted">{courseSummaries.length} 门</span>
            </div>

            <div className="space-y-3">
              {courseSummaries.map((summary) => (
                <button
                  key={summary.title}
                  type="button"
                  onClick={() => editCourseSummary(summary)}
                  className="w-full rounded-[22px] bg-cream/70 p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: summary.color }} />
                        <h3 className="truncate text-lg font-black text-ink">{summary.title}</h3>
                      </div>
                      <p className="mt-1 text-xs font-bold text-muted">
                        每周 {summary.count} 节 · {minutesToText(summary.totalMinutes)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-ink">管理</span>
                  </div>

                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    {summary.items.map((item) => (
                      <span
                        key={item.id}
                        className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-ink/70"
                      >
                        {item.day} {item.startTime}-{item.endTime} · {item.room}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {weekdays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`h-11 min-w-16 rounded-full px-4 text-sm font-black transition ${
                  selectedDay === day ? "bg-sky text-ink shadow-pill" : "bg-white/80 text-muted shadow-soft"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="rounded-[28px] bg-white/85 p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-muted">{useABWeek ? `${weekType} 周时间线` : "常规周时间线"}</p>
                <h2 className="text-2xl font-black text-ink">{selectedDay}</h2>
              </div>
              <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-muted">{dayClasses.length} 节</span>
            </div>

            <div className="space-y-3">
              {dayClasses.length > 0 ? (
                dayClasses.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEditing(item);
                      setPlanMode("编辑时间线");
                    }}
                    className="flex w-full gap-3 rounded-[24px] bg-cream/70 p-3 text-left"
                  >
                    <div className="w-[88px] shrink-0 rounded-[22px] bg-ink px-3 py-4 text-center text-white">
                      <p className="text-2xl font-black leading-none">{item.startTime}</p>
                      <p className="mt-2 text-xs font-bold opacity-80">{item.endTime}</p>
                    </div>
                    <div className="min-w-0 flex-1 rounded-[20px] p-4" style={{ backgroundColor: item.color }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-black text-ink">{item.title}</h3>
                          <p className="mt-2 flex items-center gap-1 text-sm font-bold text-ink/70">
                            <MapPin size={15} />
                            {item.room}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/65 px-3 py-1 text-xs font-black text-ink">
                          {item.weekType === "ALL" ? "每周" : `${item.weekType}周`}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] bg-cream/80 p-5 text-center text-sm font-bold text-muted">
                  这天还没有课，点上方“编辑时间线”可以直接添加。
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-5 space-y-5">
          <section className="rounded-[28px] bg-white/85 p-5 shadow-soft">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-muted">批量编辑</p>
                <h2 className="text-xl font-black text-ink">每周时间线</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-cream px-2 py-1">
                <button
                  type="button"
                  onClick={() => changeFrequency(seriesFrequency - 1)}
                  aria-label="减少每周次数"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow-soft"
                >
                  <Minus size={16} />
                </button>
                <span className="w-14 text-center text-sm font-black">{seriesFrequency} 次/周</span>
                <button
                  type="button"
                  onClick={() => changeFrequency(seriesFrequency + 1)}
                  aria-label="增加每周次数"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow-soft"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-black text-ink">课程名</span>
                <input
                  value={seriesTitle}
                  onChange={(event) => setSeriesTitle(event.target.value)}
                  className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <InputField label="教室" value={seriesRoom} onChange={setSeriesRoom} />
                {useABWeek ? (
                  <SelectField
                    label="周期"
                    value={seriesWeekType}
                    options={weekTypes}
                    optionLabels={{ ALL: "每周", A: "只在A周", B: "只在B周" }}
                    onChange={(value) => setSeriesWeekType(value as TimetableClass["weekType"])}
                  />
                ) : null}
              </div>

              <div>
                <span className="text-sm font-black text-ink">颜色</span>
                <div className="mt-2 flex gap-2">
                  {courseColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`选择颜色 ${color}`}
                      onClick={() => setSeriesColor(color)}
                      className={`h-9 w-9 rounded-full border-2 ${seriesColor === color ? "border-ink" : "border-white"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {seriesSlots.slice(0, seriesFrequency).map((slot, index) => (
                  <div key={`${slot.day}-${index}`} className="rounded-[22px] bg-cream/80 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-black text-ink">第 {index + 1} 次</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted">{slot.day}</span>
                    </div>
                    <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-2">
                      <SelectField
                        label="星期"
                        value={slot.day}
                        options={weekdays}
                        onChange={(value) => updateSeriesSlot(index, { day: value as TimetableClass["day"] })}
                      />
                      <InputField
                        label="开始"
                        type="time"
                        value={slot.startTime}
                        onChange={(value) => updateSeriesSlot(index, { startTime: value })}
                      />
                      <InputField
                        label="结束"
                        type="time"
                        value={slot.endTime}
                        onChange={(value) => updateSeriesSlot(index, { endTime: value })}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={saveSeries}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky text-sm font-black text-ink shadow-pill"
              >
                <Repeat size={17} />
                保存每周时间线
              </button>

              <div className="flex items-center gap-2 rounded-[22px] bg-cream p-3 text-xs font-bold text-muted">
                <Clock3 size={15} />
默认保存为常规每周课。需要隔周课时，先启用“隔周课”，再选择 A 周或 B 周。
              </div>
            </div>
          </section>

          <section className="rounded-[28px] bg-white/85 p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-ink">单节微调</h2>
              <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-muted">{editing.day}</span>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-black text-ink">课程名</span>
                <input
                  value={editing.title}
                  onChange={(event) => updateEditing("title", event.target.value)}
                  className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="星期"
                  value={editing.day}
                  options={schoolDays}
                  onChange={(value) => updateEditing("day", value as TimetableClass["day"])}
                />
                {useABWeek ? (
                  <SelectField
                    label="周期"
                    value={editing.weekType}
                    options={weekTypes}
                    optionLabels={{ ALL: "每周", A: "A周", B: "B周" }}
                    onChange={(value) => updateEditing("weekType", value as TimetableClass["weekType"])}
                  />
                ) : null}
                <InputField label="开始" type="time" value={editing.startTime} onChange={(value) => updateEditing("startTime", value)} />
                <InputField label="结束" type="time" value={editing.endTime} onChange={(value) => updateEditing("endTime", value)} />
              </div>

              <InputField label="教室" value={editing.room} onChange={(value) => updateEditing("room", value)} />

              <div>
                <span className="text-sm font-black text-ink">颜色</span>
                <div className="mt-2 flex gap-2">
                  {courseColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`选择颜色 ${color}`}
                      onClick={() => updateEditing("color", color)}
                      className={`h-9 w-9 rounded-full border-2 ${editing.color === color ? "border-ink" : "border-white"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <button
                  type="button"
                  onClick={() => onSaveClass({ ...editing, weekType: useABWeek ? editing.weekType : "ALL" })}
                  className="flex h-12 items-center justify-center gap-2 rounded-full bg-sky text-sm font-black text-ink shadow-pill"
                >
                  <Save size={17} />
                  保存单节
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteClass(editing.id)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFE1E1] text-[#B94242] shadow-soft"
                  aria-label="删除课程"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "time";
}

function InputField({ label, value, onChange, type = "text" }: InputFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-white px-3 text-sm font-semibold outline-none focus:border-sky"
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, optionLabels, onChange }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-white px-3 text-sm font-semibold outline-none focus:border-sky"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
