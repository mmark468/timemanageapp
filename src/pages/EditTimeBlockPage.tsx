import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";

export type EditableTimeBlockKind = "task" | "timetable" | "timeline" | "exam" | "holiday";

export interface EditableTimeBlock {
  sourceKind: EditableTimeBlockKind;
  sourceId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  endDate?: string;
  timed?: boolean;
  label: string;
  helper: string;
}

interface EditTimeBlockPageProps {
  block: EditableTimeBlock | null;
  onBack: () => void;
  onSave: (block: EditableTimeBlock) => void;
  onDelete: (block: EditableTimeBlock) => void;
}

export function EditTimeBlockPage({ block, onBack, onSave, onDelete }: EditTimeBlockPageProps) {
  const [draft, setDraft] = useState(block);

  if (!draft) {
    return (
      <main className="px-5 pb-28 pt-7 md:px-6 md:pb-8 md:pt-6 lg:px-7">
        <PageHeader title="编辑时间" subtitle="这个时间块暂时找不到了。" onBack={onBack} />
      </main>
    );
  }

  const isHoliday = draft.sourceKind === "holiday";
  const showsTimeFields = !isHoliday && draft.timed !== false;

  const updateDraft = <K extends keyof EditableTimeBlock>(key: K, value: EditableTimeBlock[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <main className="px-5 pb-28 pt-7 md:px-6 md:pb-8 md:pt-6 lg:px-7">
      <PageHeader title="编辑时间" subtitle={draft.label} onBack={onBack} />

      <section className="rounded-[28px] bg-white/85 p-5 shadow-soft">
        <div className="mb-5 rounded-[22px] bg-cream p-4">
          <p className="text-xs font-black text-muted">正在修改</p>
          <p className="mt-1 text-lg font-black text-ink">{draft.title}</p>
          <p className="mt-2 text-xs font-bold text-muted">{draft.helper}</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-black text-ink">标题</span>
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
            />
          </label>

          <div className={isHoliday ? "grid grid-cols-2 gap-3" : "block"}>
            <label className="block">
              <span className="text-sm font-black text-ink">{isHoliday ? "开始日期" : "日期"}</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
                className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
              />
            </label>
            {isHoliday ? (
              <label className="block">
                <span className="text-sm font-black text-ink">结束日期</span>
                <input
                  type="date"
                  value={draft.endDate ?? draft.date}
                  onChange={(event) => updateDraft("endDate", event.target.value)}
                  className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
                />
              </label>
            ) : null}
          </div>

          {showsTimeFields ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-black text-ink">开始</span>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(event) => updateDraft("startTime", event.target.value)}
                  className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
                />
              </label>
              <label className="block">
                <span className="text-sm font-black text-ink">结束</span>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(event) => updateDraft("endTime", event.target.value)}
                  className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-sm font-semibold outline-none focus:border-sky"
                />
              </label>
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-black text-white shadow-pill"
            >
              <Save size={17} />
              保存修改
            </button>
            <button
              type="button"
              onClick={() => onDelete(draft)}
              aria-label="删除事件"
              className="grid h-12 w-12 place-items-center rounded-full bg-[#FEE2E2] text-[#B91C1C] shadow-soft"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
