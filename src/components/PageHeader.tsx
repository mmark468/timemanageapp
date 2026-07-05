import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, onBack, action }: PageHeaderProps) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3 md:col-span-full">
      <div className="flex min-w-0 gap-3">
        {onBack ? (
          <button
            type="button"
            aria-label="返回"
            onClick={onBack}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-ink shadow-soft transition hover:-translate-y-0.5"
          >
            <ChevronLeft size={22} />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight tracking-normal text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
