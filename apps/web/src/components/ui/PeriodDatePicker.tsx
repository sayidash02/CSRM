import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, CalendarRange, Clock } from "lucide-react";

interface PeriodDatePickerProps {
  value: string;
  onChange: (formattedText: string, metadata?: { startDate?: string; endDate?: string; year?: number }) => void;
  placeholder?: string;
  className?: string;
  defaultYear?: number;
}

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatDateIndo(dateStr: string): { day: number; monthName: string; monthIndex: number; year: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return {
    day,
    monthIndex: month,
    monthName: INDONESIAN_MONTHS[month] || "",
    year
  };
}

export function formatPeriodRange(startIso: string, endIso: string): string {
  if (!startIso && !endIso) return "";
  if (startIso && !endIso) {
    const s = formatDateIndo(startIso);
    return s ? `${s.day} ${s.monthName} ${s.year}` : startIso;
  }
  if (!startIso && endIso) {
    const e = formatDateIndo(endIso);
    return e ? `${e.day} ${e.monthName} ${e.year}` : endIso;
  }

  const s = formatDateIndo(startIso);
  const e = formatDateIndo(endIso);
  if (!s || !e) return `${startIso} - ${endIso}`;

  if (startIso === endIso) {
    return `${s.day} ${s.monthName} ${s.year}`;
  }

  // Same month and same year: e.g. "21 - 25 Juli 2026"
  if (s.monthIndex === e.monthIndex && s.year === e.year) {
    return `${s.day} - ${e.day} ${s.monthName} ${s.year}`;
  }

  // Different month, same year: e.g. "21 Juli - 15 Agustus 2026"
  if (s.year === e.year) {
    return `${s.day} ${s.monthName} - ${e.day} ${e.monthName} ${s.year}`;
  }

  // Different year: e.g. "21 Des 2025 - 15 Jan 2026"
  return `${s.day} ${s.monthName} ${s.year} - ${e.day} ${e.monthName} ${e.year}`;
}

export function PeriodDatePicker({
  value,
  onChange,
  placeholder = "Pilih rentang tanggal atau ketik periode",
  className = "",
  defaultYear
}: PeriodDatePickerProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [customText, setCustomText] = useState<string>(value || "");
  const [mode, setMode] = useState<"calendar" | "custom">("calendar");

  // Sync internal state with external value
  useEffect(() => {
    setCustomText(value || "");
    
    // Try to extract ISO dates if value matches YYYY-MM-DD or standard patterns
    const isoMatches = value?.match(/\b(\d{4}-\d{2}-\d{2})\b/g);
    if (isoMatches && isoMatches.length >= 2) {
      setStartDate(isoMatches[0]);
      setEndDate(isoMatches[1]);
    } else if (isoMatches && isoMatches.length === 1) {
      setStartDate(isoMatches[0]);
      setEndDate(isoMatches[0]);
    }
  }, [value]);

  const handleDateChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    
    if (newStart || newEnd) {
      const formatted = formatPeriodRange(newStart, newEnd);
      setCustomText(formatted);
      const parsedYear = newStart ? parseInt(newStart.split("-")[0], 10) : defaultYear || new Date().getFullYear();
      onChange(formatted, {
        startDate: newStart,
        endDate: newEnd,
        year: parsedYear
      });
    }
  };

  const applyPreset = (type: "today" | "this_month" | "q1" | "q2" | "q3" | "q4") => {
    const yr = defaultYear || new Date().getFullYear();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    let s = "";
    let e = "";

    if (type === "today") {
      s = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      e = s;
    } else if (type === "this_month") {
      const m = now.getMonth() + 1;
      const lastDay = new Date(yr, m, 0).getDate();
      s = `${yr}-${pad(m)}-01`;
      e = `${yr}-${pad(m)}-${pad(lastDay)}`;
    } else if (type === "q1") {
      s = `${yr}-01-01`;
      e = `${yr}-03-31`;
    } else if (type === "q2") {
      s = `${yr}-04-01`;
      e = `${yr}-06-30`;
    } else if (type === "q3") {
      s = `${yr}-07-01`;
      e = `${yr}-09-30`;
    } else if (type === "q4") {
      s = `${yr}-10-01`;
      e = `${yr}-12-31`;
    }

    handleDateChange(s, e);
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    const yearMatch = text.match(/\b(19\d\d|20\d\d|2100)\b/)?.[1];
    onChange(text, {
      year: yearMatch ? parseInt(yearMatch, 10) : defaultYear || new Date().getFullYear()
    });
  };

  return (
    <div className="space-y-2">
      {/* Date Pickers Container */}
      <div className="bg-paper/40 p-2.5 rounded-xl border border-line space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] font-medium text-slate flex items-center gap-1 mb-1">
              <CalendarIcon size={12} className="text-forest" />
              <span>Tanggal Mulai</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate || e.target.value)}
              className="w-full text-xs rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-all font-mono"
            />
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate flex items-center gap-1 mb-1">
              <CalendarRange size={12} className="text-forest" />
              <span>Tanggal Selesai</span>
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => handleDateChange(startDate || e.target.value, e.target.value)}
              className="w-full text-xs rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-all font-mono"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-line/60">
          <span className="text-[10px] font-semibold text-slate uppercase tracking-wider mr-1">Pintas:</span>
          <button
            type="button"
            onClick={() => applyPreset("today")}
            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white hover:bg-paper border border-line text-slate hover:text-forest transition-colors cursor-pointer shadow-2xs"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset("this_month")}
            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white hover:bg-paper border border-line text-slate hover:text-forest transition-colors cursor-pointer shadow-2xs"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset("q1")}
            className="px-2 py-0.5 text-[11px] font-mono text-slate hover:text-forest bg-white hover:bg-paper border border-line rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            Q1 (Jan-Mar)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("q2")}
            className="px-2 py-0.5 text-[11px] font-mono text-slate hover:text-forest bg-white hover:bg-paper border border-line rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            Q2 (Apr-Jun)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("q3")}
            className="px-2 py-0.5 text-[11px] font-mono text-slate hover:text-forest bg-white hover:bg-paper border border-line rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            Q3 (Jul-Sep)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("q4")}
            className="px-2 py-0.5 text-[11px] font-mono text-slate hover:text-forest bg-white hover:bg-paper border border-line rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            Q4 (Okt-Des)
          </button>
        </div>
      </div>

      {/* Result Display & Manual Input */}
      <div className="relative">
        <input
          type="text"
          value={customText}
          onChange={(e) => handleCustomTextChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full text-xs rounded-lg border border-line bg-paper/30 px-3 py-2 text-ink outline-none focus:border-forest focus:bg-white transition-all font-medium ${className}`}
        />
        {customText && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate bg-paper px-1.5 py-0.5 rounded border border-line pointer-events-none">
            Teks Periode
          </span>
        )}
      </div>
    </div>
  );
}
