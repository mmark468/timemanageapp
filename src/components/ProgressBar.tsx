interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
}

export function ProgressBar({ value, color = "#8ECDEB", className = "" }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`h-3 overflow-hidden rounded-full bg-white/70 ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${safeValue}%`, backgroundColor: color }}
      />
    </div>
  );
}
