import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  color?: "blue" | "yellow" | "pink" | "green" | "purple" | "white";
  onClick?: () => void;
}

const selectedColor = {
  blue: "bg-sky text-ink shadow-pill",
  yellow: "bg-lemon text-ink shadow-pill",
  pink: "bg-peach text-ink shadow-pill",
  green: "bg-mint text-ink shadow-pill",
  purple: "bg-lavender text-ink shadow-pill",
  white: "bg-white text-ink shadow-soft",
};

export function Chip({ children, selected = false, color = "blue", onClick }: ChipProps) {
  const className = `inline-flex min-h-9 items-center justify-center rounded-full border px-4 text-sm font-semibold transition ${
    selected ? `${selectedColor[color]} border-transparent` : "border-white/80 bg-white/70 text-muted hover:bg-white hover:text-ink"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return <span className={className}>{children}</span>;
}
