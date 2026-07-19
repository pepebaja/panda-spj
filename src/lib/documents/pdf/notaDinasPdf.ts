import type { DokumenPayload } from "@/lib/types";
import { rupiah, formatTanggalIndonesia } from "@/lib/format";
import { createPdfCtx, drawKopSurat, drawText, newLine, drawLabelValue, drawTable, drawParagraph } from "./layout";

function paguDipilih(payload: DokumenPayload) {
  const { transaksi: t, rekening: r } = payload;
  return t.tahapan_anggaran === "murni" ? r.pagu_murni : t.tahapan_anggaran === "pergeseran" ? r.pagu_pergeseran : r.pagu_perubahan;
}

export async function generateNotaDinasPdf(payload: DokumenPayload): Promise<Uint8Array> {
  const { transaksi: t, rekening: r, pptk } = payload;
  const ctx = await createPdfCtx();

  await drawKopSurat(ctx);
  newLine(ctx, 6);
  drawText(ctx, "NOTA DINAS", { bold: true, size: 13, align: "center" }); newLine(ctx, 22);

  drawLabelValue(ctx, "Kepada", "Kuasa Pengguna Anggaran Bagian Perekonomian dan SDA Sekretariat Daerah Kota Batu");
  drawLabelValue(ctx, "Dari", "Pejabat Pelaksana Teknis Kegiatan Bagian Perekonomian dan SDA Sekretariat Daerah Kota Batu");
  drawLabelValue(ctx, "Tanggal", formatTanggalIndonesia(t.tanggal_acara));
  drawLabelValue(ctx, "Nomor", t.nomor_nota_dinas || "-");
  drawLabelValue(ctx, "Sifat", "Penting");
  drawLabelValue(ctx, "Lampiran", "-");
  drawLabelValue(ctx, "Perihal", "Pengajuan Pencairan GU");
  newLine(ctx, 4);

  drawParagraph(ctx, "Bersama ini kami menyampaikan dengan hormat Pengajuan Pencairan Anggaran kegiatan pada Bagian Perekonomian dan SDA Sekretariat Daerah Kota Batu dengan rincian sebagai berikut:");
  newLine(ctx, 4);

  drawTable(ctx,
    [
      { label: "No", weight: 0.5, align: "center" }, { label: "Uraian", weight: 3.2 }, { label: "Kode Rekening", weight: 1.8 },
      { label: "Sumber Dana", weight: 1 }, { label: "Pagu", weight: 1.3, align: "right" },
      { label: "Realisasi Sblm", weight: 1.3, align: "right" }, { label: "Ajuan", weight: 1.3, align: "right" }, { label: "Sisa", weight: 1.3, align: "right" },
    ],
    [[
      "1", `${r.program} — ${r.kegiatan} — ${r.sub_kegiatan} — ${r.belanja}`, r.kode, r.sumber_dana,
      rupiah(paguDipilih(payload)), rupiah(t.realisasi_sebelum), rupiah(t.ajuan), rupiah(t.sisa_pagu),
    ]],
    { rowHeight: 40 }
  );

  drawText(ctx, "Rincian sebagai berikut:", { size: 10 }); newLine(ctx, 16);
  drawTable(ctx,
    [{ label: "No", weight: 0.5, align: "center" }, { label: "Uraian Belanja", weight: 4 }, { label: "Tanggal", weight: 1.3, align: "center" }, { label: "Jumlah", weight: 1.5, align: "right" }],
    t.rincian.map((it, i) => [String.fromCharCode(97 + i), `${r.belanja} — ${t.judul_acara} (${it.uraian})`, formatTanggalIndonesia(t.tanggal_acara), rupiah(it.jumlah)])
  );
  drawText(ctx, "TOTAL PENGAJUAN", { bold: true, size: 10 });
  drawText(ctx, rupiah(t.ajuan), { bold: true, size: 10, align: "right" });
  newLine(ctx, 26);

  drawParagraph(ctx, "Demikian nota dinas ini disampaikan untuk menjadi periksa.");
  newLine(ctx, 34);

  drawText(ctx, "PEJABAT PELAKSANA TEKNIS KEGIATAN", { size: 10, align: "right" }); newLine(ctx, 48);
  drawText(ctx, pptk.nama, { bold: true, size: 10, align: "right" }); newLine(ctx, 13);
  drawText(ctx, pptk.pangkat || "", { size: 10, align: "right" }); newLine(ctx, 13);
  drawText(ctx, `NIP. ${pptk.nip}`, { size: 10, align: "right" });

  return ctx.doc.save();
}
