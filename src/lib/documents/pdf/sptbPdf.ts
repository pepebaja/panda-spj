import type { DokumenPayload } from "@/lib/types";
import { rupiah, terbilang, formatTanggalIndonesia } from "@/lib/format";
import { createPdfCtx, drawKopSurat, drawText, newLine, drawLabelValue, drawParagraph } from "./layout";

export async function generateSPTBPdf(payload: DokumenPayload): Promise<Uint8Array> {
  const { transaksi: t, rekening: r, pptk } = payload;
  const ctx = await createPdfCtx();

  await drawKopSurat(ctx);
  newLine(ctx, 6);
  drawText(ctx, "SURAT PERNYATAAN TANGGUNG JAWAB BELANJA", { bold: true, size: 12.5, align: "center" }); newLine(ctx, 24);

  drawLabelValue(ctx, "Nama", pptk.nama);
  drawLabelValue(ctx, "NIP", pptk.nip);
  drawLabelValue(ctx, "Jabatan", `Pejabat Pelaksana Teknis berdasarkan SK Kuasa Pengguna Anggaran Nomor: ${t.no_sk_kpa} tentang Penunjukan Penanggung Jawab Pengelola Keuangan pada Bagian Perekonomian dan Sumber Daya Alam Sekretariat Daerah Kota Batu Tahun Anggaran ${t.tahun_anggaran}.`);
  newLine(ctx, 4);

  drawParagraph(ctx, `Sehubungan dengan pembelanjaan yang kami lakukan sebesar ${rupiah(t.ajuan)} (${terbilang(t.ajuan)}), untuk perhitungan yang terdapat pada Pengajuan Pembayaran GU ${r.belanja} ${t.judul_acara} tanggal ${formatTanggalIndonesia(t.tanggal_acara)}, kegiatan ${r.kegiatan}, sub kegiatan ${r.sub_kegiatan}, dengan ini menyatakan dengan sebenarnya bahwa:`);
  newLine(ctx, 4);

  const butir = [
    `Jumlah pembelanjaan tersebut di atas benar-benar dipergunakan sesuai DPA ${t.tahapan_anggaran}-SKPD, untuk keperluan ${r.belanja} Kode Rekening ${r.kode}.`,
    `Pembelanjaan tersebut benar-benar dipergunakan untuk pelaksanaan ${r.kegiatan}, ${r.sub_kegiatan}.`,
    `Bertanggung jawab atas pembelanjaan yang terjadi.`,
  ];
  butir.forEach((b, i) => { drawParagraph(ctx, `${i + 1}. ${b}`); newLine(ctx, 2); });
  newLine(ctx, 10);

  drawParagraph(ctx, "Demikian Surat Pernyataan ini dibuat untuk melengkapi pertanggungjawaban atas penggunaan anggaran yang dipercayakan kepada kami.");
  newLine(ctx, 30);

  drawText(ctx, `Batu, ${formatTanggalIndonesia(t.tanggal_acara)}`, { size: 10, align: "right" }); newLine(ctx, 13);
  drawText(ctx, "PEJABAT PELAKSANA TEKNIS KEGIATAN (PPTK),", { size: 10, align: "right" }); newLine(ctx, 48);
  drawText(ctx, pptk.nama, { bold: true, size: 10, align: "right" }); newLine(ctx, 13);
  drawText(ctx, `NIP. ${pptk.nip}`, { size: 10, align: "right" });

  return ctx.doc.save();
}
