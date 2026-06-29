import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Chip } from "../components/Chip";
import { PageHeader } from "../components/PageHeader";
import { TaskCard } from "../components/TaskCard";
import type { Subject, Task, TaskType } from "../types";

interface StudyTasksPageProps {
  tasks: Task[];
  subjects: Subject[];
  onBack: () => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: () => void;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onFocusTask: (task: Task) => void;
}

const filters: Array<"全部" | TaskType> = [
  "全部",
  "大考",
  "临时考试",
  "作业",
  "课程",
  "复习",
  "错题复盘",
  "个人安排",
  "突发事件",
  "番茄钟任务",
];

export function StudyTasksPage({
  tasks,
  subjects,
  onBack,
  onToggleTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onFocusTask,
}: StudyTasksPageProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("全部");
  const visibleTasks = tasks
    .filter((task) => filter === "全部" || task.type === filter)
    .sort((a, b) => (a.dueDate ?? a.date).localeCompare(b.dueDate ?? b.date));

  return (
    <main className="px-5 pb-28 pt-7">
      <PageHeader
        title="学习任务"
        subtitle="DDL 不要吓人，先把层级和下一步看清楚。"
        onBack={onBack}
        action={
          <button
            type="button"
            onClick={onAddTask}
            className="flex h-10 items-center gap-1 rounded-full bg-sky px-3 text-xs font-black text-ink shadow-pill"
          >
            <Plus size={16} />
            添加
          </button>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {filters.map((item, index) => (
          <Chip
            key={item}
            selected={filter === item}
            color={index % 2 === 0 ? "blue" : "yellow"}
            onClick={() => setFilter(item)}
          >
            {item}
          </Chip>
        ))}
      </div>

      <div className="space-y-3">
        {visibleTasks.map((task) => {
          const subject = subjects.find((item) => item.id === task.subjectId);
          return (
            <div key={task.id} className="space-y-2">
              <TaskCard task={task} subject={subject} onToggle={onToggleTask} />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEditTask(task.id)}
                  className="flex h-10 items-center gap-1 rounded-full bg-white/80 px-3 text-xs font-black text-ink shadow-soft"
                >
                  <Pencil size={15} />
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => onFocusTask(task)}
                  className="flex h-10 items-center gap-1 rounded-full bg-white/80 px-3 text-xs font-black text-ink shadow-soft"
                >
                  <Clock3 size={15} />
                  番茄钟
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="flex h-10 items-center gap-1 rounded-full bg-[#FFE1E1] px-3 text-xs font-black text-[#B94242] shadow-soft"
                >
                  <Trash2 size={15} />
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
