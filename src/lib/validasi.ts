import type { KodeRekening } from "@/lib/types";

export interface HasilValidasiPagu {
  pagu: number;
  sisaPagu: number;
  melebihiPagu: boolean;
  errors: string[];
}

/**
 * Validasi inti: realisasi (sebelum + ajuan sekarang) tidak boleh melebihi pagu
 * pada tahapan anggaran yang dipilih (Murni/Pergeseran/Perubahan).
 * Dipakai di client (untuk UX real-time) DAN di server/trigger DB (source of truth
 * final ada di trigger `fn_validasi_dan_hitung_transaksi` pada schema.sql —
 * validasi di sini adalah lapisan kedua agar pengguna dapat feedback instan).
 */
export function validasiPagu(params: {
  rekening: KodeRekening;
  tahapan: "murni" | "pergeseran" | "perubahan";
  realisasiSebelumnya: number; // total transaksi lain yang sudah tercatat pada kode rekening ini
  ajuanBaru: number;
}): HasilValidasiPagu {
  const { rekening, tahapan, realisasiSebelumnya, ajuanBaru } = params;
  const pagu =
    tahapan === "murni"
      ? rekening.pagu_murni
      : tahapan === "pergeseran"
      ? rekening.pagu_pergeseran
      : rekening.pagu_perubahan;

  const sisaPagu = pagu - realisasiSebelumnya - ajuanBaru;
  const errors: string[] = [];

  if (ajuanBaru <= 0) errors.push("Nilai ajuan harus lebih besar dari 0.");
  if (sisaPagu < 0) errors.push(`Ajuan melebihi sisa pagu sebesar Rp ${Math.abs(sisaPagu).toLocaleString("id-ID")}.`);

  return { pagu, sisaPagu, melebihiPagu: sisaPagu < 0, errors };
}

export function validasiKodeRekeningWajib(kode: string): boolean {
  // Pola: 4.01.01.2.02.0002.5.1.02.02.001.00080
  return /^\d(\.\d{2}){2}\.\d\.\d{2}\.\d{4}\.\d\.\d\.\d{2}\.\d{2}\.\d{3}\.\d{5}$/.test(kode);
}
