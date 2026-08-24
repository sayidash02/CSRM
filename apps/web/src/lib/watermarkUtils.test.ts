import { describe, it, expect, vi } from "vitest";
import { type WatermarkOptions } from "./watermarkUtils";

describe("watermarkUtils", () => {
  it("defines default watermark structure properly", () => {
    const opts: WatermarkOptions = {
      organizationName: "CSR & COMMUNITY RELATIONS | ARSIP AUDIT",
      dateText: "25 Mei 2026",
      locationText: "Cilamaya Girang",
      activityTitle: "Koordinasi Nelayan",
      position: "bottom-left",
      badgeTheme: "slate",
    };

    expect(opts.organizationName).toContain("CSR & COMMUNITY RELATIONS");
    expect(opts.dateText).toBe("25 Mei 2026");
    expect(opts.locationText).toBe("Cilamaya Girang");
    expect(opts.position).toBe("bottom-left");
  });
});
