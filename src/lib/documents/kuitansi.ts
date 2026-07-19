import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType,
} from "docx";
import type { DokumenPayload } from "@/lib/types";
import { rupiah, terbilang, formatTanggalIndonesia } from "@/lib/format";

const NAMA_SKPD = process.env.NEXT_PUBLIC_NAMA_SKPD || "Sekretariat Daerah - Bagian Perekonomian dan Sumber Daya Alam";

const cellBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};
function headerCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders: cellBorder,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "E8EDF2" },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18 })] })],
  });
}
function bodyCell(text: string, width: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, bold = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders: cellBorder,
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, size: 18, bold })] })],
  });
}

/** Menghasilkan Document .docx Kwitansi / Bukti Pembayaran. */
export function generateKuitansi(payload: DokumenPayload): Document {
  const { transaksi: t, rekening: r, pptk, kpa, bpp } = payload;
  const colWidths = [3800, 1200, 1200, 1800, 1800];

  return new Document({
    sections: [
      {
        properties: { page: { size: { width: 11907, height: 16840 }, margin: { top: 1134, bottom: 1134, left: 1417, right: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "KWITANSI / BUKTI PEMBAYARAN", bold: true, underline: {}, size: 24 })] }),

          ...[
            ["Sudah terima dari", "PEMERINTAH KOTA BATU"],
            ["SKPD", NAMA_SKPD],
            ["TA", String(t.tahun_anggaran)],
            ["Nomor Bukti", t.nomor_bukti_kuitansi || "-"],
            ["Kode Rekening", r.kode],
            ["Jumlah Uang", rupiah(t.ajuan)],
            ["Terbilang", terbilang(t.ajuan)],
            ["Untuk Pembayaran", `${r.belanja} ${t.judul_acara} tanggal ${formatTanggalIndonesia(t.tanggal_acara)}, ${r.kegiatan}, ${r.sub_kegiatan}, dengan rincian:`],
          ].map(([label, val]) =>
            new Paragraph({
              spacing: { after: 60 },
              alignment: AlignmentType.JUSTIFIED,
              tabStops: [{ type: "left", position: 2200 }],
              children: [new TextRun({ text: `${label}\t: ${val}`, size: 20 })],
            })
          ),

          new Paragraph({ text: "", spacing: { after: 100 } }),
          new Table({
            width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
            columnWidths: colWidths,
            rows: [
              new TableRow({ children: [headerCell("Uraian Barang/Jasa", colWidths[0]), headerCell("Volume", colWidths[1]), headerCell("Satuan", colWidths[2]), headerCell("Harga Satuan", colWidths[3]), headerCell("Jumlah", colWidths[4])] }),
              ...t.rincian.map((it) =>
                new TableRow({
                  children: [
                    bodyCell(it.uraian, colWidths[0]),
                    bodyCell(String(it.volume), colWidths[1], AlignmentType.CENTER),
                    bodyCell(it.satuan, colWidths[2], AlignmentType.CENTER),
                    bodyCell(rupiah(it.harga_satuan), colWidths[3], AlignmentType.RIGHT),
                    bodyCell(rupiah(it.jumlah), colWidths[4], AlignmentType.RIGHT),
                  ],
                })
              ),
              new TableRow({ children: [bodyCell("Jumlah", colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], AlignmentType.RIGHT, true), bodyCell(rupiah(t.ajuan), colWidths[4], AlignmentType.RIGHT, true)] }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 200 } }),
          ...(function () {
            const baris: string[] = [];
            if (t.pajak_daerah > 0) baris.push(`Pajak Daerah (10%): ${rupiah(t.pajak_daerah)}`);
            if (t.ppn > 0) baris.push(`PPN (11%): ${rupiah(t.ppn)}`);
            if (t.pph22 > 0) baris.push(`PPh Pasal 22 (${t.status_npwp ? "1,5%" : "3%"}): ${rupiah(t.pph22)}`);
            if (t.pph23 > 0) baris.push(`PPh Pasal 23 (${t.status_npwp ? "2%" : "4%"}): ${rupiah(t.pph23)}`);
            if (t.pph_perorangan > 0) baris.push(`PPh Perorangan (2,5%): ${rupiah(t.pph_perorangan)}`);
            if (t.pph_final_4ayat2 > 0) baris.push(`${t.label_pph_final || "PPh Final Ps. 4(2)"}: ${rupiah(t.pph_final_4ayat2)}`);
            if (t.pph21_final > 0) baris.push(`${t.label_pph_final || "PPh 21 Final"}: ${rupiah(t.pph21_final)}`);
            if (baris.length === 0) baris.push("Tidak ada potongan pajak untuk transaksi ini.");
            baris.push(`Jumlah Potongan: ${rupiah(t.jumlah_potongan)}`);
            return baris;
          })().map((s) =>
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: s, size: 18 })] })
          ),
          new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 100, after: 300 }, children: [new TextRun({ text: `Jumlah Diterima: ${rupiah(t.jumlah_diterima ?? t.ajuan)}`, size: 20, bold: true })] }),

          new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 300 }, children: [new TextRun({ text: `Batu, ${formatTanggalIndonesia(t.tanggal_acara)}`, size: 20 })] }),

          new Table({
            width: { size: 9800, type: WidthType.DXA },
            columnWidths: [3266, 3267, 3267],
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
            rows: [
              new TableRow({
                children: [
                  signatureCell("Setuju Dibayar\nKuasa Pengguna Anggaran", kpa.nama, kpa.nip, 3266),
                  signatureCell("Pejabat Pelaksana Teknis Kegiatan", pptk.nama, pptk.nip, 3267),
                  signatureCell("Bendahara Pengeluaran Pembantu", bpp.nama, bpp.nip, 3267),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({ children: [new TextRun({ text: "Setuju dan Lunas Dibayar", size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: "Penerima,", size: 20 })] }),
          ...Array(3).fill(new Paragraph({ text: "" })),
          new Paragraph({ children: [new TextRun({ text: `( ${t.penerima || "....................................."} )`, size: 20 })] }),
        ],
      },
    ],
  });
}

function signatureCell(role: string, nama: string, nip: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    children: [
      ...role.split("\n").map((l) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: l, size: 18 })] })),
      ...Array(3).fill(new Paragraph({ text: "" })),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: nama, bold: true, underline: {}, size: 18 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIP. ${nip}`, size: 18 })] }),
    ],
  });
}
