import { describe, it, expect } from "vitest";
import { rupiah, terbilang, formatTanggalIndonesia } from "@/lib/format";

describe("rupiah", () => {
  it("memformat angka dengan pemisah ribuan gaya Indonesia", () => {
    expect(rupiah(1_500_000)).toBe("Rp 1.500.000");
    expect(rupiah(0)).toBe("Rp 0");
  });
  it("membulatkan nilai desimal", () => {
    expect(rupiah(1_000.6)).toBe("Rp 1.001");
  });
});

describe("terbilang", () => {
  it("mengembalikan 'Nol Rupiah' untuk nilai 0 atau kosong", () => {
    expect(terbilang(0)).toBe("Nol Rupiah");
  });
  it("menerjemahkan nilai puluhan dan ratusan dengan benar", () => {
    expect(terbilang(75)).toBe("Tujuh Puluh Lima Rupiah");
    expect(terbilang(100)).toBe("Seratus Rupiah");
  });
  it("menerjemahkan nilai jutaan sesuai pola kwitansi pemerintah", () => {
    expect(terbilang(59_220_000)).toBe("Lima Puluh Sembilan Juta Dua Ratus Dua Puluh Ribu Rupiah");
  });
  it("menangani angka seribu secara khusus (bukan 'Satu Ribu')", () => {
    expect(terbilang(1_500)).toBe("Seribu Lima Ratus Rupiah");
  });
});

describe("formatTanggalIndonesia", () => {
  it("memformat tanggal ISO ke format panjang Indonesia", () => {
    expect(formatTanggalIndonesia("2026-03-17")).toBe("17 Maret 2026");
  });
});
