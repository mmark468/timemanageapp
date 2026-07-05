import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import type { Subject, Unit } from "../types";

interface UnitDetailPageProps {
  subject: Subject;
  unit: Unit;
  onBack: () => void;
  onRenameUnit: (unitId: string, title: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onUpdateProgress: (unitId: string, field: "learningProgress" | "practiceProgress", progress: number) => void;
  onAddToPomodoro: () => void;
  onJoinToday: () => void;
}

export function UnitDetailPage({ subject, unit, onBack, onRenameUnit, onDeleteUnit }: UnitDetailPageProps) {
  const [title, setTitle] = useState(unit.title);

  return (
    <main className="px-5 pb-28 pt-7 md:px-6 md:pb-8 md:pt-6 lg:px-7">
      <PageHeader title="文件夹设置" subtitle={`${subject.name} · 修改资料分类名称或删除文件夹。`} onBack={onBack} />

      <section className="rounded-[28px] bg-white p-5 shadow-soft">
        <label className="block">
          <span className="text-sm font-black text-ink">文件夹名</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-black outline-none focus:ring-2 focus:ring-ink/10"
          />
        </label>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
          <button
            type="button"
            onClick={() => onRenameUnit(unit.id, title)}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-black text-white shadow-pill"
          >
            <Save size={17} />
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              onDeleteUnit(unit.id);
              onBack();
            }}
            className="grid h-12 w-12 place-items-center rounded-full bg-[#FEE2E2] text-[#B91C1C]"
            aria-label="删除单元"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
