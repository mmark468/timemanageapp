import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import type { MainTab } from "../types";

export interface DesktopNavItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}

interface AppLayoutProps {
  activeTab: MainTab;
  children: ReactNode;
  navItems: DesktopNavItem[];
  showNavigation: boolean;
  studentName?: string;
  onTabChange: (tab: MainTab) => void;
}

export function AppLayout({
  activeTab,
  children,
  navItems,
  showNavigation,
  studentName,
  onTabChange,
}: AppLayoutProps) {
  return (
    <div
      className={`app-layout min-h-dvh px-0 sm:px-6 sm:py-5 md:h-dvh md:overflow-hidden md:px-5 md:py-5 lg:px-8 ${
        showNavigation ? "app-layout--with-navigation" : "app-layout--single"
      }`}
    >
      {showNavigation ? (
        <DesktopLayout navItems={navItems} studentName={studentName}>
          <MobileLayout activeTab={activeTab} onTabChange={onTabChange} showNavigation={showNavigation}>
            {children}
          </MobileLayout>
        </DesktopLayout>
      ) : (
        <div className="mx-auto min-h-dvh w-full max-w-[390px]">
          <MobileLayout activeTab={activeTab} onTabChange={onTabChange} showNavigation={showNavigation}>
            {children}
          </MobileLayout>
        </div>
      )}
    </div>
  );
}

function MobileLayout({
  activeTab,
  children,
  showNavigation,
  onTabChange,
}: {
  activeTab: MainTab;
  children: ReactNode;
  showNavigation: boolean;
  onTabChange: (tab: MainTab) => void;
}) {
  return (
    <section
      className={`app-phone-frame relative mx-auto min-h-dvh w-full max-w-[390px] border-x border-white/70 bg-cream shadow-[0_22px_70px_rgba(15,23,42,0.14)] sm:rounded-[34px] ${
        showNavigation
          ? "md:mx-0 md:h-[calc(100dvh-40px)] md:min-h-0 md:max-w-none md:overflow-y-auto md:rounded-[34px] md:border md:border-white/70 md:shadow-[0_22px_70px_rgba(15,23,42,0.10)]"
          : ""
      }`}
    >
      {children}
      {showNavigation ? <BottomNav activeTab={activeTab} onTabChange={onTabChange} /> : null}
    </section>
  );
}

function DesktopLayout({
  children,
  navItems,
  studentName,
}: {
  children: ReactNode;
  navItems: DesktopNavItem[];
  studentName?: string;
}) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-[390px] md:min-h-0 md:max-w-[1440px] md:grid-cols-[220px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)]">
      <DesktopSidebar navItems={navItems} studentName={studentName} />
      {children}
    </div>
  );
}

function DesktopSidebar({ navItems, studentName }: { navItems: DesktopNavItem[]; studentName?: string }) {
  return (
    <aside className="sticky top-5 hidden h-[calc(100dvh-40px)] min-h-0 flex-col rounded-[34px] border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur-xl md:flex">
      <div className="rounded-[28px] bg-cream p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">时间规划</p>
        <h2 className="mt-2 text-xl font-black leading-tight text-ink">{studentName || "同学"}的学习空间</h2>
        <p className="mt-2 text-xs font-bold leading-5 text-muted">课程、日历、任务和搜题集中管理。</p>
      </div>

      <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-[28px] bg-white/65 p-2 shadow-none">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`grid grid-cols-[42px_1fr] items-center gap-3 rounded-[22px] p-2.5 text-left transition ${
                item.active ? "bg-ink text-white shadow-pill" : "text-muted hover:bg-cream hover:text-ink"
              }`}
            >
              <span
                className={`grid h-[42px] w-[42px] place-items-center rounded-[17px] ${
                  item.active ? "bg-white/18 text-white" : "bg-cream text-ink"
                }`}
              >
                <Icon size={18} strokeWidth={item.active ? 2.8 : 2.2} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{item.label}</span>
                <span className={`mt-0.5 block truncate text-[11px] font-bold ${item.active ? "text-white/72" : "text-muted"}`}>
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
