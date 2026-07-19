import type { DokumenPayload } from "@/lib/types";
import { rupiah, terbilang, formatTanggalIndonesia } from "@/lib/format";
import { createPdfCtx, drawText, newLine, drawLabelValue, drawTable, MARGIN } from "./layout";

const NAMA_SKPD = process.env.NEXT_PUBLIC_NAMA_SKPD || "Sekretariat Daerah - Bagian Perekonomian dan Sumber Daya Alam";

export async function generateKuitansiPdf(payload: DokumenPayload): Promise<Uint8Array> {
  const { transaksi: t, rekening: r, pptk, kpa, bpp } = payload;
  const ctx = await createPdfCtx();
  const totalRincian = t.rincian.reduce((s, it) => s + it.jumlah, 0);

  drawText(ctx, "KWITANSI / BUKTI PEMBAYARAN", { bold: true, size: 12.5, align: "center" }); newLine(ctx, 24);

  drawLabelValue(ctx, "Sudah terima dari", "PEMERINTAH KOTA BATU");
  drawLabelValue(ctx, "SKPD", NAMA_SKPD);
  drawLabelValue(ctx, "TA", String(t.tahun_anggaran));
  drawLabelValue(ctx, "Nomor Bukti", t.nomor_bukti_kuitansi || "-");
  drawLabelValue(ctx, "Kode Rekening", r.kode);
  drawLabelValue(ctx, "Jumlah Uang", rupiah(t.ajuan));
  drawLabelValue(ctx, "Terbilang", terbilang(t.ajuan));
  drawLabelValue(ctx, "Untuk Pembayaran", `${r.belanja} ${t.judul_acara} tanggal ${formatTanggalIndonesia(t.tanggal_acara)}, ${r.kegiatan}, ${r.sub_kegiatan}, dengan rincian:`);
  newLine(ctx, 4);

  drawTable(ctx,
    [{ label: "Uraian Barang/Jasa", weight: 3.6 }, { label: "Volume", weight: 0.9, align: "center" }, { label: "Satuan", weight: 0.9, align: "center" }, { label: "Harga Satuan", weight: 1.5, align: "right" }, { label: "Jumlah", weight: 1.5, align: "right" }],
    t.rincian.map((it) => [it.uraian, String(it.volume), it.satuan, rupiah(it.harga_satuan), rupiah(it.jumlah)])
  );
  drawText(ctx, "Jumlah", { bold: true, size: 10 });
  drawText(ctx, rupiah(totalRincian), { bold: true, size: 10, align: "right" });
  newLine(ctx, 20);

  const barisPajak: string[] = [];
  if (t.pajak_daerah > 0) barisPajak.push(`Pajak Daerah (10%): ${rupiah(t.pajak_daerah)}`);
  if (t.ppn > 0) barisPajak.push(`PPN (11%): ${rupiah(t.ppn)}`);
  if (t.pph22 > 0) barisPajak.push(`PPh Pasal 22 (${t.status_npwp ? "1,5%" : "3%"}): ${rupiah(t.pph22)}`);
  if (t.pph23 > 0) barisPajak.push(`PPh Pasal 23 (${t.status_npwp ? "2%" : "4%"}): ${rupiah(t.pph23)}`);
  if (t.pph_perorangan > 0) barisPajak.push(`PPh Perorangan (2,5%): ${rupiah(t.pph_perorangan)}`);
  if (t.pph_final_4ayat2 > 0) barisPajak.push(`${t.label_pph_final || "PPh Final Ps. 4(2)"}: ${rupiah(t.pph_final_4ayat2)}`);
  if (t.pph21_final > 0) barisPajak.push(`${t.label_pph_final || "PPh 21 Final"}: ${rupiah(t.pph21_final)}`);
  if (barisPajak.length === 0) barisPajak.push("Tidak ada potongan pajak untuk transaksi ini.");
  barisPajak.push(`Jumlah Potongan: ${rupiah(t.jumlah_potongan)}`);
  barisPajak.forEach((s) => {
    drawText(ctx, s, { size: 9, align: "right" }); newLine(ctx, 12);
  });
  drawText(ctx, `Jumlah Diterima: ${rupiah(t.jumlah_diterima ?? t.ajuan)}`, { bold: true, size: 10.5, align: "right" }); newLine(ctx, 28);

  drawText(ctx, `Batu, ${formatTanggalIndonesia(t.tanggal_acara)}`, { size: 10, align: "right" }); newLine(ctx, 26);

  const colW = ctx.contentWidth / 3;
  const signatures = [
    { role: ["Setuju Dibayar", "Kuasa Pengguna Anggaran"], nama: kpa.nama, nip: kpa.nip },
    { role: ["Pejabat Pelaksana Teknis Kegiatan"], nama: pptk.nama, nip: pptk.nip },
    { role: ["Bendahara Pengeluaran Pembantu"], nama: bpp.nama, nip: bpp.nip },
  ];
  const startY = ctx.y;
  signatures.forEach((s, i) => {
    const cx = MARGIN + i * colW + colW / 2;
    let yy = startY;
    s.role.forEach((line) => { const w = ctx.font.widthOfTextAtSize(line, 9); ctx.page.drawText(line, { x: cx - w / 2, y: yy, size: 9, font: ctx.font }); yy -= 12; });
    yy -= 40;
    const namaW = ctx.fontBold.widthOfTextAtSize(s.nama, 9.5);
    ctx.page.drawText(s.nama, { x: cx - namaW / 2, y: yy, size: 9.5, font: ctx.fontBold }); yy -= 12;
    const nipTxt = `NIP. ${s.nip}`; const nipW = ctx.font.widthOfTextAtSize(nipTxt, 9);
    ctx.page.drawText(nipTxt, { x: cx - nipW / 2, y: yy, size: 9, font: ctx.font });
  });
  ctx.y = startY - 90;
  newLine(ctx, 16);

  drawText(ctx, "Setuju dan Lunas Dibayar", { size: 9.5 }); newLine(ctx, 12);
  drawText(ctx, "Penerima,", { size: 9.5 }); newLine(ctx, 48);
  drawText(ctx, `( ${t.penerima || "....................................."} )`, { size: 9.5 });

  return ctx.doc.save();
}
