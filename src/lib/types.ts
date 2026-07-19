// Tipe domain — selaras 1:1 dengan supabase/schema.sql
// Jika skema berubah, perbarui file ini (idealnya via `supabase gen types typescript`).

import type { JenisPengadaan } from "@/lib/pajak";

export type Role = "Administrator" | "KPA" | "PPTK" | "BPP" | "Auditor" | "Viewer";

export type StatusTransaksi = "draft" | "diajukan" | "disetujui" | "dicairkan" | "ditolak";

export interface Pegawai {
  id: string;
  nama: string;
  nip: string;
  username: string | null;
  pangkat: string | null;
  jabatan: string | null;
  no_sk: string | null;
  role: Role;
  status_aktif: boolean;
}

export interface KodeRekening {
  id: string;
  tahun_id: string;
  kode: string;
  program: string;
  kegiatan: string;
  sub_kegiatan: string;
  belanja: string;
  sumber_dana: string;
  pptk_id: string;
  pagu_murni: number;
  pagu_pergeseran: number;
  pagu_perubahan: number;
}

export interface TransaksiRincian {
  id: string;
  uraian: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  jumlah: number;
}

export interface Transaksi {
  id: string;
  kode_rekening_id: string;
  tahapan_anggaran: "murni" | "pergeseran" | "perubahan";
  tahun_anggaran: number;
  judul_acara: string;
  tanggal_acara: string; // ISO date
  no_sk_kpa: string;
  nomor_nota_dinas: string | null;
  nomor_bukti_kuitansi: string | null;
  realisasi_sebelum: number;
  ajuan: number;
  sisa_pagu: number;
  pptk_id: string;
  kpa_id: string;
  bpp_id: string;
  penerima: string | null;
  status: StatusTransaksi;
  rincian: TransaksiRincian[];
  // Klasifikasi & hasil perhitungan pajak — lihat src/lib/pajak.ts
  jenis_pengadaan: JenisPengadaan;
  status_pkp: boolean;
  status_npwp: boolean;
  jenis_penyedia: "badan_usaha" | "perorangan";
  kualifikasi_konstruksi: string | null;
  golongan_honorarium: string | null;
  metode_pengadaan: "manual" | "e_katalog";
  harga_termasuk_pajak: boolean;
  dpp: number;
  ppn: number;
  pph22: number;
  pph23: number;
  pph_final_4ayat2: number;
  pph21_final: number;
  kena_pajak_daerah: boolean;
  pajak_daerah: number;
  pph_perorangan: number;
  label_pph_final: string | null;
  jumlah_potongan: number;
  jumlah_diterima: number;
  created_at: string;
}

// Payload gabungan yang dipakai generator dokumen (hasil join transaksi + relasi)
export interface DokumenPayload {
  transaksi: Transaksi;
  rekening: KodeRekening;
  pptk: Pegawai;
  kpa: Pegawai;
  bpp: Pegawai;
}

// Placeholder minimal untuk @supabase/ssr generics — ganti dengan hasil
// `supabase gen types typescript --project-id <id>` setelah proyek Supabase dibuat.
export type Database = any;
