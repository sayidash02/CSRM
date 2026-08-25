import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { PeriodDatePicker, formatPeriodRange } from "./PeriodDatePicker";

describe("PeriodDatePicker", () => {
  it("formats single date correctly", () => {
    expect(formatPeriodRange("2026-07-21", "2026-07-21")).toBe("21 Juli 2026");
  });

  it("formats date range in same month and year correctly", () => {
    expect(formatPeriodRange("2026-07-21", "2026-07-25")).toBe("21 - 25 Juli 2026");
  });

  it("formats date range in different months same year correctly", () => {
    expect(formatPeriodRange("2026-01-01", "2026-03-31")).toBe("1 Januari - 31 Maret 2026");
  });

  it("formats date range across different years correctly", () => {
    expect(formatPeriodRange("2025-12-20", "2026-01-10")).toBe("20 Desember 2025 - 10 Januari 2026");
  });

  it("renders calendar inputs and preset buttons properly", () => {
    const html = renderToString(
      <PeriodDatePicker
        value="21 - 25 Juli 2026"
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Tanggal Mulai");
    expect(html).toContain("Tanggal Selesai");
    expect(html).toContain("Hari Ini");
    expect(html).toContain("Bulan Ini");
    expect(html).toContain("Q1 (Jan-Mar)");
    expect(html).toContain("21 - 25 Juli 2026");
  });
});
