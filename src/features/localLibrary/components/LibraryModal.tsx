import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function LibraryModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#111827]/35 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`library-modal max-h-[92dvh] w-full ${width} overflow-hidden rounded-t-[30px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:rounded-[30px]`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-black text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm font-bold leading-5 text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-ink"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[calc(92dvh-150px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <footer className="border-t border-black/5 bg-white px-5 py-4 sm:px-6">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  busy = false,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  return (
    <LibraryModal
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="h-11 rounded-full bg-cream text-sm font-black text-ink">
            取消
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            className="h-11 rounded-full bg-[#B45E4D] text-sm font-black text-white disabled:opacity-60"
          >
            {busy ? "处理中…" : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="rounded-[20px] bg-[#FFF1EE] p-4 text-sm font-bold leading-6 text-[#8F4638]">{message}</p>
    </LibraryModal>
  );
}
