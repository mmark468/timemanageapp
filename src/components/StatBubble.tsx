interface StatBubbleProps {
  label: string;
  value: string;
  color: string;
}

export function StatBubble({ label, value, color }: StatBubbleProps) {
  return (
    <div className="rounded-[24px] bg-white/80 p-4 shadow-soft">
      <div
        className="mb-3 flex h-8 w-8 items-center justify-center rounded-full text-sm"
        style={{ backgroundColor: color }}
      >
        ✦
      </div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-lg font-black text-ink">{value}</p>
    </div>
  );
}
