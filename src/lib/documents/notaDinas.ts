import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, ShadingType,
} from "docx";
import type { DokumenPayload } from "@/lib/types";
import { rupiah, formatTanggalIndonesia } from "@/lib/format";
import { kopSuratParagraph } from "./kopSurat";

const cellBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorder,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "E8EDF2" },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18 })] })],
  });
}
function bodyCell(text: string, width: number, opts: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorder,
    children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, children: [new TextRun({ text, size: 18, bold: !!opts.bold })] })],
  });
}

/** Menghasilkan Buffer .docx Nota Dinas Pengajuan Pencairan GU sesuai template resmi. */
export function generateNotaDinas(payload: DokumenPayload): Document {
  const { transaksi: t, rekening: r, pptk } = payload;

  const colWidths = [500, 3600, 2200, 1300, 1600, 1600, 1600, 1600];

  return new Document({
    sections: [
      {
        properties: { page: { size: { width: 11907, height: 16840 }, margin: { top: 1134, bottom: 1134, left: 1417, right: 1134 } } },
        children: [
          kopSuratParagraph(),
          new Paragraph({ spacing: { after: 100 }, children: [] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NOTA DINAS", bold: true, underline: {}, size: 24 })] }),

          ...[
            ["Kepada", "Kuasa Pengguna Anggaran Bagian Perekonomian dan SDA Sekretariat Daerah Kota Batu"],
            ["Dari", "Pejabat Pelaksana Teknis Kegiatan Bagian Perekonomian dan SDA Sekretariat Daerah Kota Batu"],
            ["Tanggal", formatTanggalIndonesia(t.tanggal_acara)],
            ["Nomor", t.nomor_nota_dinas || "-"],
            ["Sifat", "Penting"],
            ["Lampiran", "-"],
            ["Perihal", "Pengajuan Pencairan GU"],
          ].map(([label, val]) =>
            new Paragraph({
              spacing: { after: 40 },
              tabStops: [{ type: "left", position: 1600 }],
              children: [new TextRun({ text: `${label}\t: ${val}`, size: 20, bold: label === "Perihal" })],
            })
          ),

          new Paragraph({
            spacing: { before: 200, after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({
              text: "Bersama ini kami menyampaikan dengan hormat Pengajuan Pencairan Anggaran kegiatan pada Bagian Perekonomian dan SDA Sekretariat Daerah Kota Batu dengan rincian sebagai berikut:",
              size: 20,
            })],
          }),

          new Table({
            width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
            columnWidths: colWidths,
            rows: [
              new TableRow({
                children: [
                  headerCell("No", colWidths[0]), headerCell("Uraian", colWidths[1]), headerCell("Kode Rekening", colWidths[2]),
                  headerCell("Sumber Dana", colWidths[3]), headerCell("Pagu (Rp)", colWidths[4]), headerCell("Realisasi Sebelum (Rp)", colWidths[5]),
                  headerCell("Ajuan Sekarang (Rp)", colWidths[6]), headerCell("Sisa (Rp)", colWidths[7]),
                ],
              }),
              new TableRow({
                children: [
                  bodyCell("1", colWidths[0], { align: AlignmentType.CENTER }),
                  bodyCell(`${r.program} — ${r.kegiatan} — ${r.sub_kegiatan} — ${r.belanja}`, colWidths[1]),
                  bodyCell(r.kode, colWidths[2]),
                  bodyCell(r.sumber_dana, colWidths[3], { align: AlignmentType.CENTER }),
                  bodyCell(rupiah(transaksiPagu(payload)), colWidths[4], { align: AlignmentType.RIGHT }),
                  bodyCell(rupiah(t.realisasi_sebelum), colWidths[5], { align: AlignmentType.RIGHT }),
                  bodyCell(rupiah(t.ajuan), colWidths[6], { align: AlignmentType.RIGHT }),
                  bodyCell(rupiah(t.sisa_pagu), colWidths[7], { align: AlignmentType.RIGHT }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "Rincian sebagai berikut:", size: 20 })] }),

          new Table({
            width: { size: 9500, type: WidthType.DXA },
            columnWidths: [500, 5500, 1500, 2000],
            rows: [
              new TableRow({
                children: [headerCell("No", 500), headerCell("Uraian Belanja", 5500), headerCell("Tanggal", 1500), headerCell("Jumlah (Rp)", 2000)],
              }),
              ...t.rincian.map((it, i) =>
                new TableRow({
                  children: [
                    bodyCell(String.fromCharCode(97 + i), 500, { align: AlignmentType.CENTER }),
                    bodyCell(`${r.belanja} — ${t.judul_acara} (${it.uraian})`, 5500),
                    bodyCell(formatTanggalIndonesia(t.tanggal_acara), 1500, { align: AlignmentType.CENTER }),
                    bodyCell(rupiah(it.jumlah), 2000, { align: AlignmentType.RIGHT }),
                  ],
                })
              ),
              new TableRow({
                children: [
                  bodyCell("TOTAL PENGAJUAN", 7500, { bold: true }),
                  bodyCell(rupiah(t.ajuan), 2000, { align: AlignmentType.RIGHT, bold: true }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 300, after: 600 }, children: [new TextRun({ text: "Demikian nota dinas ini disampaikan untuk menjadi periksa.", size: 20 })] }),

          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "PEJABAT PELAKSANA TEKNIS KEGIATAN", size: 20 })] }),
          ...Array(3).fill(new Paragraph({ text: "" })),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: pptk.nama, bold: true, underline: {}, size: 20 })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: pptk.pangkat || "", size: 20 })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `NIP. ${pptk.nip}`, size: 20 })] }),
        ],
      },
    ],
  });
}

function transaksiPagu(payload: DokumenPayload): number {
  const { transaksi: t, rekening: r } = payload;
  return t.tahapan_anggaran === "murni" ? r.pagu_murni : t.tahapan_anggaran === "pergeseran" ? r.pagu_pergeseran : r.pagu_perubahan;
}
