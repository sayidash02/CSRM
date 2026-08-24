import { describe, it, expect } from "vitest";
import { applyDateString, extractExifFromBlob, type PhotoExifMetadata } from "./exifUtils";

describe("exifUtils", () => {
  it("parses valid EXIF date string in standard format", () => {
    const meta: PhotoExifMetadata = { hasExif: true };
    applyDateString("2026:05:25 14:30:15", meta);

    expect(meta.dateTakenIso).toBe("2026-05-25");
    expect(meta.dateTimeFormatted).toBe("25/05/2026 14:30:15");
    expect(meta.dateTaken).toBeInstanceOf(Date);
    expect(meta.dateTaken?.getFullYear()).toBe(2026);
    expect(meta.dateTaken?.getMonth()).toBe(4); // 0-indexed May
    expect(meta.dateTaken?.getDate()).toBe(25);
  });

  it("parses date string with dashes", () => {
    const meta: PhotoExifMetadata = { hasExif: true };
    applyDateString("2026-08-21 09:15:00", meta);

    expect(meta.dateTakenIso).toBe("2026-08-21");
    expect(meta.dateTimeFormatted).toBe("21/08/2026 09:15:00");
  });

  it("handles empty or invalid date string gracefully", () => {
    const meta: PhotoExifMetadata = { hasExif: true };
    applyDateString("", meta);
    expect(meta.dateTakenIso).toBeUndefined();

    applyDateString("invalid-date", meta);
    expect(meta.dateTakenIso).toBeUndefined();
  });

  it("extracts from empty or non-JPEG blob gracefully without throwing", async () => {
    const blob = new Blob(["not a jpeg image"], { type: "text/plain" });
    const result = await extractExifFromBlob(blob);

    expect(result.hasExif).toBe(false);
    expect(result.dateTakenIso).toBeUndefined();
  });
});
