import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
export { TAHUN_ANGGARAN_OPTIONS, TAHAPAN_OPTIONS } from "@/lib/anggaran-constants";

const COOKIE_TAHUN = "panda_tahun";
const COOKIE_TAHAPAN = "panda_tahapan";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

export interface KonteksAnggaran {
  tahunId: string;
  tahun: number;
  tahapanId: string;
  tahapanKode: string;
}

/** Dipanggil dari server action (mis. saat login) untuk menyimpan pilihan tahun/tahapan. */
export async function setKonteksAnggaran(tahunId: string, tahapanId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_TAHUN, tahunId, { maxAge: COOKIE_MAX_AGE, path: "/", sameSite: "lax" });
  cookieStore.set(COOKIE_TAHAPAN, tahapanId, { maxAge: COOKIE_MAX_AGE, path: "/", sameSite: "lax" });
}

/**
 * Dipakai di Server Component untuk membaca tahun & tahapan yang sedang
 * aktif untuk sesi pengguna ini. Jika cookie belum ada (mis. sesi lama
 * sebelum fitur ini ditambahkan), fallback ke tahun_anggaran berstatus
 * 'aktif' + tahapan 'perubahan' (paling umum dipakai di akhir tahun berjalan).
 */
export async function getKonteksAnggaran(): Promise<KonteksAnggaran | null> {
  const cookieStore = await cookies();
  const supabase = await createClient();

  const tahunIdCookie = cookieStore.get(COOKIE_TAHUN)?.value;
  const tahapanIdCookie = cookieStore.get(COOKIE_TAHAPAN)?.value;

  if (tahunIdCookie && tahapanIdCookie) {
    const { data: tahunRow } = await supabase.from("tahun_anggaran").select("id, tahun").eq("id", tahunIdCookie).maybeSingle();
    const { data: tahapanRow } = await supabase.from("tahapan_anggaran").select("id, kode").eq("id", tahapanIdCookie).maybeSingle();
    if (tahunRow && tahapanRow) {
      return { tahunId: tahunRow.id, tahun: tahunRow.tahun, tahapanId: tahapanRow.id, tahapanKode: tahapanRow.kode };
    }
  }

  // Fallback: tahun aktif + tahapan 'perubahan'
  const { data: tahunAktif } = await supabase.from("tahun_anggaran").select("id, tahun").eq("status", "aktif").order("tahun", { ascending: false }).limit(1).maybeSingle();
  const { data: tahapanPerubahan } = await supabase.from("tahapan_anggaran").select("id, kode").eq("kode", "perubahan").maybeSingle();
  if (tahunAktif && tahapanPerubahan) {
    return { tahunId: tahunAktif.id, tahun: tahunAktif.tahun, tahapanId: tahapanPerubahan.id, tahapanKode: tahapanPerubahan.kode };
  }
  return null;
}

/**
 * Memastikan baris `tahun_anggaran` (untuk tahun yang dipilih) dan ketiga
 * baris standar `tahapan_anggaran` (murni/pergeseran/perubahan) tersedia di
 * database, membuatnya otomatis kalau belum ada. Dipanggil dari login &
 * switcher konteks (topbar) agar aplikasi "self-healing" — sebelumnya kalau
 * `seed.sql` belum/lupa dijalankan, konteks gagal terbentuk TANPA pesan
 * yang jelas (badge "TA ..." di topbar tidak muncul sama sekali, dan fitur
 * lain yang bergantung konteks — Transaksi, Import Excel, dsb — ikut gagal
 * diam-diam). Sekarang baris yang kurang dibuatkan sendiri di sini.
 *
 * Perlu client SERVICE ROLE (bypass RLS) karena dipanggil sebelum/di luar
 * konteks pengguna yang sudah terautentikasi penuh.
 */
export async function pastikanKonteksTersedia(
  admin: any,
  tahun: number,
  tahapanKode: string
): Promise<{ tahunId: string; tahapanId: string } | null> {
  // 1) Pastikan 3 tahapan standar ada (aman diulang berkali-kali).
  await admin.from("tahapan_anggaran").upsert(
    [
      { kode: "murni", nama: "Murni" },
      { kode: "pergeseran", nama: "Pergeseran" },
      { kode: "perubahan", nama: "Perubahan" },
    ],
    { onConflict: "kode", ignoreDuplicates: true }
  );

  // 2) Pastikan tahun yang dipilih tersedia — buat otomatis kalau belum ada.
  let { data: tahunRow } = await admin.from("tahun_anggaran").select("id").eq("tahun", tahun).maybeSingle();
  if (!tahunRow) {
    const { data: created, error } = await admin.from("tahun_anggaran").insert({ tahun, status: "aktif" }).select("id").maybeSingle();
    if (error) {
      console.error("[konteks] Gagal membuat tahun_anggaran otomatis:", error.message);
    } else {
      tahunRow = created;
    }
  }

  const { data: tahapanRow } = await admin.from("tahapan_anggaran").select("id").eq("kode", tahapanKode).maybeSingle();

  if (!tahunRow || !tahapanRow) return null;
  return { tahunId: tahunRow.id, tahapanId: tahapanRow.id };
}
