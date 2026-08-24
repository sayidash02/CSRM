/**
 * Watermarking utility for field documentation photos.
 * Emits crisp, high-resolution watermarked images using HTML5 Canvas.
 */

export interface WatermarkOptions {
  organizationName?: string; // e.g. "CSR & COMMUNITY RELATIONS"
  activityTitle?: string; // e.g. "Koordinasi Kelompok Nelayan"
  dateText?: string; // e.g. "25/05/2026" or "25 Mei 2026"
  locationText?: string; // e.g. "Cilamaya Girang, Karawang"
  note?: string;
  position?: "bottom-left" | "bottom-right" | "bottom-strip";
  badgeTheme?: "slate" | "navy" | "emerald";
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
 * Applies a professional audit watermark overlay to a photo.
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

  // Preserve image resolution
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  // Draw background image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Scaling factor proportional to image size (standardized around ~1200px width)
  const scale = Math.max(0.65, Math.min(canvas.width / 1200, 3.5));

  // Build rows of watermark text
  const org = options.organizationName?.trim() || "CSR & COMMUNITY RELATIONS | DOKUMENTASI KEGIATAN";
  const rows: { icon: string; label: string; value: string }[] = [];

  if (options.dateText?.trim()) {
    rows.push({ icon: "📅", label: "Tgl:", value: options.dateText.trim() });
  }
  if (options.locationText?.trim()) {
    rows.push({ icon: "📍", label: "Lokasi:", value: options.locationText.trim() });
  }
  if (options.activityTitle?.trim()) {
    rows.push({ icon: "🏷️", label: "Kegiatan:", value: options.activityTitle.trim() });
  }
  if (options.note?.trim()) {
    rows.push({ icon: "📝", label: "Catatan:", value: options.note.trim() });
  }

  // Draw overlay badge
  if (options.position === "bottom-strip") {
    drawBottomStrip(ctx, canvas.width, canvas.height, scale, org, rows, options.badgeTheme);
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

  // Export to JPEG File
  const filename = originalFilename || (source instanceof File ? source.name : "watermarked_photo.jpg");
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
  });

  if (!blob) {
    throw new Error("Gagal mengonversi canvas ke gambar JPEG");
  }

  const watermarkedFile = new File([blob], filename.replace(/\.(png|jpeg|jpg)$/i, "_watermarked.jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  const previewUrl = URL.createObjectURL(blob);

  return {
    file: watermarkedFile,
    previewUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

function drawWatermarkCard(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  orgText: string,
  rows: { icon: string; label: string; value: string }[],
  isRight: boolean,
  theme?: "slate" | "navy" | "emerald"
) {
  const margin = Math.round(24 * scale);
  const paddingX = Math.round(18 * scale);
  const paddingY = Math.round(14 * scale);
  const titleFontSize = Math.round(14 * scale);
  const rowFontSize = Math.round(12 * scale);
  const lineHeight = Math.round(18 * scale);

  ctx.save();

  // Measure content width
  ctx.font = `bold ${titleFontSize}px "Segoe UI", -apple-system, Roboto, sans-serif`;
  let maxContentWidth = ctx.measureText(orgText).width;

  ctx.font = `${rowFontSize}px "Segoe UI", -apple-system, Roboto, sans-serif`;
  for (const r of rows) {
    const text = `${r.icon} ${r.label} ${r.value}`;
    const w = ctx.measureText(text).width;
    if (w > maxContentWidth) maxContentWidth = w;
  }

  const cardWidth = Math.min(maxContentWidth + paddingX * 2, canvasWidth - margin * 2);
  const cardHeight = paddingY * 2 + titleFontSize + 8 * scale + rows.length * lineHeight;
  const cardX = isRight ? canvasWidth - margin - cardWidth : margin;
  const cardY = canvasHeight - margin - cardHeight;
  const radius = Math.round(10 * scale);

  // Background color selection
  let bgGradient1 = "rgba(15, 23, 42, 0.88)"; // Slate 900
  let bgGradient2 = "rgba(30, 41, 59, 0.92)"; // Slate 800
  let accentColor = "#38bdf8"; // Light Sky blue

  if (theme === "emerald") {
    bgGradient1 = "rgba(6, 78, 59, 0.90)";
    bgGradient2 = "rgba(4, 47, 46, 0.93)";
    accentColor = "#34d399";
  } else if (theme === "navy") {
    bgGradient1 = "rgba(10, 25, 47, 0.92)";
    bgGradient2 = "rgba(15, 33, 64, 0.95)";
    accentColor = "#60a5fa";
  }

  // Draw rounded card background with shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 4 * scale;

  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, radius);
  ctx.fillStyle = bgGradient1;
  ctx.fill();

  // Subtle border
  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.stroke();

  // Accent header bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(cardX + paddingX, cardY + paddingY + titleFontSize + 3 * scale, cardWidth - paddingX * 2, Math.max(1.5, 2 * scale));

  // Draw Header / Org text
  ctx.font = `bold ${titleFontSize}px "Segoe UI", -apple-system, Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(orgText, cardX + paddingX, cardY + paddingY + titleFontSize - 2 * scale);

  // Draw rows
  ctx.font = `500 ${rowFontSize}px "Segoe UI", -apple-system, Roboto, sans-serif`;
  let currentY = cardY + paddingY + titleFontSize + 8 * scale + lineHeight;

  for (const r of rows) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    const labelFull = `${r.icon} ${r.label}`;
    ctx.fillText(labelFull, cardX + paddingX, currentY);

    const labelWidth = ctx.measureText(labelFull).width;
    ctx.fillStyle = "#ffffff";
    
    // Truncate value if too long
    const availableValWidth = cardWidth - paddingX * 2 - labelWidth - 8 * scale;
    const valText = truncateText(ctx, ` ${r.value}`, availableValWidth);
    ctx.fillText(valText, cardX + paddingX + labelWidth + 4 * scale, currentY);

    currentY += lineHeight;
  }

  ctx.restore();
}

function drawBottomStrip(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  orgText: string,
  rows: { icon: string; label: string; value: string }[],
  theme?: "slate" | "navy" | "emerald"
) {
  const paddingX = Math.round(24 * scale);
  const paddingY = Math.round(14 * scale);
  const titleFontSize = Math.round(14 * scale);
  const rowFontSize = Math.round(11 * scale);

  ctx.save();
  const stripHeight = paddingY * 2 + titleFontSize + 6 * scale + rowFontSize + 6 * scale;
  const stripY = canvasHeight - stripHeight;

  // Background
  let bgColor = "rgba(15, 23, 42, 0.88)";
  let accentColor = "#38bdf8";
  if (theme === "emerald") {
    bgColor = "rgba(6, 78, 59, 0.90)";
    accentColor = "#34d399";
  }

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, stripY, canvasWidth, stripHeight);

  // Top border
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, stripY, canvasWidth, Math.max(2, 2.5 * scale));

  // Org Title
  ctx.font = `bold ${titleFontSize}px "Segoe UI", -apple-system, Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(orgText, paddingX, stripY + paddingY + titleFontSize);

  // Joined metadata row
  const rowItems = rows.map((r) => `${r.icon} ${r.label} ${r.value}`).join("   |   ");
  ctx.font = `500 ${rowFontSize}px "Segoe UI", -apple-system, Roboto, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillText(truncateText(ctx, rowItems, canvasWidth - paddingX * 2), paddingX, stripY + paddingY + titleFontSize + 8 * scale + rowFontSize);

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

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}
