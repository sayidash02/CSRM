import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { PhotoGalleryAttachmentInput, type AttachedPhoto } from "./PhotoGalleryAttachmentInput";

describe("PhotoGalleryAttachmentInput", () => {
  it("renders upload button and auto-watermark toggle when empty", () => {
    const html = renderToString(
      <PhotoGalleryAttachmentInput
        value={[]}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Galeri Dokumentasi Foto");
    expect(html).toContain("Auto Watermark Audit");
    expect(html).toContain("Upload Foto Kegiatan Lapangan");
  });

  it("renders photos with EXIF date and watermark badges when photos provided", () => {
    const mockPhotos: AttachedPhoto[] = [
      {
        id: 1,
        url: "/api/daily-activities/10/photos/1",
        original_name: "dokumentasi_kegiatan_1.jpg",
        mime_type: "image/jpeg",
        size_bytes: 1024000,
        isWatermarked: true,
        exif: {
          hasExif: true,
          dateTakenIso: "2026-05-25",
          dateTimeFormatted: "25/05/2026 10:30:00",
          latitude: -6.2088,
          longitude: 106.8456,
        },
      },
    ];

    const html = renderToString(
      <PhotoGalleryAttachmentInput
        value={mockPhotos}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain("Galeri Dokumentasi Foto");
    expect(html).toContain("Watermarked");
    expect(html).toContain("2026-05-25");
    expect(html).toContain("GPS");
    expect(html).toContain("dokumentasi_kegiatan_1.jpg");
  });
});
