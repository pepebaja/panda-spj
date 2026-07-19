import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export const A4 = { width: 595.28, height: 841.89 };
export const MARGIN = 56;

export interface PdfCtx {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  contentWidth: number;
}

export async function createPdfCtx(): Promise<PdfCtx> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.width, A4.height]);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  return { doc, page, font, fontBold, y: A4.height - MARGIN, contentWidth: A4.width - MARGIN * 2 };
}

const KOP_PATH = path.join(process.cwd(), "public", "kop-surat.png");
const KOP_RATIO = 325 / 1600;

/**
 * Menyisipkan gambar kop surat resmi (logo Pemkot Batu + Sekretariat Daerah)
 * di bagian atas halaman, dilebarkan mengikuti lebar konten. Dipakai untuk
 * Nota Dinas dan SPTB — Kwitansi tidak memakai kop surat sesuai template asli.
 */
export async function drawKopSurat(ctx: PdfCtx) {
  const bytes = fs.readFileSync(KOP_PATH);
  const image = await ctx.doc.embedPng(bytes);
  const width = ctx.contentWidth;
  const height = width * KOP_RATIO;
  ctx.page.drawImage(image, { x: MARGIN, y: ctx.y - height, width, height });
  ctx.y -= height + 14;
}

/** Pecah teks panjang menjadi beberapa baris agar muat dalam lebar tertentu. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(text ?? "").split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function drawText(ctx: PdfCtx, text: string, opts: { x?: number; size?: number; bold?: boolean; align?: "left" | "center" | "right"; color?: [number, number, number] } = {}) {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const width = font.widthOfTextAtSize(text, size);
  let x = opts.x ?? MARGIN;
  if (opts.align === "center") x = MARGIN + (ctx.contentWidth - width) / 2;
  if (opts.align === "right") x = MARGIN + ctx.contentWidth - width;
  ctx.page.drawText(text, { x, y: ctx.y, size, font, color: rgb(...(opts.color ?? [0.1, 0.1, 0.1])) });
}

export function newLine(ctx: PdfCtx, height = 14) {
  ctx.y -= height;
  if (ctx.y < MARGIN + 60) {
    ctx.page = ctx.doc.addPage([A4.width, A4.height]);
    ctx.y = A4.height - MARGIN;
  }
}

export function drawParagraph(ctx: PdfCtx, text: string, opts: { size?: number; bold?: boolean; lineHeight?: number; align?: "left" | "center" | "right" } = {}) {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.fontBold : ctx.font;
  const lines = wrapText(text, font, size, ctx.contentWidth);
  lines.forEach((line) => {
    drawText(ctx, line, { size, bold: opts.bold, align: opts.align });
    newLine(ctx, opts.lineHeight ?? size + 4);
  });
}

export function drawLabelValue(ctx: PdfCtx, label: string, value: string, opts: { labelWidth?: number; size?: number } = {}) {
  const size = opts.size ?? 10;
  const labelWidth = opts.labelWidth ?? 110;
  drawText(ctx, label, { size });
  drawText(ctx, ":", { x: MARGIN + labelWidth, size });
  const lines = wrapText(value, ctx.font, size, ctx.contentWidth - labelWidth - 14);
  lines.forEach((line, i) => {
    drawText(ctx, line, { x: MARGIN + labelWidth + 14, size });
    if (i < lines.length - 1) newLine(ctx, size + 3);
  });
  newLine(ctx, size + 6);
}

export function drawDivider(ctx: PdfCtx, double = false) {
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: MARGIN + ctx.contentWidth, y: ctx.y }, thickness: double ? 1.4 : 0.7, color: rgb(0, 0, 0) });
  if (double) {
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y - 2.5 }, end: { x: MARGIN + ctx.contentWidth, y: ctx.y - 2.5 }, thickness: 0.7, color: rgb(0, 0, 0) });
  }
  newLine(ctx, double ? 12 : 8);
}

/** Tabel sederhana: header + baris, kolom proporsi relatif terhadap contentWidth. */
export function drawTable(ctx: PdfCtx, columns: { label: string; weight: number; align?: "left" | "center" | "right" }[], rows: string[][], opts: { size?: number; rowHeight?: number } = {}) {
  const size = opts.size ?? 8.5;
  const rowHeight = opts.rowHeight ?? 16;
  const totalWeight = columns.reduce((s, c) => s + c.weight, 0);
  const widths = columns.map((c) => (c.weight / totalWeight) * ctx.contentWidth);

  const drawRow = (cells: string[], bold: boolean, bg?: [number, number, number]) => {
    if (ctx.y < MARGIN + rowHeight) { ctx.page = ctx.doc.addPage([A4.width, A4.height]); ctx.y = A4.height - MARGIN; }
    let x = MARGIN;
    if (bg) ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - rowHeight + 4, width: ctx.contentWidth, height: rowHeight, color: rgb(...bg) });
    cells.forEach((cell, i) => {
      const font = bold ? ctx.fontBold : ctx.font;
      const lines = wrapText(cell, font, size, widths[i] - 6);
      const startY = ctx.y;
      lines.slice(0, 3).forEach((line, li) => {
        const w = font.widthOfTextAtSize(line, size);
        let cx = x + 3;
        if (columns[i].align === "right") cx = x + widths[i] - w - 3;
        if (columns[i].align === "center") cx = x + (widths[i] - w) / 2;
        ctx.page.drawText(line, { x: cx, y: startY - li * (size + 2), size, font, color: rgb(0.1, 0.1, 0.1) });
      });
      x += widths[i];
    });
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - rowHeight + 4, width: ctx.contentWidth, height: rowHeight, borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 0.6 });
    let bx = MARGIN;
    columns.forEach((c, i) => { bx += widths[i]; if (i < columns.length - 1) ctx.page.drawLine({ start: { x: bx, y: ctx.y + 4 }, end: { x: bx, y: ctx.y - rowHeight + 4 }, thickness: 0.6, color: rgb(0.2, 0.2, 0.2) }); });
    ctx.y -= rowHeight;
  };

  drawRow(columns.map((c) => c.label), true, [0.91, 0.93, 0.95]);
  rows.forEach((r) => drawRow(r, false));
  newLine(ctx, 6);
}
