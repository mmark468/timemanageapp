import { ChevronLeft, Pause, Play, RotateCcw, Settings2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PomodoroSession, PomodoroTarget } from "../types";
import { minutesToText, TODAY } from "../utils/date";
import { useStoredState } from "../utils/storage";

interface FocusPageProps {
  target: PomodoroTarget;
  sessions: PomodoroSession[];
  onBack: () => void;
  onUpdateTargetTitle: (title: string) => void;
  onCompleteSession: (duration: number) => void;
}

interface FocusSettings {
  focusDuration: number;
  breakDuration: number;
  breakEvery: number;
}

const defaultFocusSettings: FocusSettings = {
  focusDuration: 30,
  breakDuration: 5,
  breakEvery: 1,
};

type TimerMode = "focus" | "break";

function formatSeconds(seconds: number) {
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function FocusPage({ target, sessions, onBack, onUpdateTargetTitle, onCompleteSession }: FocusPageProps) {
  const [settings, setSettings] = useStoredState<FocusSettings>("finished.focusSettings", defaultFocusSettings);
  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(() => settings.focusDuration * 60);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [focusRoundsSinceBreak, setFocusRoundsSinceBreak] = useState(0);

  const targetTitle = useMemo(() => target.taskTitle || "自定义专注", [target.taskTitle]);
  const todaySessions = sessions.filter((session) => session.completedAt.startsWith(TODAY));
  const todayMinutes = todaySessions.reduce((sum, session) => sum + session.duration, 0);
  const totalSeconds = (timerMode === "focus" ? settings.focusDuration : settings.breakDuration) * 60;
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100)) : 0;

  const updateFocusDuration = (value: number) => {
    const duration = clampNumber(value, 1, 180, settings.focusDuration);
    setSettings((current) => ({ ...current, focusDuration: duration }));
    if (!running && timerMode === "focus") setSecondsLeft(duration * 60);
  };

  const updateBreakDuration = (value: number) => {
    const duration = clampNumber(value, 1, 60, settings.breakDuration);
    setSettings((current) => ({ ...current, breakDuration: duration }));
    if (!running && timerMode === "break") setSecondsLeft(duration * 60);
  };

  const updateBreakEvery = (value: number) => {
    const interval = clampNumber(value, 1, 8, settings.breakEvery);
    setSettings((current) => ({ ...current, breakEvery: interval }));
  };

  const resetTimer = (nextMode = timerMode) => {
    const duration = nextMode === "focus" ? settings.focusDuration : settings.breakDuration;
    setRunning(false);
    setTimerMode(nextMode);
    setSecondsLeft(duration * 60);
  };

  const completeBreak = () => {
    setRunning(false);
    setTimerMode("focus");
    setSecondsLeft(settings.focusDuration * 60);
  };

  const completeFocusRound = (autoStartBreak = true) => {
    onCompleteSession(settings.focusDuration);
    const nextRoundCount = focusRoundsSinceBreak + 1;
    const shouldBreak = nextRoundCount >= settings.breakEvery;

    if (shouldBreak) {
      setFocusRoundsSinceBreak(0);
      setTimerMode("break");
      setSecondsLeft(settings.breakDuration * 60);
      setRunning(autoStartBreak);
      return;
    }

    setFocusRoundsSinceBreak(nextRoundCount);
    setRunning(false);
    setTimerMode("focus");
    setSecondsLeft(settings.focusDuration * 60);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          if (timerMode === "focus") {
            completeFocusRound(true);
          } else {
            completeBreak();
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, timerMode, settings.focusDuration, settings.breakDuration, settings.breakEvery, focusRoundsSinceBreak]);

  const modeLabel = timerMode === "focus" ? "专注" : "休息";
  const actionLabel = timerMode === "focus" ? "开始专注" : "开始休息";

  return (
    <main className="flex min-h-screen flex-col bg-cream px-5 pb-8 pt-6 text-ink">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs font-black text-muted">{modeLabel}番茄钟</p>
          <input
            value={targetTitle}
            onChange={(event) => onUpdateTargetTitle(event.target.value)}
            className="mt-1 w-full truncate bg-transparent text-center text-base font-black text-ink outline-none"
            placeholder="自定义专注"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((current) => !current)}
          aria-label="番茄钟设置"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-soft"
        >
          <Settings2 size={19} />
        </button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <div
          className={`grid h-72 w-72 place-items-center rounded-full shadow-[inset_0_0_0_18px_rgba(255,255,255,0.72)] ${
            timerMode === "focus" ? "bg-white" : "bg-mint"
          }`}
        >
          <div>
            <p className="text-sm font-black text-muted">{running ? `${modeLabel}中` : "准备好就开始"}</p>
            <p className="mt-4 text-7xl font-black leading-none tracking-normal text-ink">{formatSeconds(secondsLeft)}</p>
            <div className="mx-auto mt-5 h-2 w-36 overflow-hidden rounded-full bg-cream">
              <span className="block h-full rounded-full bg-ink transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-4 text-xs font-bold text-muted">
              {timerMode === "focus" ? `${settings.focusDuration} 分钟专注` : `${settings.breakDuration} 分钟休息`}
            </p>
          </div>
        </div>

        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setRunning(true)}
            className="flex h-14 items-center justify-center gap-1 rounded-full bg-ink text-sm font-black text-white shadow-pill"
          >
            <Play size={17} />
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={() => setRunning(false)}
            className="flex h-14 items-center justify-center gap-1 rounded-full bg-white text-sm font-black text-ink shadow-soft"
          >
            <Pause size={17} />
            暂停
          </button>
          <button
            type="button"
            onClick={() => resetTimer()}
            className="flex h-14 items-center justify-center gap-1 rounded-full bg-white text-sm font-black text-ink shadow-soft"
          >
            <RotateCcw size={17} />
            重置
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (timerMode === "focus") {
              completeFocusRound(true);
            } else {
              completeBreak();
            }
          }}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky text-sm font-black text-ink shadow-soft"
        >
          <Trophy size={17} />
          {timerMode === "focus" ? "完成本轮" : "结束休息"}
        </button>
      </section>

      {showSettings ? (
        <section className="rounded-[28px] bg-white p-4 shadow-soft">
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="专注" value={settings.focusDuration} min={1} max={180} onChange={updateFocusDuration} />
            <NumberField label="每几轮" value={settings.breakEvery} min={1} max={8} onChange={updateBreakEvery} />
            <NumberField label="休息" value={settings.breakDuration} min={1} max={60} onChange={updateBreakDuration} />
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] bg-white p-4 shadow-soft">
            <p className="text-xs font-black text-muted">今日完成</p>
            <p className="mt-1 text-2xl font-black text-ink">{todaySessions.length} 组</p>
          </div>
          <div className="rounded-[24px] bg-white p-4 shadow-soft">
            <p className="text-xs font-black text-muted">今日专注</p>
            <p className="mt-1 text-2xl font-black text-ink">{minutesToText(todayMinutes)}</p>
          </div>
        </section>
      )}
    </main>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-muted">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-11 w-full rounded-[16px] border border-transparent bg-cream px-3 text-sm font-black outline-none focus:border-sky"
      />
    </label>
  );
}
