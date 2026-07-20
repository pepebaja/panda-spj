"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { setKonteksAnggaran, pastikanKonteksTersedia } from "@/lib/konteks-anggaran";

/**
 * Login mendukung DUA cara mengisi kolom "Username":
 * 1) Username asli (mis. "sari.anas") -> diterjemahkan ke email via tabel
 *    pegawai + Supabase Auth admin API.
 * 2) Email langsung (mis. "sari@batukota.go.id") -> dipakai langsung ke
 *    signInWithPassword, tanpa perlu kolom username terisi lebih dulu.
 * Ini sengaja dibuat toleran, karena pada masa transisi banyak akun yang
 * sudah dibuat di Supabase Authentication belum tentu sudah tertaut ke
 * baris `pegawai` dengan kolom `username` terisi.
 *
 * Setiap kegagalan dicatat ke server log (console.error, terlihat di
 * Vercel > Deployments > Functions Logs) dengan kode singkat agar
 * Administrator bisa mendiagnosis root cause TANPA aplikasi membocorkan
 * detail itu ke pengguna (pesan ke pengguna tetap digeneralisasi).
 *
 * CATATAN PERFORMA: lookup Tahun Anggaran/Tahapan (untuk cookie konteks)
 * TIDAK bergantung pada hasil autentikasi, jadi dijalankan PARALEL dengan
 * proses login (bukan berurutan sesudahnya) memakai Promise.all — mengurangi
 * jumlah round-trip berurutan ke Supabase yang sebelumnya membuat proses
 * login terasa lambat.
 */
export async function login(prev: { error?: string } | undefined, formData: FormData) {
  const identifier = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/dashboard");
  const tahunDipilih = Number(formData.get("tahun_anggaran") || 0);
  const tahapanDipilih = String(formData.get("tahapan") || "perubahan");

  if (!identifier || !password) {
    return { error: "Username dan kata sandi wajib diisi." };
  }

  const admin = createServiceRoleClient();
  const isEmail = identifier.includes("@");

  // Lookup tahun/tahapan tidak bergantung pada identitas pengguna — mulai
  // sekarang juga secara paralel, baru di-`await` belakangan (di bawah).
  // `pastikanKonteksTersedia` bersifat self-healing: kalau baris tahun/
  // tahapan yang dipilih belum ada di database (mis. seed.sql belum
  // dijalankan), akan dibuat otomatis alih-alih gagal diam-diam.
  const konteksPromise = tahunDipilih ? pastikanKonteksTersedia(admin, tahunDipilih, tahapanDipilih) : null;

  let emailUntukLogin: string | null = null;

  if (isEmail) {
    // Jalur 2: langsung dipakai sebagai email.
    emailUntukLogin = identifier;
  } else {
    // Jalur 1: username -> pegawai.id -> email asli dari Supabase Auth.
    const { data: pegawai, error: pegawaiError } = await admin
      .from("pegawai")
      .select("id, status_aktif")
      .eq("username", identifier)
      .maybeSingle();

    if (pegawaiError) {
      console.error("[login] Query pegawai by username gagal:", pegawaiError.message);
      return {
        error:
          "Konfigurasi akun belum lengkap di server (kode: PGW-USERNAME). Kemungkinan migration " +
          "0002_add_username_to_pegawai.sql belum dijalankan di database. Hubungi Administrator.",
      };
    }
    if (!pegawai) {
      return { error: "Username atau kata sandi salah." };
    }
    if (!pegawai.status_aktif) {
      return { error: "Akun Anda telah dinonaktifkan. Hubungi Administrator." };
    }

    const { data: authUser, error: lookupError } = await admin.auth.admin.getUserById(pegawai.id);
    if (lookupError || !authUser?.user?.email) {
      console.error("[login] getUserById gagal untuk pegawai.id:", pegawai.id, lookupError?.message);
      return {
        error:
          "Akun ini belum tertaut dengan benar ke Supabase Authentication (kode: PGW-LINK). " +
          "Hubungi Administrator untuk memeriksa kecocokan pegawai.id dengan auth.users.id.",
      };
    }
    emailUntukLogin = authUser.user.email;
  }

  const supabase = await createClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: emailUntukLogin!,
    password,
  });

  if (signInError) {
    console.error("[login] signInWithPassword gagal untuk email:", emailUntukLogin, signInError.message);
    return { error: "Username/email atau kata sandi salah." };
  }

  // Kalau login berhasil via email langsung, tetap cek status_aktif di tabel
  // pegawai (kalau baris pegawai untuk user ini sudah ada).
  if (isEmail && signInData.user) {
    const { data: pegawaiCek } = await supabase.from("pegawai").select("status_aktif").eq("id", signInData.user.id).maybeSingle();
    if (pegawaiCek && !pegawaiCek.status_aktif) {
      await supabase.auth.signOut();
      return { error: "Akun Anda telah dinonaktifkan. Hubungi Administrator." };
    }
  }

  // Ambil hasil lookup tahun/tahapan yang sudah berjalan paralel sejak awal.
  if (konteksPromise) {
    const hasil = await konteksPromise;
    if (hasil) {
      await setKonteksAnggaran(hasil.tahunId, hasil.tahapanId);
    }
  }

  redirect(redirectTo);
}
