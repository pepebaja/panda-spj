"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hitungPajak, type InputPajak } from "@/lib/pajak";

const RincianSchema = z.object({
  uraian: z.string().min(1, "Uraian barang/jasa wajib diisi"),
  volume: z.number().positive(),
  satuan: z.string().min(1),
  harga_satuan: z.number().nonnegative(),
});

const TransaksiSchema = z.object({
  kode_rekening_id: z.string().uuid(),
  tahapan_anggaran_id: z.string().uuid(),
  tahun_id: z.string().uuid(),
  judul_acara: z.string().min(3, "Judul kegiatan minimal 3 karakter"),
  tanggal_acara: z.string().min(1, "Tanggal wajib diisi"),
  no_sk_kpa: z.string().min(1),
  rincian: z.array(RincianSchema).min(1, "Minimal 1 baris rincian"),
  // Klasifikasi pajak
  jenis_pengadaan: z.enum(["barang", "jasa_lainnya", "jasa_konsultansi", "jasa_konstruksi_pelaksanaan", "jasa_konstruksi_konsultansi", "sewa_tanah_bangunan", "honorarium_pns", "honorarium_non_pns"]),
  status_pkp: z.boolean(),
  status_npwp: z.boolean(),
  jenis_penyedia: z.enum(["badan_usaha", "perorangan"]),
  kualifikasi_konstruksi: z.enum(["kecil_bersertifikat", "menengah_besar_bersertifikat", "tanpa_sertifikat"]).optional(),
  golongan_honorarium: z.enum(["I_II", "III", "IV"]).optional(),
  metode_pengadaan: z.enum(["manual", "e_katalog"]),
  harga_termasuk_pajak: z.boolean(),
  kena_pajak_daerah: z.boolean(),
});

export type TransaksiFormState = {
  ok: boolean;
  errors?: string[];
  transaksiId?: string;
};

function toInputPajak(input: z.infer<typeof TransaksiSchema>, ajuan: number): InputPajak {
  return {
    jenisPengadaan: input.jenis_pengadaan,
    nilaiTagihan: ajuan,
    hargaTermasukPajak: input.harga_termasuk_pajak,
    statusPkp: input.status_pkp,
    statusNpwp: input.status_npwp,
    jenisPenyedia: input.jenis_penyedia,
    kualifikasiKonstruksi: input.kualifikasi_konstruksi,
    golonganHonorarium: input.golongan_honorarium,
    metodePengadaan: input.metode_pengadaan,
    kenaPajakDaerah: input.kena_pajak_daerah,
  };
}

function parseFormData(formData: FormData) {
  return TransaksiSchema.safeParse({
    kode_rekening_id: formData.get("kode_rekening_id"),
    tahapan_anggaran_id: formData.get("tahapan_anggaran_id"),
    tahun_id: formData.get("tahun_id"),
    judul_acara: formData.get("judul_acara"),
    tanggal_acara: formData.get("tanggal_acara"),
    no_sk_kpa: formData.get("no_sk_kpa"),
    rincian: JSON.parse((formData.get("rincian") as string) || "[]"),
    jenis_pengadaan: formData.get("jenis_pengadaan"),
    status_pkp: formData.get("status_pkp") === "true",
    status_npwp: formData.get("status_npwp") === "true",
    jenis_penyedia: formData.get("jenis_penyedia"),
    kualifikasi_konstruksi: formData.get("kualifikasi_konstruksi") || undefined,
    golongan_honorarium: formData.get("golongan_honorarium") || undefined,
    metode_pengadaan: formData.get("metode_pengadaan") || "manual",
    harga_termasuk_pajak: formData.get("harga_termasuk_pajak") === "true",
    kena_pajak_daerah: formData.get("kena_pajak_daerah") === "true",
  });
}

/**
 * Membuat transaksi baru.
 * Validasi pagu dilakukan dua lapis: di sini (fail fast, pesan ramah pengguna)
 * dan di database via trigger `fn_validasi_dan_hitung_transaksi` (source of truth
 * final — mencegah race condition dari dua PPTK yang input bersamaan).
 * Perhitungan pajak (lib/pajak.ts) dijalankan di server lalu DISIMPAN, bukan
 * dihitung ulang saat cetak, agar dokumen tetap konsisten dengan tarif yang
 * berlaku saat transaksi dibuat.
 */
export async function buatTransaksi(prev: TransaksiFormState, formData: FormData): Promise<TransaksiFormState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false, errors: ["Sesi berakhir, silakan login kembali."] };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.errors.map((e) => e.message) };
  }
  const input = parsed.data;
  const ajuan = input.rincian.reduce((s, it) => s + it.volume * it.harga_satuan, 0);
  const pajak = hitungPajak(toInputPajak(input, ajuan));

  const { data: rekening } = await supabase.from("kode_rekening").select("*").eq("id", input.kode_rekening_id).single();
  if (!rekening) return { ok: false, errors: ["Kode rekening tidak ditemukan."] };

  const { data: tahunRow } = await supabase.from("tahun_anggaran").select("tahun").eq("id", input.tahun_id).single();
  const tahun = tahunRow?.tahun || new Date().getFullYear();

  const { count } = await supabase
    .from("transaksi")
    .select("*", { count: "exact", head: true })
    .eq("tahun_id", input.tahun_id);
  const seq = String((count || 0) + 1).padStart(3, "0");

  const { data: inserted, error } = await supabase
    .from("transaksi")
    .insert({
      kode_rekening_id: input.kode_rekening_id,
      tahapan_anggaran_id: input.tahapan_anggaran_id,
      tahun_id: input.tahun_id,
      judul_acara: input.judul_acara,
      tanggal_acara: input.tanggal_acara,
      no_sk_kpa: input.no_sk_kpa,
      nomor_nota_dinas: `934/${seq}/35.79.121/${tahun}`,
      nomor_bukti_kuitansi: `KWT/${seq}/35.79.121/${tahun}`,
      realisasi_sebelum: 0,
      ajuan,
      pptk_id: rekening.pptk_id,
      created_by: userData.user.id,
      status: "draft",
      jenis_pengadaan: input.jenis_pengadaan,
      status_pkp: input.status_pkp,
      status_npwp: input.status_npwp,
      jenis_penyedia: input.jenis_penyedia,
      kualifikasi_konstruksi: input.kualifikasi_konstruksi || null,
      golongan_honorarium: input.golongan_honorarium || null,
      metode_pengadaan: input.metode_pengadaan,
      harga_termasuk_pajak: input.harga_termasuk_pajak,
      kena_pajak_daerah: input.kena_pajak_daerah,
      dpp: pajak.dpp,
      ppn: pajak.ppn,
      pph22: pajak.pph22,
      pph23: pajak.pph23,
      pph_perorangan: pajak.pphPerorangan,
      pph_final_4ayat2: pajak.pphFinal4Ayat2,
      pph21_final: pajak.pph21Final,
      pajak_daerah: pajak.pajakDaerah,
      label_pph_final: pajak.labelPphFinal,
      jumlah_potongan: pajak.jumlahPotongan,
      jumlah_diterima: pajak.jumlahDiterima,
    })
    .select("id")
    .single();

  // Trigger DB (`fn_validasi_dan_hitung_transaksi`) akan melempar error di sini
  // jika ajuan melebihi sisa pagu — pesan errornya diteruskan apa adanya ke pengguna.
  if (error) return { ok: false, errors: [error.message] };

  await supabase.from("transaksi_rincian").insert(
    input.rincian.map((r) => ({ transaksi_id: inserted!.id, ...r }))
  );

  await supabase.from("audit_log").insert({
    actor_id: userData.user.id,
    aksi: "create",
    entitas: "transaksi",
    entitas_id: inserted!.id,
    detail: { ajuan, judul_acara: input.judul_acara },
  });

  revalidatePath("/dokumen");
  revalidatePath("/dashboard");
  return { ok: true, transaksiId: inserted!.id };
}

/**
 * Memperbarui transaksi yang masih berstatus 'draft'. Rincian lama dihapus
 * dan ditulis ulang (lebih sederhana & aman daripada diff per baris).
 * Nomor Nota Dinas/Kwitansi TIDAK diubah agar penomoran tetap konsisten.
 */
export async function updateTransaksi(transaksiId: string, prev: TransaksiFormState, formData: FormData): Promise<TransaksiFormState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false, errors: ["Sesi berakhir, silakan login kembali."] };

  const { data: existing } = await supabase.from("transaksi").select("status").eq("id", transaksiId).single();
  if (!existing) return { ok: false, errors: ["Transaksi tidak ditemukan."] };
  if (existing.status !== "draft") {
    return { ok: false, errors: [`Transaksi berstatus '${existing.status}' tidak dapat diubah. Hanya status 'draft' yang bisa diedit.`] };
  }

  const parsed = parseFormData(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.errors.map((e) => e.message) };
  const input = parsed.data;
  const ajuan = input.rincian.reduce((s, it) => s + it.volume * it.harga_satuan, 0);
  const pajak = hitungPajak(toInputPajak(input, ajuan));

  const { data: rekening } = await supabase.from("kode_rekening").select("*").eq("id", input.kode_rekening_id).single();
  if (!rekening) return { ok: false, errors: ["Kode rekening tidak ditemukan."] };

  const { error } = await supabase
    .from("transaksi")
    .update({
      kode_rekening_id: input.kode_rekening_id,
      tahapan_anggaran_id: input.tahapan_anggaran_id,
      judul_acara: input.judul_acara,
      tanggal_acara: input.tanggal_acara,
      no_sk_kpa: input.no_sk_kpa,
      ajuan,
      pptk_id: rekening.pptk_id,
      jenis_pengadaan: input.jenis_pengadaan,
      status_pkp: input.status_pkp,
      status_npwp: input.status_npwp,
      jenis_penyedia: input.jenis_penyedia,
      kualifikasi_konstruksi: input.kualifikasi_konstruksi || null,
      golongan_honorarium: input.golongan_honorarium || null,
      metode_pengadaan: input.metode_pengadaan,
      harga_termasuk_pajak: input.harga_termasuk_pajak,
      kena_pajak_daerah: input.kena_pajak_daerah,
      dpp: pajak.dpp,
      ppn: pajak.ppn,
      pph22: pajak.pph22,
      pph23: pajak.pph23,
      pph_perorangan: pajak.pphPerorangan,
      pph_final_4ayat2: pajak.pphFinal4Ayat2,
      pph21_final: pajak.pph21Final,
      pajak_daerah: pajak.pajakDaerah,
      label_pph_final: pajak.labelPphFinal,
      jumlah_potongan: pajak.jumlahPotongan,
      jumlah_diterima: pajak.jumlahDiterima,
    })
    .eq("id", transaksiId);

  if (error) return { ok: false, errors: [error.message] };

  await supabase.from("transaksi_rincian").delete().eq("transaksi_id", transaksiId);
  await supabase.from("transaksi_rincian").insert(input.rincian.map((r) => ({ transaksi_id: transaksiId, ...r })));

  await supabase.from("audit_log").insert({
    actor_id: userData.user.id, aksi: "update", entitas: "transaksi", entitas_id: transaksiId, detail: { ajuan, judul_acara: input.judul_acara },
  });

  revalidatePath("/dokumen");
  revalidatePath("/dashboard");
  redirect("/dokumen");
}

/** Menghapus transaksi (hanya status 'draft') beserta rincian & metadata dokumennya. */
export async function hapusTransaksi(transaksiId: string): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: "Sesi berakhir, silakan login kembali." };

  const { data: existing } = await supabase.from("transaksi").select("status, judul_acara").eq("id", transaksiId).single();
  if (!existing) return { error: "Transaksi tidak ditemukan." };
  if (existing.status !== "draft") {
    return { error: `Transaksi berstatus '${existing.status}' tidak dapat dihapus. Hanya status 'draft' yang bisa dihapus.` };
  }

  const { error } = await supabase.from("transaksi").delete().eq("id", transaksiId);
  if (error) return { error: error.message };

  await supabase.from("audit_log").insert({
    actor_id: userData.user.id, aksi: "delete", entitas: "transaksi", entitas_id: transaksiId, detail: { judul_acara: existing.judul_acara },
  });

  revalidatePath("/dokumen");
  revalidatePath("/dashboard");
  return { ok: true };
}
