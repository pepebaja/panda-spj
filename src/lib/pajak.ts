/**
 * lib/pajak.ts — Mesin perhitungan pajak pengadaan barang/jasa pemerintah.
 *
 * Rujukan (per riset Juli 2026 — SELALU cek update regulasi terbaru,
 * lihat catatan "PENTING" di README):
 * - PPN: UU HPP — tarif nominal 12% mulai 2025, TAPI untuk barang/jasa
 *   non-mewah memakai DPP Nilai Lain 11/12 x harga (PMK 131/2024), sehingga
 *   tarif EFEKTIF = 12% x 11/12 = 11% dari harga. Barang mewah (kena PPnBM)
 *   dikenakan 12% penuh — DI LUAR CAKUPAN modul ini karena pengadaan ATK/
 *   jasa/honorarium rutin SKPD tidak termasuk kategori barang mewah.
 * - Instansi pemerintah TETAP berstatus Pemungut PPN (WAPU) atas transaksi
 *   dengan rekanan PKP (PMK 231/2019 jo. PMK 59/2022) — PPN dipungut oleh
 *   bendahara dan mengurangi jumlah yang diterima rekanan (bukan disetor
 *   sendiri oleh rekanan). Dikecualikan bila nilai transaksi ≤ Rp2.000.000.
 * - PPh Pasal 22 (pembelian barang oleh instansi pemerintah, PMK 51/2025):
 *   1,5% x DPP (tidak termasuk PPN); 3% bila rekanan tanpa NPWP; tidak
 *   dipungut bila nilai transaksi ≤ Rp2.000.000 (dan bukan pemecahan nilai).
 * - PPh Pasal 23 (jasa lainnya per PMK 141/2015, sewa selain tanah/
 *   bangunan): 2% x DPP untuk rekanan Badan Usaha ber-NPWP; 4% tanpa NPWP;
 *   TIDAK ADA batas minimum transaksi. Hanya berlaku untuk rekanan Badan
 *   Usaha — jasa dari PERORANGAN otomatis dialihkan ke rezim "PPh Perorangan"
 *   (lihat di bawah), bukan PPh 23.
 * - PPh Perorangan (nama umum di kuitansi pemerintah untuk PPh 21 bukan
 *   pegawai): berlaku otomatis ketika rekanan jasa berstatus Perorangan.
 *   Disederhanakan sebagai tarif Pasal 17 lapisan pertama (5%) x 50% dari
 *   bruto = 2,5% untuk transaksi tunggal (TIDAK memperhitungkan akumulasi
 *   penghasilan setahun berjalan — bisa lebih tinggi bila berulang/besar).
 * - PPh Final Pasal 4(2) sewa tanah/bangunan: 10% x DPP (PP 34/2017).
 * - PPh Final Pasal 4(2) jasa konstruksi (PP 9/2022): tarif bervariasi
 *   menurut kualifikasi & jenis (pelaksanaan/perencanaan-pengawasan).
 * - PPh 21 Final honorarium ASN: menurut golongan (PMK 262/2010:
 *   Gol I/II = 0%, Gol III = 5%, Gol IV = 15%).
 * - Pajak Daerah (mis. Pajak Restoran/Rumah Makan, Pajak Hotel — UU HKPD
 *   No. 1/2022): 10% dari DPP, dipungut OLEH REKANAN (bukan bendahara)
 *   dan sudah termasuk dalam harga tagihan rekanan restoran/hotel — objek
 *   Pajak Daerah dan PPN bersifat SALING MENIADAKAN (jasa restoran/hotel
 *   BUKAN objek PPN, per prinsip non-double-taxation UU HKPD/UU PPN),
 *   sehingga saat toggle ini aktif, PPN otomatis tidak dipungut.
 *
 * PERINGATAN: modul ini adalah alat bantu hitung, BUKAN pengganti
 * penelaahan Bendahara/Verifikator Pajak. Klasifikasi objek pajak kerap
 * butuh judgment kasus per kasus. Selalu verifikasi ke KPP setempat untuk
 * transaksi bernilai besar/tidak lazim.
 */

export type JenisPengadaan =
  | "barang"
  | "jasa_lainnya"
  | "jasa_konsultansi"
  | "jasa_konstruksi_pelaksanaan"
  | "jasa_konstruksi_konsultansi"
  | "sewa_tanah_bangunan"
  | "honorarium_pns"
  | "honorarium_non_pns";

export type JenisPenyedia = "badan_usaha" | "perorangan";
export type KualifikasiKonstruksi = "kecil_bersertifikat" | "menengah_besar_bersertifikat" | "tanpa_sertifikat";
export type GolonganHonorarium = "I_II" | "III" | "IV";
export type MetodePengadaan = "manual" | "e_katalog";

export const AMBANG_BATAS_PPN_PPH22 = 2_000_000; // Rp2jt — di bawah ini PPN & PPh22 tidak dipungut

export interface InputPajak {
  jenisPengadaan: JenisPengadaan;
  nilaiTagihan: number; // nilai sesuai kuitansi/invoice
  hargaTermasukPajak: boolean; // true = nilaiTagihan sudah termasuk PPN
  statusPkp: boolean; // rekanan Pengusaha Kena Pajak?
  statusNpwp: boolean; // rekanan punya NPWP?
  jenisPenyedia: JenisPenyedia;
  kualifikasiKonstruksi?: KualifikasiKonstruksi;
  golonganHonorarium?: GolonganHonorarium;
  metodePengadaan: MetodePengadaan; // informasional saja — tidak mengubah tarif
  kenaPajakDaerah?: boolean; // restoran/rumah makan/hotel — lihat catatan di atas
}

export interface HasilPajak {
  dpp: number;
  ppn: number;
  pph22: number;
  pph23: number;
  pphPerorangan: number; // "PPH Perorangan" pada kuitansi — PPh 21 bukan pegawai
  pphFinal4Ayat2: number;
  pph21Final: number;
  pajakDaerah: number;
  jumlahPotongan: number;
  jumlahDiterima: number;
  labelPphFinal: string | null; // label baris di kuitansi, mis. "PPh Final (Sewa Tanah/Bangunan 10%)"
  catatan: string[]; // peringatan/penjelasan untuk verifikator
}

const RATE = {
  ppnEfektif: 0.11,
  pph22Normal: 0.015,
  pph22NonNpwp: 0.03,
  pph23Normal: 0.02,
  pph23NonNpwp: 0.04,
  pphPerorangan: 0.05 * 0.5, // Pasal 17 lapisan pertama (5%) x 50% perkiraan neto = 2,5%
  sewaTanahBangunanFinal: 0.10,
  konstruksiPelaksanaan: { kecil_bersertifikat: 0.0175, menengah_besar_bersertifikat: 0.0265, tanpa_sertifikat: 0.04 },
  konstruksiKonsultansi: { kecil_bersertifikat: 0.035, menengah_besar_bersertifikat: 0.035, tanpa_sertifikat: 0.06 },
  honorariumPns: { I_II: 0, III: 0.05, IV: 0.15 },
  honorariumNonPns: 0.05 * 0.5,
  pajakDaerah: 0.10,
};

/** Menghitung DPP dari nilai tagihan, memperhitungkan status PKP & toggle "termasuk pajak". */
function hitungDpp(nilaiTagihan: number, hargaTermasukPajak: boolean, statusPkp: boolean): number {
  if (!statusPkp) return nilaiTagihan; // Non-PKP tidak boleh memungut PPN — seluruh nilai adalah DPP untuk PPh
  if (!hargaTermasukPajak) return nilaiTagihan;
  return nilaiTagihan / (1 + RATE.ppnEfektif);
}

export function hitungPajak(input: InputPajak): HasilPajak {
  const catatan: string[] = [];
  const { jenisPengadaan, nilaiTagihan, hargaTermasukPajak, statusPkp, statusNpwp, jenisPenyedia, kenaPajakDaerah } = input;

  const dpp = hitungDpp(nilaiTagihan, hargaTermasukPajak, statusPkp);
  const dibawahAmbangBatas = nilaiTagihan <= AMBANG_BATAS_PPN_PPH22;

  let ppn = 0;
  let pph22 = 0;
  let pph23 = 0;
  let pphPerorangan = 0;
  let pphFinal4Ayat2 = 0;
  let pph21Final = 0;
  let pajakDaerah = 0;
  let labelPphFinal: string | null = null;

  // ---------- Pajak Daerah (restoran/rumah makan/hotel) ----------
  // Objek Pajak Daerah & PPN saling meniadakan — kalau kena Pajak Daerah,
  // PPN TIDAK dipungut sama sekali (dihitung terpisah, di luar blok PPN di bawah).
  if (kenaPajakDaerah) {
    pajakDaerah = dpp * RATE.pajakDaerah;
    catatan.push("Pajak Daerah 10% (Restoran/Hotel) dipungut oleh rekanan, bukan bendahara — PPN otomatis tidak dipungut karena objeknya saling meniadakan (UU HKPD).");
  }

  // ---------- PPN (hanya jika rekanan PKP DAN tidak kena Pajak Daerah) ----------
  if (kenaPajakDaerah) {
    // tidak dipungut — lihat catatan di atas
  } else if (statusPkp) {
    if (dibawahAmbangBatas) {
      catatan.push("PPN tidak dipungut karena nilai transaksi ≤ Rp2.000.000 (PMK 59/2022 Pasal 18).");
    } else {
      ppn = dpp * RATE.ppnEfektif;
    }
  } else {
    catatan.push("Rekanan Non-PKP: tidak dipungut PPN (Non-PKP tidak berhak menerbitkan Faktur Pajak).");
  }

  // ---------- Objek pajak sesuai jenis pengadaan ----------
  switch (jenisPengadaan) {
    case "barang": {
      if (dibawahAmbangBatas) {
        catatan.push("PPh Pasal 22 tidak dipungut karena nilai transaksi ≤ Rp2.000.000.");
      } else {
        pph22 = dpp * (statusNpwp ? RATE.pph22Normal : RATE.pph22NonNpwp);
        if (!statusNpwp) catatan.push("Tarif PPh 22 didobelkan (3%) karena rekanan tidak ber-NPWP.");
      }
      break;
    }
    case "jasa_lainnya":
    case "jasa_konsultansi": {
      if (jenisPenyedia === "perorangan") {
        // Jasa dari perorangan -> "PPh Perorangan" (PPh 21 bukan pegawai),
        // BUKAN PPh 23 (PPh 23 khusus Badan Usaha).
        pphPerorangan = dpp * RATE.pphPerorangan;
        catatan.push(
          "Rekanan Perorangan: dipotong PPh Perorangan (PPh 21 bukan pegawai) 2,5% (5% x 50% DPP), bukan PPh 23 " +
          "yang khusus untuk Badan Usaha. Bila penerima yang sama menerima pembayaran berulang dengan akumulasi " +
          "besar dalam satu tahun pajak, tarif progresif Pasal 17 penuh dapat berlaku — konsultasikan ke Bendahara/KPP."
        );
      } else {
        pph23 = dpp * (statusNpwp ? RATE.pph23Normal : RATE.pph23NonNpwp);
        if (!statusNpwp) catatan.push("Tarif PPh 23 didobelkan (4%) karena rekanan tidak ber-NPWP.");
      }
      break;
    }
    case "sewa_tanah_bangunan": {
      pphFinal4Ayat2 = dpp * RATE.sewaTanahBangunanFinal;
      labelPphFinal = "PPh Final Ps. 4(2) — Sewa Tanah/Bangunan (10%)";
      catatan.push("PPh Final Sewa Tanah/Bangunan bersifat final 10%, tidak dipengaruhi status NPWP (PP 34/2017).");
      break;
    }
    case "jasa_konstruksi_pelaksanaan": {
      const kualifikasi = input.kualifikasiKonstruksi || "tanpa_sertifikat";
      const tarif = RATE.konstruksiPelaksanaan[kualifikasi];
      pphFinal4Ayat2 = dpp * tarif;
      labelPphFinal = `PPh Final Ps. 4(2) — Jasa Konstruksi Pelaksanaan (${(tarif * 100).toFixed(2)}%)`;
      if (kualifikasi === "tanpa_sertifikat") catatan.push("Tarif 4% dipakai karena rekanan tidak memiliki Sertifikat Badan Usaha (SBU)/Sertifikat Kompetensi Kerja.");
      break;
    }
    case "jasa_konstruksi_konsultansi": {
      const kualifikasi = input.kualifikasiKonstruksi || "tanpa_sertifikat";
      const tarif = RATE.konstruksiKonsultansi[kualifikasi];
      pphFinal4Ayat2 = dpp * tarif;
      labelPphFinal = `PPh Final Ps. 4(2) — Jasa Konsultansi Konstruksi (${(tarif * 100).toFixed(2)}%)`;
      if (kualifikasi === "tanpa_sertifikat") catatan.push("Tarif 6% dipakai karena rekanan tidak memiliki SBU/Sertifikat Kompetensi Kerja.");
      break;
    }
    case "honorarium_pns": {
      const golongan = input.golonganHonorarium || "III";
      const tarif = RATE.honorariumPns[golongan];
      pph21Final = dpp * tarif;
      labelPphFinal = `PPh 21 Final — Honorarium ASN Gol. ${golongan.replace("_", "/")} (${(tarif * 100).toFixed(0)}%)`;
      catatan.push("Tarif honorarium ASN mengikuti golongan kepangkatan penerima (PMK 262/PMK.03/2010).");
      if (ppn > 0) catatan.push("Periksa kembali: honorarium biasanya bukan objek PPN.");
      break;
    }
    case "honorarium_non_pns": {
      pph21Final = dpp * RATE.honorariumNonPns;
      labelPphFinal = "PPh 21 Final — Honorarium Non-ASN (5% x 50% DPP)";
      catatan.push(
        "Perhitungan 2,5% memakai asumsi penerima menerima honorarium tidak berkesinambungan dalam jumlah wajar. " +
        "Jika penerima yang sama menerima honorarium berulang dengan akumulasi besar dalam satu tahun pajak, tarif progresif " +
        "Pasal 17 penuh dapat berlaku — konsultasikan ke Bendahara/KPP."
      );
      break;
    }
  }

  const jumlahPotongan = pajakDaerah + ppn + pph22 + pph23 + pphPerorangan + pphFinal4Ayat2 + pph21Final;
  const jumlahDiterima = nilaiTagihan - jumlahPotongan;

  return { dpp, ppn, pph22, pph23, pphPerorangan, pphFinal4Ayat2, pph21Final, pajakDaerah, jumlahPotongan, jumlahDiterima, labelPphFinal, catatan };
}

export const JENIS_PENGADAAN_OPTIONS: { value: JenisPengadaan; label: string }[] = [
  { value: "barang", label: "Barang (ATK, konsumsi, peralatan, dsb.)" },
  { value: "jasa_lainnya", label: "Jasa Lainnya / Sewa (selain tanah & bangunan)" },
  { value: "jasa_konsultansi", label: "Jasa Konsultansi (non-konstruksi)" },
  { value: "jasa_konstruksi_pelaksanaan", label: "Jasa Konstruksi — Pelaksanaan" },
  { value: "jasa_konstruksi_konsultansi", label: "Jasa Konstruksi — Perencanaan/Pengawasan" },
  { value: "sewa_tanah_bangunan", label: "Sewa Tanah dan/atau Bangunan" },
  { value: "honorarium_pns", label: "Honorarium Narasumber/Panitia — ASN" },
  { value: "honorarium_non_pns", label: "Honorarium Narasumber/Panitia — Non-ASN" },
];
