import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4"
      onMouseDown={() => { mouseDownOnBackdrop.current = true; }}
      onMouseUp={() => {
        if (mouseDownOnBackdrop.current) onClose();
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-2xl border border-line shadow-2xl w-full ${
          size === "lg" ? "max-w-3xl" : "max-w-2xl"
        } max-h-[92vh] flex flex-col overflow-hidden text-ink`}
        onMouseDown={(e) => { e.stopPropagation(); mouseDownOnBackdrop.current = false; }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-paper/30 shrink-0">
          <h2 className="text-[14px] sm:text-[15px] font-semibold text-ink tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg hover:bg-paper-2 text-slate hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function ModalFooter({
  onClose,
  onSave,
  onClear,
  saveLabel = "Simpan",
  isEdit,
  disableSave,
  saveType = "button",
}: {
  onClose: () => void;
  onSave: () => void;
  onClear?: () => void;
  saveLabel?: string;
  isEdit?: boolean;
  disableSave?: boolean;
  saveType?: "button" | "submit";
}) {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-line flex gap-2 sm:gap-2.5 justify-end bg-paper/40 shrink-0 flex-wrap">
      {onClear && (
        <button
          onClick={onClear}
          type="button"
          className="px-4 py-2 text-[13px] text-slate font-medium border border-line rounded-lg hover:bg-paper-2 hover:text-ink transition-colors mr-auto"
        >
          Bersihkan
        </button>
      )}
      <button
        onClick={onClose}
        type="button"
        className="px-4 py-2 text-[13px] text-slate font-medium border border-line rounded-lg hover:bg-paper-2 hover:text-ink transition-colors"
      >
        Batal
      </button>
      <button
        type={saveType}
        onClick={onSave}
        disabled={disableSave}
        className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 text-white shadow-2xs ${
          disableSave
            ? "bg-slate-2 opacity-50 cursor-not-allowed"
            : isEdit
            ? "bg-ochre hover:opacity-90"
            : "bg-forest hover:bg-forest-2"
        }`}
      >
        {saveLabel}
      </button>
    </div>
  );
}
