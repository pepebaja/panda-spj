"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Dipakai pengguna untuk mengatur username AKUN SENDIRI (bukan admin
 * mengatur punya orang lain — untuk itu pakai Master Data > Pegawai atau
 * Pengguna > Tautkan Akun). Sengaja dibatasi `.eq("id", user.id)` agar
 * tidak bisa menimpa username pengguna lain.
 */
export async function aturUsernameSaya(prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { error: "Sesi berakhir, silakan login kembali." };

  const username = String(formData.get("username") || "").trim().toLowerCase();
  if (!username) return { error: "Username tidak boleh kosong." };
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return { error: "Username hanya boleh huruf kecil, angka, titik, garis bawah/hubung (tanpa spasi)." };
  }
  if (username.length < 3) return { error: "Username minimal 3 karakter." };

  const { error } = await supabase.from("pegawai").update({ username }).eq("id", userData.user.id);

  if (error) {
    if (error.message.includes("pegawai_username_key")) {
      return { error: "Username sudah dipakai pegawai lain. Coba nama lain." };
    }
    if (error.message.includes("column") && error.message.includes("username")) {
      return { error: "Kolom username belum tersedia di database. Minta Administrator menjalankan migration 0002_add_username_to_pegawai.sql." };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
