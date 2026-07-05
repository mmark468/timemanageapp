import { BookOpenText, CalendarDays, Home, ScanSearch, School } from "lucide-react";
import type { MainTab } from "../types";

interface BottomNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

const items: Array<{ id: MainTab; label: string; icon: typeof Home }> = [
  { id: "today", label: "今天", icon: Home },
  { id: "calendar", label: "日历", icon: CalendarDays },
  { id: "subjects", label: "资料", icon: BookOpenText },
  { id: "timetable", label: "课表", icon: School },
  { id: "questionSearch", label: "搜题", icon: ScanSearch },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-3 left-1/2 z-30 w-[92vw] max-w-[366px] -translate-x-1/2 rounded-[30px] border border-white/80 bg-white/95 p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.18)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1 rounded-[24px] bg-[#F1F4F8] p-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              onClick={() => onTabChange(item.id)}
              className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-black transition ${
                active ? "bg-ink text-white shadow-pill" : "text-muted hover:bg-white hover:text-ink"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.8 : 2.15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
