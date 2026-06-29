import { Clock3, Link2, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import type { DailyTimelineItem, Subject, Task } from "../types";
import { minutesToText, TODAY } from "../utils/date";

interface TimelinePageProps {
  subjects: Subject[];
  tasks: Task[];
  timelineItems: DailyTimelineItem[];
  onBack: () => void;
  onEditItem: (item: DailyTimelineItem) => void;
}

const startHour = 7;
const endHour = 22;
const hourHeight = 82;
const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => index + startHour);
const timelineHeight = (endHour - startHour + 1) * hourHeight;

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function eventStyle(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const top = Math.max(0, ((start - startHour * 60) / 60) * hourHeight);
  const height = Math.max(30, ((end - start) / 60) * hourHeight);

  return { top, height };
}

export function TimelinePage({ subjects, tasks, timelineItems, onBack, onEditItem }: TimelinePageProps) {
  const todayItems = timelineItems.filter((item) => item.date === TODAY);

  return (
    <main className="px-5 pb-28 pt-7">
      <PageHeader title="今日时间轴" subtitle="按持续时间显示长度。" onBack={onBack} />

      <section className="rounded-[28px] bg-white/85 p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-xs font-black text-muted">
          <Clock3 size={15} />
          事件越长，占用的纵轴越长
        </div>

        <div className="grid grid-cols-[54px_1fr] gap-3">
          <div className="relative" style={{ height: timelineHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-0 pr-1 text-xs font-black text-muted"
                style={{ top: (hour - startHour) * hourHeight - 2 }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div className="relative border-l-2 border-dashed border-skySoft pl-4" style={{ height: timelineHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-black/5"
                style={{ top: (hour - startHour) * hourHeight }}
              />
            ))}

            {todayItems.map((event) => {
              const subject = event.subjectId ? subjects.find((item) => item.id === event.subjectId) : undefined;
              const task = event.taskId ? tasks.find((item) => item.id === event.taskId) : undefined;
              const duration = Math.max(0, timeToMinutes(event.endTime) - timeToMinutes(event.time));
              const isTiny = duration < 40;
              const showMeta = duration >= 55;

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEditItem(event)}
                  className={`absolute left-4 right-0 z-10 overflow-hidden rounded-[18px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] ${
                    isTiny ? "px-2 py-1.5 text-left" : "px-3 py-2 text-left"
                  }`}
                  style={{ ...eventStyle(event.time, event.endTime), backgroundColor: event.color }}
                >
                  {isTiny ? (
                    <p className="truncate text-[11px] font-black leading-[18px] text-ink">
                      {event.title} · {event.time}-{event.endTime} · {minutesToText(duration)}
                    </p>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-ink">{event.title}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-ink/70">
                          {event.time}-{event.endTime} · {minutesToText(duration)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm">✦</span>
                    </div>
                  )}
                  {showMeta ? (
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold text-ink/70">
                      {subject ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/55 px-2 py-0.5">
                          <Link2 size={10} />
                          {subject.name}
                        </span>
                      ) : null}
                      {task ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/55 px-2 py-0.5">
                          <ListChecks size={10} />
                          任务
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
