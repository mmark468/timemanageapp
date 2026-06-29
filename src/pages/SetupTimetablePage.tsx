import { ArrowRight, CheckCircle2, Minus, Plus, Repeat, School } from "lucide-react";
import { useMemo, useState } from "react";
import { Chip } from "../components/Chip";
import type { Subject, TimetableClass } from "../types";
import { minutesToText } from "../utils/date";

interface SetupTimetablePageProps {
  subjects: Subject[];
  timetable: TimetableClass[];
  onSaveSeries: (title: string, items: TimetableClass[]) => void;
  onComplete: () => void;
}

interface SeriesSlot {
  day: TimetableClass["day"];
  startTime: string;
  endTime: string;
}

const weekdays: TimetableClass["day"][] = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const defaultSlots: SeriesSlot[] = [
  { day: "周一", startTime: "08:30", endTime: "09:40" },
  { day: "周三", startTime: "10:00", endTime: "11:10" },
  { day: "周五", startTime: "13:30", endTime: "14:40" },
  { day: "周二", startTime: "15:00", endTime: "16:10" },
  { day: "周四", startTime: "18:30", endTime: "19:40" },
  { day: "周六", startTime: "10:00", endTime: "11:10" },
  { day: "周日", startTime: "14:00", endTime: "15:10" },
];

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function durationText(item: TimetableClass) {
  return minutesToText(Math.max(0, timeToMinutes(item.endTime) - timeToMinutes(item.startTime)));
}

export function SetupTimetablePage({ subjects, timetable, onSaveSeries, onComplete }: SetupTimetablePageProps) {
  const firstSubject = subjects[0];
  const [selectedSubjectId, setSelectedSubjectId] = useState(firstSubject?.id ?? "");
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? firstSubject;
  const [room, setRoom] = useState("");
  const [frequency, setFrequency] = useState(4);
  const [slots, setSlots] = useState<SeriesSlot[]>(defaultSlots);

  const subjectCourses = useMemo(
    () =>
      subjects.map((subject) => ({
        subject,
        items: timetable
          .filter((item) => item.subjectId === subject.id || item.title === subject.name)
          .sort((a, b) => `${a.day}${a.startTime}`.localeCompare(`${b.day}${b.startTime}`)),
      })),
    [subjects, timetable],
  );

  const changeFrequency = (next: number) => {
    setFrequency(Math.max(1, Math.min(7, next)));
  };

  const updateSlot = (index: number, patch: Partial<SeriesSlot>) => {
    setSlots((current) => current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot)));
  };

  const loadSubject = (subject: Subject) => {
    const existing = timetable.filter((item) => item.subjectId === subject.id || item.title === subject.name);
    setSelectedSubjectId(subject.id);
    setRoom(existing[0]?.room ?? room);
    setFrequency(existing.length > 0 ? Math.min(existing.length, 7) : 4);
    setSlots(
      [
        ...existing.map((item) => ({
          day: item.day,
          startTime: item.startTime,
          endTime: item.endTime,
        })),
        ...defaultSlots,
      ].slice(0, 7),
    );
  };

  const saveCourse = () => {
    if (!selectedSubject) return;

    const createdAt = Date.now();
    const items = slots.slice(0, frequency).map<TimetableClass>((slot, index) => ({
      id: `tt-user-${selectedSubject.id}-${createdAt}-${index}`,
      subjectId: selectedSubject.id,
      title: selectedSubject.name,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: room.trim() || "教室待定",
      weekType: "ALL",
      color: selectedSubject.color,
    }));

    onSaveSeries(selectedSubject.name, items);
  };

  return (
    <main className="min-h-screen px-5 pb-8 pt-7">
      <header className="rounded-[30px] bg-white/85 p-5 shadow-soft">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[20px] bg-skySoft text-ink">
          <School size={24} />
        </div>
        <p className="text-sm font-bold text-muted">第二步</p>
        <h1 className="mt-1 text-3xl font-black leading-tight tracking-normal text-ink">
          设置你的
          <br />
          学校课表
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">选择一门课，填每周几次，再设置每次开始和结束时间。</p>
      </header>

      <section className="mt-5 rounded-[28px] bg-white/85 p-4 shadow-soft">
        <h2 className="text-sm font-black text-ink">选择科目</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {subjects.map((subject, index) => (
            <Chip
              key={subject.id}
              selected={selectedSubject?.id === subject.id}
              color={index % 3 === 0 ? "blue" : index % 3 === 1 ? "yellow" : "green"}
              onClick={() => loadSubject(subject)}
            >
              {subject.name}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[28px] bg-white/85 p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-muted">正在设置</p>
            <h2 className="mt-1 text-2xl font-black text-ink">{selectedSubject?.name ?? "选择科目"}</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-cream px-2 py-1">
            <button
              type="button"
              onClick={() => changeFrequency(frequency - 1)}
              className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow-soft"
              aria-label="减少每周次数"
            >
              <Minus size={16} />
            </button>
            <span className="w-14 text-center text-sm font-black">{frequency} 次/周</span>
            <button
              type="button"
              onClick={() => changeFrequency(frequency + 1)}
              className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow-soft"
              aria-label="增加每周次数"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-black text-ink">教室 / 地点</span>
          <input
            value={room}
            onChange={(event) => setRoom(event.target.value)}
            placeholder="例如：A203 / Lab 2"
            className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
          />
        </label>

        <div className="mt-5 space-y-3">
          {slots.slice(0, frequency).map((slot, index) => (
            <div key={`${slot.day}-${index}`} className="rounded-[22px] bg-cream/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black text-ink">第 {index + 1} 次</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-muted">
                  {slot.startTime}-{slot.endTime}
                </span>
              </div>
              <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-2">
                <SelectField
                  label="星期"
                  value={slot.day}
                  options={weekdays}
                  onChange={(value) => updateSlot(index, { day: value as TimetableClass["day"] })}
                />
                <InputField label="开始" type="time" value={slot.startTime} onChange={(value) => updateSlot(index, { startTime: value })} />
                <InputField label="结束" type="time" value={slot.endTime} onChange={(value) => updateSlot(index, { endTime: value })} />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={saveCourse}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky text-sm font-black text-ink shadow-pill"
        >
          <Repeat size={17} />
          保存这门课
        </button>
      </section>

      <section className="mt-5 rounded-[28px] bg-white/85 p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">已设置课程</h2>
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-black text-muted">{timetable.length} 节</span>
        </div>

        <div className="space-y-3">
          {subjectCourses.map(({ subject, items }) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => loadSubject(subject)}
              className="w-full rounded-[22px] bg-cream/70 p-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                  <span className="truncate text-base font-black text-ink">{subject.name}</span>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-muted">
                  {items.length > 0 ? `${items.length} 次/周` : "未设置"}
                </span>
              </div>
              {items.length > 0 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {items.map((item) => (
                    <span key={item.id} className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-ink/70">
                      {item.day} {item.startTime}-{item.endTime} · {durationText(item)}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onComplete}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-black text-white shadow-soft"
      >
        进入我的学习首页
        <ArrowRight size={19} />
      </button>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-muted">
        <CheckCircle2 size={15} />
        保存后可以在“课表”页继续修改。
      </div>
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
      <span className="text-xs font-black text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-[14px] border border-transparent bg-white px-2 text-sm font-semibold outline-none focus:border-sky"
      />
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-black text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-[14px] border border-transparent bg-white px-2 text-sm font-semibold outline-none focus:border-sky"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
