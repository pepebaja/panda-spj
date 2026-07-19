import fs from "fs";
import path from "path";
import { ImageRun, Paragraph, AlignmentType } from "docx";

/**
 * Kop surat resmi (logo Pemkot Batu + Sekretariat Daerah) dipakai pada
 * Nota Dinas dan SPTB. Kwitansi tidak memakai kop surat sesuai template asli.
 * Sumber gambar: public/kop-surat.png (rasio asli 1600×325).
 */
const KOP_PATH = path.join(process.cwd(), "public", "kop-surat.png");
const KOP_RATIO = 325 / 1600;

let kopBufferCache: Buffer | null = null;
function readKopBuffer(): Buffer {
  if (!kopBufferCache) kopBufferCache = fs.readFileSync(KOP_PATH);
  return kopBufferCache;
}

/** Paragraph berisi gambar kop surat, dilebarkan mengikuti lebar konten halaman A4. */
export function kopSuratParagraph(contentWidthPx = 624): Paragraph {
  const width = contentWidthPx;
  const height = Math.round(width * KOP_RATIO);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        data: readKopBuffer(),
        transformation: { width, height },
        type: "png",
      }),
    ],
  });
}
