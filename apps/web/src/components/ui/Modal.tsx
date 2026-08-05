import React, { useRef, useEffect } from 'react';
import { X, Check, Edit2 } from 'lucide-react';

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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
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
        className={`bg-card rounded-2xl border border-border shadow-2xl w-full ${size === "lg" ? "max-w-3xl" : "max-w-2xl"} max-h-[92vh] flex flex-col`}
        onMouseDown={(e) => { e.stopPropagation(); mouseDownOnBackdrop.current = false; }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
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
}: {
  onClose: () => void;
  onSave: () => void;
  onClear?: () => void;
  saveLabel?: string;
  isEdit?: boolean;
  disableSave?: boolean;
}) {
  return (
    <div className="px-6 py-4 border-t border-border flex gap-2 justify-end bg-muted/20 rounded-b-2xl shrink-0">
      {onClear && (
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors mr-auto"
        >
          Bersihkan
        </button>
      )}
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
      >
        Batal
      </button>
      <button
        onClick={onSave}
        disabled={disableSave}
        className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-1.5 text-white ${
          disableSave
            ? "bg-gray-300 cursor-not-allowed text-gray-500"
            : isEdit
            ? "bg-amber-500 hover:bg-amber-600"
            : "bg-primary hover:bg-blue-700"
        }`}
      >
        {isEdit ? <Edit2 size={13} /> : <Check size={13} />}
        {saveLabel}
      </button>
    </div>
  );
}
