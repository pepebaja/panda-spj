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
