import { describe, it, expect } from "vitest";
import { validasiPagu, validasiKodeRekeningWajib } from "@/lib/validasi";
import type { KodeRekening } from "@/lib/types";

const rekening: KodeRekening = {
  id: "r1", tahun_id: "t1", kode: "4.01.01.2.02.0002.5.1.02.02.001.00080",
  program: "Program A", kegiatan: "Kegiatan A", sub_kegiatan: "Sub A", belanja: "Belanja A",
  sumber_dana: "PAD", pptk_id: "p1",
  pagu_murni: 10_000_000, pagu_pergeseran: 12_000_000, pagu_perubahan: 15_000_000,
};

describe("validasiPagu", () => {
  it("mengizinkan ajuan yang masih dalam batas pagu", () => {
    const hasil = validasiPagu({ rekening, tahapan: "perubahan", realisasiSebelumnya: 5_000_000, ajuanBaru: 5_000_000 });
    expect(hasil.melebihiPagu).toBe(false);
    expect(hasil.sisaPagu).toBe(5_000_000);
    expect(hasil.errors).toHaveLength(0);
  });

  it("menolak ajuan yang melebihi sisa pagu", () => {
    const hasil = validasiPagu({ rekening, tahapan: "perubahan", realisasiSebelumnya: 10_000_000, ajuanBaru: 6_000_000 });
    expect(hasil.melebihiPagu).toBe(true);
    expect(hasil.sisaPagu).toBeLessThan(0);
    expect(hasil.errors.some((e) => e.includes("melebihi sisa pagu"))).toBe(true);
  });

  it("menolak ajuan bernilai 0 atau negatif", () => {
    const hasil = validasiPagu({ rekening, tahapan: "perubahan", realisasiSebelumnya: 0, ajuanBaru: 0 });
    expect(hasil.errors.some((e) => e.includes("lebih besar dari 0"))).toBe(true);
  });

  it("menggunakan pagu sesuai tahapan anggaran yang dipilih", () => {
    const murni = validasiPagu({ rekening, tahapan: "murni", realisasiSebelumnya: 0, ajuanBaru: 11_000_000 });
    const perubahan = validasiPagu({ rekening, tahapan: "perubahan", realisasiSebelumnya: 0, ajuanBaru: 11_000_000 });
    expect(murni.melebihiPagu).toBe(true);   // 11jt > pagu murni 10jt
    expect(perubahan.melebihiPagu).toBe(false); // 11jt < pagu perubahan 15jt
  });

  it("tepat pas di batas pagu (sisa = 0) tidak dianggap melebihi", () => {
    const hasil = validasiPagu({ rekening, tahapan: "perubahan", realisasiSebelumnya: 0, ajuanBaru: 15_000_000 });
    expect(hasil.sisaPagu).toBe(0);
    expect(hasil.melebihiPagu).toBe(false);
  });
});

describe("validasiKodeRekeningWajib", () => {
  it("menerima format kode rekening yang valid", () => {
    expect(validasiKodeRekeningWajib("4.01.01.2.02.0002.5.1.02.02.001.00080")).toBe(true);
  });
  it("menolak format kode rekening yang tidak sesuai pola DPA", () => {
    expect(validasiKodeRekeningWajib("kode-asal-asalan")).toBe(false);
    expect(validasiKodeRekeningWajib("4.01.01.2.02.0002")).toBe(false);
  });
});
