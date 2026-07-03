import type { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  color?: "blue" | "yellow" | "pink" | "green" | "purple" | "white";
  onClick?: () => void;
}

const selectedColor = {
  blue: "bg-[#1E3A8A] text-white shadow-pill",
  yellow: "bg-[#854D0E] text-white shadow-pill",
  pink: "bg-[#9F1239] text-white shadow-pill",
  green: "bg-[#14532D] text-white shadow-pill",
  purple: "bg-[#5B21B6] text-white shadow-pill",
  white: "bg-ink text-white shadow-pill",
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
