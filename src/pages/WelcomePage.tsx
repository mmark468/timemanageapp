import { GraduationCap, Sparkles } from "lucide-react";

interface WelcomePageProps {
  onStart: () => void;
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <main className="flex min-h-screen flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-muted">A-Level 学习时间管理</p>
          <h1 className="text-3xl font-black tracking-normal text-ink">时间规划</h1>
        </div>
        <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-soft">
          国际生专属
        </div>
      </div>

      <section className="mt-12 flex flex-1 flex-col items-center text-center">
        <div className="relative flex h-40 w-40 items-center justify-center rounded-[42px] bg-white shadow-soft">
          <GraduationCap size={76} strokeWidth={1.8} className="text-ink" />
        </div>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-muted shadow-soft">
          <Sparkles size={16} />
          课表 · 日历 · 搜题 · 专注
        </div>

        <h2 className="mt-5 text-4xl font-black leading-tight tracking-normal text-ink">
          时间规划
          <br />
          从课表开始
        </h2>
        <p className="mt-4 max-w-[310px] text-base leading-8 text-muted">
          为 A-Level 和国际课程学生整理课程、DDL、大考倒计时和每日计划。
        </p>
      </section>

      <button
        type="button"
        onClick={onStart}
        className="mb-4 flex h-14 items-center justify-center rounded-full bg-ink text-base font-black text-white shadow-pill transition hover:-translate-y-0.5"
      >
        开始设置我的时间规划
      </button>
    </main>
  );
}
