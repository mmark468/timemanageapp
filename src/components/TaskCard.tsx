import { Check, Circle, Flag, Trash2 } from "lucide-react";
import type { Priority, Subject, Task } from "../types";
import { daysLeftText } from "../utils/date";

interface TaskCardProps {
  task: Task;
  subject?: Subject;
  compact?: boolean;
  onToggle?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

const priorityStyle: Record<Priority, string> = {
  高: "bg-peach text-[#8A3434]",
  中: "bg-lemon text-[#7A5715]",
  低: "bg-mint text-[#276044]",
};

export function TaskCard({ task, subject, compact = false, onToggle, onDelete }: TaskCardProps) {
  return (
    <article
      className={`rounded-[26px] border border-white/80 bg-white/80 p-4 shadow-soft transition ${
        task.completed ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {onToggle ? (
          <button
            type="button"
            aria-label={task.completed ? "标记未完成" : "标记完成"}
            onClick={() => onToggle(task.id)}
            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
              task.completed ? "bg-mint text-ink" : "bg-cream text-muted"
            }`}
          >
            {task.completed ? <Check size={18} /> : <Circle size={16} />}
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`font-black leading-tight text-ink ${compact ? "text-base" : "text-lg"}`}>
                {task.title}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {task.type}
                {subject ? ` · ${subject.name}` : ""}
                {task.level ? ` · ${task.level}级` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityStyle[task.priority]}`}>
                {task.priority}
              </span>
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#FEE2E2] text-[#B91C1C]"
                  aria-label="删除任务"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1.5">
              <Flag size={13} />
              截止：{daysLeftText(task.dueDate)}
            </span>
            {task.startTime ? (
              <span className="rounded-full bg-cream px-3 py-1.5">
                {task.startTime}
                {task.endTime ? `-${task.endTime}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
