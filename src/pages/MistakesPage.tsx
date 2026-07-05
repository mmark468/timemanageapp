import { Clock3 } from "lucide-react";
import { useState } from "react";
import { Chip } from "../components/Chip";
import { PageHeader } from "../components/PageHeader";
import type { Mistake, Subject } from "../types";

interface MistakesPageProps {
  mistakes: Mistake[];
  subjects: Subject[];
  onBack: () => void;
  onFocusMistake: (mistake: Mistake) => void;
}

const filters = ["全部", "经济", "数学", "心理学", "英语", "计算机"] as const;

export function MistakesPage({ mistakes, subjects, onBack, onFocusMistake }: MistakesPageProps) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("全部");
  const visibleMistakes = mistakes.filter((mistake) => {
    if (filter === "全部") return true;
    return subjects.find((subject) => subject.id === mistake.subjectId)?.name === filter;
  });

  return (
    <main className="px-5 pb-28 pt-7 md:grid md:grid-cols-1 md:items-start md:gap-5 md:px-6 md:pb-8 md:pt-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-7 xl:grid-cols-[250px_minmax(0,1fr)]">
      <PageHeader title="错题本" subtitle="先复习错题，再刷下一套卷。" onBack={onBack} />

      <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar lg:sticky lg:top-6 lg:flex-col lg:overflow-visible lg:rounded-[28px] lg:bg-white lg:p-3 lg:shadow-soft">
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

      <section className="mt-2 space-y-3 md:mt-0 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
        {visibleMistakes.map((mistake) => {
          const subject = subjects.find((item) => item.id === mistake.subjectId);
          return (
            <article key={mistake.id} className="rounded-[30px] bg-white/80 p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-ink">{mistake.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">错误原因：{mistake.reason}</p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-black text-ink"
                  style={{ backgroundColor: subject?.color ?? "#BDE7F8" }}
                >
                  {subject?.name ?? "学习"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] bg-cream p-3">
                  <p className="text-xs font-bold text-muted">状态</p>
                  <p className="mt-1 font-black text-ink">{mistake.status}</p>
                </div>
                <div className="rounded-[22px] bg-cream p-3">
                  <p className="text-xs font-bold text-muted">上次复习</p>
                  <p className="mt-1 font-black text-ink">{mistake.lastReviewed}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onFocusMistake(mistake)}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky text-sm font-black text-ink shadow-pill"
              >
                <Clock3 size={17} />
                {mistake.status === "已复习一次" ? "加入番茄钟" : "开始复习"}
              </button>
            </article>
          );
        })}
        {visibleMistakes.length === 0 ? (
          <div className="rounded-[24px] bg-white p-6 text-center text-sm font-bold text-muted shadow-soft md:col-span-full">
            当前筛选下还没有错题
          </div>
        ) : null}
      </section>
    </main>
  );
}
