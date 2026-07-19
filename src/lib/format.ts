export function rupiah(n: number): string {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"];
const BELASAN = ["Sepuluh", "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas", "Enam Belas", "Tujuh Belas", "Delapan Belas", "Sembilan Belas"];
const PULUHAN = ["", "", "Dua Puluh", "Tiga Puluh", "Empat Puluh", "Lima Puluh", "Enam Puluh", "Tujuh Puluh", "Delapan Puluh", "Sembilan Puluh"];

function terbilangRaw(n: number): string {
  n = Math.floor(n);
  if (n < 10) return SATUAN[n];
  if (n < 20) return BELASAN[n - 10];
  if (n < 100) return `${PULUHAN[Math.floor(n / 10)]} ${SATUAN[n % 10]}`.trim();
  if (n < 200) return `Seratus ${terbilangRaw(n - 100)}`.trim();
  if (n < 1000) return `${SATUAN[Math.floor(n / 100)]} Ratus ${terbilangRaw(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${terbilangRaw(n - 1000)}`.trim();
  if (n < 1_000_000) return `${terbilangRaw(Math.floor(n / 1000))} Ribu ${terbilangRaw(n % 1000)}`.trim();
  if (n < 1_000_000_000) return `${terbilangRaw(Math.floor(n / 1_000_000))} Juta ${terbilangRaw(n % 1_000_000)}`.trim();
  if (n < 1_000_000_000_000) return `${terbilangRaw(Math.floor(n / 1_000_000_000))} Miliar ${terbilangRaw(n % 1_000_000_000)}`.trim();
  return `${terbilangRaw(Math.floor(n / 1_000_000_000_000))} Triliun ${terbilangRaw(n % 1_000_000_000_000)}`.trim();
}

export function terbilang(n: number): string {
  if (!n || n <= 0) return "Nol Rupiah";
  return terbilangRaw(n).replace(/\s+/g, " ").trim() + " Rupiah";
}

export function formatTanggalIndonesia(iso: string): string {
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const d = new Date(iso);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}
