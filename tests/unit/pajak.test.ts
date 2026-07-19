import { describe, it, expect } from "vitest";
import { hitungPajak, type InputPajak } from "@/lib/pajak";

const base: InputPajak = {
  jenisPengadaan: "barang",
  nilaiTagihan: 10_000_000,
  hargaTermasukPajak: false,
  statusPkp: true,
  statusNpwp: true,
  jenisPenyedia: "badan_usaha",
  metodePengadaan: "manual",
};

describe("PPN — rekanan PKP vs Non-PKP", () => {
  it("memungut PPN 11% untuk rekanan PKP di atas ambang batas", () => {
    const r = hitungPajak(base);
    expect(r.ppn).toBeCloseTo(1_100_000, 0);
  });

  it("tidak memungut PPN sama sekali untuk rekanan Non-PKP", () => {
    const r = hitungPajak({ ...base, statusPkp: false });
    expect(r.ppn).toBe(0);
  });

  it("menghitung ulang DPP dengan benar bila harga sudah termasuk PPN", () => {
    // Rp11.100.000 termasuk PPN 11% -> DPP = 11.100.000 / 1.11 = 10.000.000
    const r = hitungPajak({ ...base, nilaiTagihan: 11_100_000, hargaTermasukPajak: true });
    expect(r.dpp).toBeCloseTo(10_000_000, 0);
    expect(r.ppn).toBeCloseTo(1_100_000, 0);
  });

  it("tidak memungut PPN/PPh22 untuk transaksi ≤ Rp2.000.000", () => {
    const r = hitungPajak({ ...base, nilaiTagihan: 1_500_000 });
    expect(r.ppn).toBe(0);
    expect(r.pph22).toBe(0);
  });
});

describe("PPh Pasal 22 — pembelian barang", () => {
  it("memungut 1,5% dari DPP untuk rekanan ber-NPWP", () => {
    const r = hitungPajak(base);
    expect(r.pph22).toBeCloseTo(10_000_000 * 0.015, 0);
  });

  it("memungut 3% (dobel) untuk rekanan tanpa NPWP", () => {
    const r = hitungPajak({ ...base, statusNpwp: false });
    expect(r.pph22).toBeCloseTo(10_000_000 * 0.03, 0);
  });
});

describe("PPh Pasal 23 — jasa lainnya", () => {
  const jasa: InputPajak = { ...base, jenisPengadaan: "jasa_lainnya" };

  it("memungut 2% dari DPP untuk badan usaha ber-NPWP", () => {
    const r = hitungPajak(jasa);
    expect(r.pph23).toBeCloseTo(10_000_000 * 0.02, 0);
    expect(r.pph22).toBe(0); // bukan objek PPh 22
  });

  it("memungut 4% (dobel) untuk badan usaha tanpa NPWP", () => {
    const r = hitungPajak({ ...jasa, statusNpwp: false });
    expect(r.pph23).toBeCloseTo(10_000_000 * 0.04, 0);
  });

  it("TIDAK ada batas minimum transaksi (beda dengan PPN/PPh22)", () => {
    const r = hitungPajak({ ...jasa, nilaiTagihan: 100_000 });
    expect(r.pph23).toBeGreaterThan(0);
  });

  it("rekanan perorangan otomatis dipotong PPh Perorangan 2,5% (bukan PPh 23)", () => {
    const r = hitungPajak({ ...jasa, jenisPenyedia: "perorangan" });
    expect(r.pph23).toBe(0);
    expect(r.pphPerorangan).toBeCloseTo(10_000_000 * 0.025, 0);
    expect(r.catatan.some((c) => c.includes("PPh Perorangan"))).toBe(true);
  });
});

describe("Pajak Daerah — restoran/rumah makan/hotel", () => {
  it("memungut 10% dari DPP saat toggle aktif", () => {
    const r = hitungPajak({ ...base, kenaPajakDaerah: true });
    expect(r.pajakDaerah).toBeCloseTo(10_000_000 * 0.10, 0);
  });

  it("PPN otomatis tidak dipungut sama sekali saat kena Pajak Daerah (saling meniadakan)", () => {
    const r = hitungPajak({ ...base, kenaPajakDaerah: true, statusPkp: true });
    expect(r.ppn).toBe(0);
    expect(r.pajakDaerah).toBeGreaterThan(0);
  });

  it("tidak ada Pajak Daerah bila toggle tidak diaktifkan", () => {
    const r = hitungPajak(base);
    expect(r.pajakDaerah).toBe(0);
  });

  it("Pajak Daerah bisa berlaku bersamaan dengan PPh 22 (barang/katering)", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "barang", kenaPajakDaerah: true });
    expect(r.pajakDaerah).toBeGreaterThan(0);
    expect(r.pph22).toBeGreaterThan(0);
  });
});

describe("PPh Final Pasal 4(2) — sewa tanah/bangunan", () => {
  it("selalu 10% dari DPP, tidak terpengaruh status NPWP", () => {
    const withNpwp = hitungPajak({ ...base, jenisPengadaan: "sewa_tanah_bangunan" });
    const withoutNpwp = hitungPajak({ ...base, jenisPengadaan: "sewa_tanah_bangunan", statusNpwp: false });
    expect(withNpwp.pphFinal4Ayat2).toBeCloseTo(1_000_000, 0);
    expect(withoutNpwp.pphFinal4Ayat2).toBeCloseTo(1_000_000, 0);
  });
});

describe("PPh Final Pasal 4(2) — jasa konstruksi", () => {
  it("pelaksanaan konstruksi kualifikasi kecil bersertifikat = 1,75%", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "jasa_konstruksi_pelaksanaan", kualifikasiKonstruksi: "kecil_bersertifikat" });
    expect(r.pphFinal4Ayat2).toBeCloseTo(10_000_000 * 0.0175, 0);
  });
  it("pelaksanaan konstruksi menengah/besar bersertifikat = 2,65%", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "jasa_konstruksi_pelaksanaan", kualifikasiKonstruksi: "menengah_besar_bersertifikat" });
    expect(r.pphFinal4Ayat2).toBeCloseTo(10_000_000 * 0.0265, 0);
  });
  it("pelaksanaan konstruksi tanpa sertifikat = 4%", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "jasa_konstruksi_pelaksanaan", kualifikasiKonstruksi: "tanpa_sertifikat" });
    expect(r.pphFinal4Ayat2).toBeCloseTo(10_000_000 * 0.04, 0);
  });
  it("konsultansi konstruksi bersertifikat = 3,5%", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "jasa_konstruksi_konsultansi", kualifikasiKonstruksi: "kecil_bersertifikat" });
    expect(r.pphFinal4Ayat2).toBeCloseTo(10_000_000 * 0.035, 0);
  });
  it("konsultansi konstruksi tanpa sertifikat = 6%", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "jasa_konstruksi_konsultansi", kualifikasiKonstruksi: "tanpa_sertifikat" });
    expect(r.pphFinal4Ayat2).toBeCloseTo(10_000_000 * 0.06, 0);
  });
});

describe("PPh 21 Final — honorarium", () => {
  it("ASN golongan I/II tidak dipotong pajak (0%)", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "honorarium_pns", golonganHonorarium: "I_II" });
    expect(r.pph21Final).toBe(0);
  });
  it("ASN golongan III dipotong 5%", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "honorarium_pns", golonganHonorarium: "III" });
    expect(r.pph21Final).toBeCloseTo(10_000_000 * 0.05, 0);
  });
  it("ASN golongan IV dipotong 15%", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "honorarium_pns", golonganHonorarium: "IV" });
    expect(r.pph21Final).toBeCloseTo(10_000_000 * 0.15, 0);
  });
  it("Non-ASN dipotong 2,5% (5% x 50% DPP)", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "honorarium_non_pns" });
    expect(r.pph21Final).toBeCloseTo(10_000_000 * 0.025, 0);
  });
});

describe("Konsistensi jumlah potongan & jumlah diterima", () => {
  it("jumlah diterima = nilai tagihan - total semua potongan pajak", () => {
    const r = hitungPajak(base);
    expect(r.jumlahPotongan).toBeCloseTo(r.pajakDaerah + r.ppn + r.pph22 + r.pph23 + r.pphPerorangan + r.pphFinal4Ayat2 + r.pph21Final, 6);
    expect(r.jumlahDiterima).toBeCloseTo(base.nilaiTagihan - r.jumlahPotongan, 6);
  });

  it("jumlah diterima tidak pernah melebihi nilai tagihan", () => {
    const r = hitungPajak({ ...base, jenisPengadaan: "sewa_tanah_bangunan" });
    expect(r.jumlahDiterima).toBeLessThan(base.nilaiTagihan);
  });
});
