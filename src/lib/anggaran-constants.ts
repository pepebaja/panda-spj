// Konstanta murni — TIDAK boleh mengimpor next/headers atau modul server-only
// lain, karena file ini diimpor baik dari Client Component (mis. konteks-
// switcher.tsx) maupun Server Component (mis. konteks-anggaran.ts).

export const TAHUN_ANGGARAN_OPTIONS = Array.from({ length: 11 }, (_, i) => 2026 + i); // 2026..2036
export const TAHAPAN_OPTIONS = [
  { kode: "murni", label: "Murni" },
  { kode: "pergeseran", label: "Pergeseran" },
  { kode: "perubahan", label: "Perubahan" },
];
