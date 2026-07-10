import { useEffect, useState } from "react";
import { SubjectIcon, studyIconOptions } from "../../../components/SubjectIcon";
import { SUBJECT_COLOR_OPTIONS } from "../constants";
import type { LibrarySubject, SubjectDraft } from "../types";
import { LibraryModal } from "./LibraryModal";

export function SubjectEditorDialog({
  subject,
  onClose,
  onSave,
}: {
  subject?: LibrarySubject;
  onClose: () => void;
  onSave: (draft: SubjectDraft) => Promise<void>;
}) {
  const [name, setName] = useState(subject?.name ?? "");
  const [icon, setIcon] = useState<SubjectDraft["icon"]>(subject?.icon ?? "literature");
  const [color, setColor] = useState(subject?.color ?? SUBJECT_COLOR_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(subject?.name ?? "");
    setIcon(subject?.icon ?? "literature");
    setColor(subject?.color ?? SUBJECT_COLOR_OPTIONS[0]);
  }, [subject]);

  const save = async () => {
    if (!name.trim()) {
      setError("请输入科目名称");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({ name: name.trim(), icon, color });
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "保存科目失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <LibraryModal
      title={subject ? "编辑科目" : "新建科目"}
      subtitle="名称、图标和颜色都可以随时修改。"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-[1fr_1.5fr] gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-full bg-cream text-sm font-black text-ink">
            取消
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="h-11 rounded-full bg-ink text-sm font-black text-white disabled:opacity-60"
          >
            {busy ? "保存中…" : "保存科目"}
          </button>
        </div>
      }
    >
      <label className="block text-sm font-black text-ink">
        科目名称
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如 Mathematics"
          className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-bold outline-none"
        />
      </label>

      <div className="mt-5">
        <p className="text-sm font-black text-ink">科目图标</p>
        <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-7">
          {studyIconOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setIcon(option.key)}
              className="grid justify-items-center gap-1 rounded-[18px] p-1 text-[10px] font-black text-muted hover:bg-cream"
              aria-label={option.label}
            >
              <SubjectIcon iconKey={option.key} label={option.label} size="sm" selected={option.key === icon} />
              <span className="w-full truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-black text-ink">卡片颜色</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUBJECT_COLOR_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              className={`h-11 w-11 rounded-full border-4 transition ${color === option ? "scale-105 border-ink" : "border-white"}`}
              style={{ backgroundColor: option }}
              aria-label={`选择颜色 ${option}`}
            />
          ))}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-[16px] bg-[#FFF1EE] p-3 text-sm font-bold text-[#9B4D3F]">{error}</p> : null}
    </LibraryModal>
  );
}
