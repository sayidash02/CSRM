/**
 * Professional Field Documentation Watermark Utility for CSRM.
 * Emits crisp, audit-grade industrial field documentation watermarks using HTML5 Canvas.
 */

export interface WatermarkOptions {
  organizationName?: string; // e.g. "CSR & COMMUNITY RELATIONS"
  activityTitle?: string; // e.g. "Koordinasi Kelompok Nelayan"
  dateText?: string; // e.g. "25 Mei 2026, 14:30 WIB"
  locationText?: string; // e.g. "Desa Cilamaya Girang, Karawang"
  picName?: string; // e.g. "Pak Maryono, Ziyadu"
  note?: string;
  position?: "bottom-left" | "bottom-right" | "bottom-strip" | "camera-stamp";
  badgeTheme?: "slate" | "navy" | "emerald" | "amber";
}

export interface WatermarkedResult {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

/**
 * Loads a File or Blob into an HTMLImageElement.
 */
export function loadImageElement(source: Blob | File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = typeof source === "string" ? source : URL.createObjectURL(source);

    img.onload = () => {
      if (typeof source !== "string") {
        URL.revokeObjectURL(url);
      }
      resolve(img);
    };
    img.onerror = (err) => {
      if (typeof source !== "string") {
        URL.revokeObjectURL(url);
      }
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Applies an authentic corporate field audit watermark overlay to a photo.
 */
export async function applyWatermarkToImage(
  source: File | Blob,
  options: WatermarkOptions,
  originalFilename?: string
): Promise<WatermarkedResult> {
  const img = await loadImageElement(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context is not available");
  }

  // Preserve 100% native image resolution
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  // Draw original image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Resolution-aware scaling (standardized around ~1400px width reference)
  const scale = Math.max(0.65, Math.min(canvas.width / 1400, 3.5));

  // Build clean metadata rows without emojis
  const org = (options.organizationName?.trim() || "CSR & COMMUNITY RELATIONS").toUpperCase();
  const rows: { label: string; value: string }[] = [];

  if (options.dateText?.trim()) {
    rows.push({ label: "TANGGAL", value: options.dateText.trim() });
  }
  if (options.locationText?.trim()) {
    rows.push({ label: "LOKASI", value: options.locationText.trim() });
  }
  if (options.activityTitle?.trim()) {
    rows.push({ label: "KEGIATAN", value: options.activityTitle.trim() });
  }
  if (options.picName?.trim()) {
    rows.push({ label: "PETUGAS", value: options.picName.trim() });
  }
  if (options.note?.trim()) {
    rows.push({ label: "CATATAN", value: options.note.trim() });
  }

  // Render chosen professional watermark style
  if (options.position === "bottom-strip") {
    drawBottomStrip(ctx, canvas.width, canvas.height, scale, org, rows, options.badgeTheme);
  } else if (options.position === "camera-stamp") {
    drawCameraStamp(ctx, canvas.width, canvas.height, scale, org, rows);
  } else {
    drawWatermarkCard(
      ctx,
      canvas.width,
      canvas.height,
      scale,
      org,
      rows,
      options.position === "bottom-right",
      options.badgeTheme
    );
  }

  // Export to high-quality JPEG
  const filename = originalFilename || (source instanceof File ? source.name : "doc_photo.jpg");
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95);
  });

  if (!blob) {
    throw new Error("Gagal mengonversi canvas ke gambar JPEG");
  }

  const watermarkedFile = new File(
    [blob],
    filename.replace(/\.(png|jpeg|jpg|webp)$/i, "_watermarked.jpg"),
    {
      type: "image/jpeg",
      lastModified: Date.now(),
    }
  );

  const previewUrl = URL.createObjectURL(blob);

  return {
    file: watermarkedFile,
    previewUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Style 1: Modern Corporate Field Audit Badge (Glassmorphism Dark Box)
 */
function drawWatermarkCard(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  orgText: string,
  rows: { label: string; value: string }[],
  isRight: boolean,
  theme?: "slate" | "navy" | "emerald" | "amber"
) {
  const margin = Math.round(28 * scale);
  const paddingX = Math.round(20 * scale);
  const paddingY = Math.round(16 * scale);
  const titleFontSize = Math.round(13 * scale);
  const labelFontSize = Math.round(11 * scale);
  const valFontSize = Math.round(12 * scale);
  const lineHeight = Math.round(20 * scale);
  const radius = Math.round(8 * scale);

  ctx.save();

  // Color schemes
  let bgGradient1 = "rgba(15, 23, 42, 0.90)"; // Slate 900
  let accentColor = "#10b981"; // Emerald
  let badgeTagBg = "rgba(16, 185, 129, 0.20)";
  let badgeTagBorder = "rgba(16, 185, 129, 0.40)";
  let badgeTagText = "#34d399";

  if (theme === "navy") {
    bgGradient1 = "rgba(10, 25, 47, 0.92)";
    accentColor = "#38bdf8"; // Sky Blue
    badgeTagBg = "rgba(56, 189, 248, 0.20)";
    badgeTagBorder = "rgba(56, 189, 248, 0.40)";
    badgeTagText = "#7dd3fc";
  } else if (theme === "amber") {
    bgGradient1 = "rgba(24, 24, 27, 0.92)";
    accentColor = "#f59e0b"; // Amber
    badgeTagBg = "rgba(245, 158, 11, 0.20)";
    badgeTagBorder = "rgba(245, 158, 11, 0.40)";
    badgeTagText = "#fbbf24";
  } else if (theme === "slate") {
    bgGradient1 = "rgba(18, 24, 38, 0.92)";
    accentColor = "#94a3b8"; // Slate Light
    badgeTagBg = "rgba(148, 163, 184, 0.18)";
    badgeTagBorder = "rgba(148, 163, 184, 0.35)";
    badgeTagText = "#cbd5e1";
  }

  // Calculate layout widths
  ctx.font = `bold ${titleFontSize}px "JetBrains Mono", "SF Mono", Consolas, -apple-system, sans-serif`;
  let maxContentWidth = ctx.measureText(orgText).width + 90 * scale;

  ctx.font = `600 ${valFontSize}px "Inter", "Segoe UI", -apple-system, Roboto, sans-serif`;
  const labelColWidth = Math.round(75 * scale);

  for (const r of rows) {
    const valWidth = ctx.measureText(r.value).width;
    const totalRowWidth = labelColWidth + valWidth;
    if (totalRowWidth > maxContentWidth) {
      maxContentWidth = totalRowWidth;
    }
  }

  const cardWidth = Math.min(maxContentWidth + paddingX * 2, canvasWidth - margin * 2);
  const headerHeight = titleFontSize + 14 * scale;
  const cardHeight = paddingY * 2 + headerHeight + rows.length * lineHeight;
  const cardX = isRight ? canvasWidth - margin - cardWidth : margin;
  const cardY = canvasHeight - margin - cardHeight;

  // Outer shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.50)";
  ctx.shadowBlur = 16 * scale;
  ctx.shadowOffsetY = 6 * scale;

  // Background Box
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, radius);
  ctx.fillStyle = bgGradient1;
  ctx.fill();

  // Subtle Border
  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.stroke();

  // Left Accent Vertical Indicator
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  drawLeftAccentBar(ctx, cardX, cardY, Math.round(4 * scale), cardHeight, radius);
  ctx.fill();

  // Draw Header: Org Name + Verified Badge
  const headerY = cardY + paddingY + titleFontSize;
  ctx.font = `bold ${titleFontSize}px "JetBrains Mono", "SF Mono", Consolas, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(orgText, cardX + paddingX + 4 * scale, headerY);

  // Verified Pill Tag
  const tagText = "AUDIT VERIFIED";
  ctx.font = `bold ${Math.round(8.5 * scale)}px "JetBrains Mono", monospace`;
  const tagWidth = ctx.measureText(tagText).width + 12 * scale;
  const tagHeight = Math.round(14 * scale);
  const tagX = cardX + cardWidth - paddingX - tagWidth;
  const tagY = headerY - Math.round(10 * scale);

  ctx.beginPath();
  drawRoundedRect(ctx, tagX, tagY, tagWidth, tagHeight, Math.round(4 * scale));
  ctx.fillStyle = badgeTagBg;
  ctx.fill();
  ctx.strokeStyle = badgeTagBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = badgeTagText;
  ctx.fillText(tagText, tagX + 6 * scale, tagY + tagHeight - 4 * scale);

  // Horizontal subtle separator line
  const sepY = cardY + paddingY + headerHeight - 2 * scale;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + paddingX, sepY);
  ctx.lineTo(cardX + cardWidth - paddingX, sepY);
  ctx.stroke();

  // Draw Key-Value Rows (No emojis, clean corporate alignment)
  let currentY = sepY + Math.round(14 * scale);

  for (const r of rows) {
    // Label (Monospace muted)
    ctx.font = `bold ${labelFontSize}px "JetBrains Mono", "SF Mono", Consolas, monospace`;
    ctx.fillStyle = "rgba(148, 163, 184, 0.85)"; // Slate 400
    ctx.fillText(r.label, cardX + paddingX + 4 * scale, currentY);

    // Separator colon
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillText(":", cardX + paddingX + labelColWidth - 10 * scale, currentY);

    // Value (Crisp white bold sans-serif)
    ctx.font = `600 ${valFontSize}px "Inter", "Segoe UI", -apple-system, sans-serif`;
    ctx.fillStyle = "#ffffff";
    const maxValWidth = cardWidth - paddingX * 2 - labelColWidth - 10 * scale;
    const truncatedVal = truncateText(ctx, r.value, maxValWidth);
    ctx.fillText(truncatedVal, cardX + paddingX + labelColWidth, currentY);

    currentY += lineHeight;
  }

  ctx.restore();
}

/**
 * Style 2: Classic Hardware Camera / GPS Stamp (Crisp Golden-Yellow Text with Black Drop Shadow)
 */
function drawCameraStamp(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  orgText: string,
  rows: { label: string; value: string }[]
) {
  const margin = Math.round(30 * scale);
  const fontSize = Math.round(14 * scale);
  const lineHeight = Math.round(20 * scale);

  ctx.save();

  // Combine rows into traditional camera overlay
  const lines: string[] = [orgText];
  for (const r of rows) {
    lines.push(`${r.label}: ${r.value}`);
  }

  ctx.font = `bold ${fontSize}px "JetBrains Mono", "Courier New", Consolas, monospace`;

  // Measure widest line
  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }

  const startX = canvasWidth - margin - maxWidth;
  let startY = canvasHeight - margin - lines.length * lineHeight;

  for (const line of lines) {
    // High contrast black stroke outline for 100% legibility on any photo
    ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
    ctx.lineWidth = Math.max(3, 3.5 * scale);
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(line, startX, startY);

    // Authentic Camera Stamp Yellow / Amber color
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(line, startX, startY);

    startY += lineHeight;
  }

  ctx.restore();
}

/**
 * Style 3: Official Bottom Audit Strip (Clean Industrial Lower-Third)
 */
function drawBottomStrip(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  orgText: string,
  rows: { label: string; value: string }[],
  theme?: "slate" | "navy" | "emerald" | "amber"
) {
  const paddingX = Math.round(28 * scale);
  const paddingY = Math.round(14 * scale);
  const titleFontSize = Math.round(13 * scale);
  const rowFontSize = Math.round(11 * scale);

  ctx.save();
  const stripHeight = paddingY * 2 + titleFontSize + 6 * scale + rowFontSize + 4 * scale;
  const stripY = canvasHeight - stripHeight;

  let bgColor = "rgba(15, 23, 42, 0.92)";
  let accentColor = "#10b981";

  if (theme === "navy") {
    bgColor = "rgba(10, 25, 47, 0.94)";
    accentColor = "#38bdf8";
  } else if (theme === "amber") {
    bgColor = "rgba(24, 24, 27, 0.94)";
    accentColor = "#f59e0b";
  }

  // Draw Strip Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, stripY, canvasWidth, stripHeight);

  // Top Accent Line
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, stripY, canvasWidth, Math.max(2, 2.5 * scale));

  // Top Row: Org Title + Subtext
  ctx.font = `bold ${titleFontSize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(orgText, paddingX, stripY + paddingY + titleFontSize);

  const metaRight = "OFFICIAL CSR DOCUMENTATION • AUDIT COMPLIANT";
  ctx.font = `bold ${Math.round(10 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  const rightWidth = ctx.measureText(metaRight).width;
  ctx.fillText(metaRight, canvasWidth - paddingX - rightWidth, stripY + paddingY + titleFontSize);

  // Bottom Row: Joined Metadata
  const joinedItems = rows.map((r) => `${r.label}: ${r.value}`).join("  |  ");
  ctx.font = `600 ${rowFontSize}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.90)";
  ctx.fillText(
    truncateText(ctx, joinedItems, canvasWidth - paddingX * 2),
    paddingX,
    stripY + paddingY + titleFontSize + 8 * scale + rowFontSize
  );

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawLeftAccentBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  barWidth: number,
  height: number,
  radius: number
) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + barWidth, y);
  ctx.lineTo(x + barWidth, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}
