import { Document, Paragraph, TextRun, AlignmentType } from "docx";
import type { DokumenPayload } from "@/lib/types";
import { rupiah, terbilang, formatTanggalIndonesia } from "@/lib/format";
import { kopSuratParagraph } from "./kopSurat";

/** Menghasilkan Document .docx Surat Pernyataan Tanggung Jawab Belanja (SPTB). */
export function generateSPTB(payload: DokumenPayload): Document {
  const { transaksi: t, rekening: r, pptk } = payload;

  return new Document({
    sections: [
      {
        properties: { page: { size: { width: 11907, height: 16840 }, margin: { top: 1134, bottom: 1134, left: 1417, right: 1134 } } },
        children: [
          kopSuratParagraph(),
          new Paragraph({ spacing: { after: 100 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: "SURAT PERNYATAAN TANGGUNG JAWAB BELANJA", bold: true, underline: {}, size: 24 })],
          }),

          ...[
            ["Nama", pptk.nama],
            ["NIP", pptk.nip],
            [
              "Jabatan",
              `Pejabat Pelaksana Teknis berdasarkan SK Kuasa Pengguna Anggaran Nomor: ${t.no_sk_kpa} tentang Penunjukan Penanggung Jawab Pengelola Keuangan pada Bagian Perekonomian dan Sumber Daya Alam Sekretariat Daerah Kota Batu Tahun Anggaran ${t.tahun_anggaran}.`,
            ],
          ].map(([label, val]) =>
            new Paragraph({
              spacing: { after: 80 },
              alignment: AlignmentType.JUSTIFIED,
              tabStops: [{ type: "left", position: 1300 }],
              children: [new TextRun({ text: `${label}\t: ${val}`, size: 20 })],
            })
          ),

          new Paragraph({
            spacing: { before: 200, after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({
              text: `Sehubungan dengan pembelanjaan yang kami lakukan sebesar ${rupiah(t.ajuan)} (${terbilang(t.ajuan)}), untuk perhitungan yang terdapat pada Pengajuan Pembayaran GU ${r.belanja} ${t.judul_acara} tanggal ${formatTanggalIndonesia(t.tanggal_acara)}, kegiatan ${r.kegiatan}, sub kegiatan ${r.sub_kegiatan}, dengan ini menyatakan dengan sebenarnya bahwa:`,
              size: 20,
            })],
          }),

          ...[
            `Jumlah pembelanjaan tersebut di atas benar-benar dipergunakan sesuai DPA ${t.tahapan_anggaran}-SKPD, untuk keperluan ${r.belanja} Kode Rekening ${r.kode}.`,
            `Pembelanjaan tersebut benar-benar dipergunakan untuk pelaksanaan ${r.kegiatan}, ${r.sub_kegiatan}.`,
            `Bertanggung jawab atas pembelanjaan yang terjadi.`,
          ].map((txt, i) =>
            new Paragraph({
              spacing: { after: 120 },
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 400, hanging: 400 },
              children: [new TextRun({ text: `${i + 1}. ${txt}`, size: 20 })],
            })
          ),

          new Paragraph({
            spacing: { before: 300, after: 600 },
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: "Demikian Surat Pernyataan ini dibuat untuk melengkapi pertanggungjawaban atas penggunaan anggaran yang dipercayakan kepada kami.", size: 20 })],
          }),

          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Batu, ${formatTanggalIndonesia(t.tanggal_acara)}`, size: 20 })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "PEJABAT PELAKSANA TEKNIS KEGIATAN (PPTK),", size: 20 })] }),
          ...Array(3).fill(new Paragraph({ text: "" })),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: pptk.nama, bold: true, underline: {}, size: 20 })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `NIP. ${pptk.nip}`, size: 20 })] }),
        ],
      },
    ],
  });
}
