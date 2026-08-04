import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";

export interface DateRange {
  start: string;
  end: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [local, setLocal] = useState<DateRange>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setLocal(value);
  }, [isOpen, value]);

  const handleApply = () => {
    let toApply = { ...local };
    if (toApply.start && toApply.end && toApply.start > toApply.end) {
      toApply = { start: local.end, end: local.start };
    }
    onChange(toApply);
    setIsOpen(false);
  };

  const handleReset = () => {
    const empty = { start: "", end: "" };
    setLocal(empty);
    onChange(empty);
    setIsOpen(false);
  };

  const setPreset = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    
    const fmt = (d: Date) => 
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const range = { start: fmt(start), end: fmt(end) };
    
    setLocal(range);
    onChange(range);
    setIsOpen(false);
  };

  const getLabel = () => {
    if (value.start && value.end) return `${value.start} s/d ${value.end}`;
    if (value.start) return `>= ${value.start}`;
    if (value.end) return `<= ${value.end}`;
    return "Semua Tanggal";
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-border rounded-md hover:bg-muted transition-colors whitespace-nowrap"
      >
        <Calendar size={13} />
        {getLabel()}
      </button>

      {isOpen && (
        <div 
          role="dialog"
          aria-label="Filter Rentang Tanggal"
          className="absolute right-0 top-full mt-1 w-72 bg-white border border-border rounded-md shadow-lg z-50 p-3"
        >
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            <button type="button" onClick={() => setPreset(0)} className="px-2 py-1 text-xs bg-muted border border-border rounded hover:bg-blue-50 text-foreground">Hari Ini</button>
            <button type="button" onClick={() => setPreset(7)} className="px-2 py-1 text-xs bg-muted border border-border rounded hover:bg-blue-50 text-foreground">7 Hari</button>
            <button type="button" onClick={() => setPreset(30)} className="px-2 py-1 text-xs bg-muted border border-border rounded hover:bg-blue-50 text-foreground">30 Hari</button>
          </div>
          
          <div className="space-y-2 mb-3">
            <div>
              <label htmlFor="start_date" className="text-xs text-muted-foreground block mb-1">Dari</label>
              <input 
                id="start_date"
                type="date" 
                value={local.start} 
                onChange={e => setLocal({...local, start: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-border bg-input-background rounded focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="text-xs text-muted-foreground block mb-1">Sampai</label>
              <input 
                id="end_date"
                type="date" 
                value={local.end} 
                onChange={e => setLocal({...local, end: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-border bg-input-background rounded focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleReset} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-transparent rounded">Reset</button>
            <button type="button" onClick={handleApply} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-blue-700 rounded">Terapkan</button>
          </div>
        </div>
      )}
    </div>
  );
}

