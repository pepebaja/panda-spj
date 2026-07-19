"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getKonteksAnggaran } from "@/lib/konteks-anggaran";

async function logAudit(supabase: any, aksi: string, entitas: string, entitas_id: string | null, detail: any) {
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({ actor_id: userData?.user?.id, aksi, entitas, entitas_id, detail });
}

/**
 * Guard server-side (bukan cuma UI): Program/Kegiatan/Sub Kegiatan/Kode
 * Rekening hanya boleh ditambah/diubah/dihapus saat konteks sesi berada
 * pada Tahapan 'perubahan'. Murni & Pergeseran harus mencerminkan DPA
 * resmi apa adanya. Pegawai TIDAK digerbang tahapan (data kepegawaian
 * bukan bagian dari anggaran per-tahapan).
 */
async function pastikanTahapanPerubahan(): Promise<string | null> {
  const konteks = await getKonteksAnggaran();
  if (!konteks) return "Konteks Tahun Anggaran/Tahapan tidak ditemukan. Silakan login ulang.";
  if (konteks.tahapanKode !== "perubahan") {
    return `Data anggaran (Program/Kegiatan/Sub Kegiatan/Kode Rekening) bersifat baca-saja pada Tahapan '${konteks.tahapanKode === "murni" ? "Murni" : "Pergeseran"}'. Ganti ke Tahapan 'Perubahan' lewat topbar untuk menambah/mengubah.`;
  }
  return null;
}

// ---------- Program ----------
export async function simpanProgram(formData: FormData) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const id = formData.get("id") as string | null;
  const nama = String(formData.get("nama") || "");
  const tahun_id = String(formData.get("tahun_id"));
  if (!nama.trim()) return { error: "Nama program wajib diisi." };

  const { data, error } = id
    ? await supabase.from("program").update({ nama }).eq("id", id).select("id").single()
    : await supabase.from("program").insert({ nama, tahun_id }).select("id").single();
  if (error) return { error: error.message };

  await logAudit(supabase, id ? "update" : "create", "program", data.id, { nama });
  revalidatePath("/master-data");
  return { ok: true };
}
export async function hapusProgram(id: string) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const { error } = await supabase.from("program").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, "delete", "program", id, {});
  revalidatePath("/master-data");
  return { ok: true };
}

// ---------- Kegiatan ----------
export async function simpanKegiatan(formData: FormData) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const id = formData.get("id") as string | null;
  const nama = String(formData.get("nama") || "");
  const program_id = String(formData.get("program_id"));
  if (!nama.trim()) return { error: "Nama kegiatan wajib diisi." };

  const { data, error } = id
    ? await supabase.from("kegiatan").update({ nama, program_id }).eq("id", id).select("id").single()
    : await supabase.from("kegiatan").insert({ nama, program_id }).select("id").single();
  if (error) return { error: error.message };

  await logAudit(supabase, id ? "update" : "create", "kegiatan", data.id, { nama });
  revalidatePath("/master-data");
  return { ok: true };
}
export async function hapusKegiatan(id: string) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const { error } = await supabase.from("kegiatan").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, "delete", "kegiatan", id, {});
  revalidatePath("/master-data");
  return { ok: true };
}

// ---------- Sub Kegiatan ----------
export async function simpanSubKegiatan(formData: FormData) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const id = formData.get("id") as string | null;
  const nama = String(formData.get("nama") || "");
  const kegiatan_id = String(formData.get("kegiatan_id"));
  if (!nama.trim()) return { error: "Nama sub kegiatan wajib diisi." };

  const { data, error } = id
    ? await supabase.from("sub_kegiatan").update({ nama, kegiatan_id }).eq("id", id).select("id").single()
    : await supabase.from("sub_kegiatan").insert({ nama, kegiatan_id }).select("id").single();
  if (error) return { error: error.message };

  await logAudit(supabase, id ? "update" : "create", "sub_kegiatan", data.id, { nama });
  revalidatePath("/master-data");
  return { ok: true };
}
export async function hapusSubKegiatan(id: string) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const { error } = await supabase.from("sub_kegiatan").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, "delete", "sub_kegiatan", id, {});
  revalidatePath("/master-data");
  return { ok: true };
}

// ---------- Kode Rekening ----------
const KodeRekeningSchema = z.object({
  kode: z.string().regex(/^\d(\.\d{2}){2}\.\d\.\d{2}\.\d{4}\.\d\.\d\.\d{2}\.\d{2}\.\d{3}\.\d{5}$/, "Format kode rekening tidak valid."),
  sub_kegiatan_id: z.string().uuid(),
  belanja: z.string().min(3),
  sumber_dana_id: z.string().uuid(),
  pptk_id: z.string().uuid(),
  pagu_murni: z.coerce.number().nonnegative(),
  pagu_pergeseran: z.coerce.number().nonnegative(),
  pagu_perubahan: z.coerce.number().nonnegative(),
});
export async function simpanKodeRekening(formData: FormData) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const id = formData.get("id") as string | null;
  const tahun_id = String(formData.get("tahun_id"));
  const sub = await supabase.from("sub_kegiatan").select("kegiatan_id, kegiatan:kegiatan(program_id)").eq("id", formData.get("sub_kegiatan_id")).single();
  const parsed = KodeRekeningSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors.map((e) => e.message).join(" ") };

  const payload = {
    ...parsed.data,
    tahun_id,
    kegiatan_id: sub.data?.kegiatan_id,
    program_id: (sub.data?.kegiatan as any)?.program_id,
  };

  const { data, error } = id
    ? await supabase.from("kode_rekening").update(payload).eq("id", id).select("id").single()
    : await supabase.from("kode_rekening").insert(payload).select("id").single();
  if (error) return { error: error.message };

  await logAudit(supabase, id ? "update" : "create", "kode_rekening", data.id, payload);
  revalidatePath("/master-data");
  return { ok: true };
}
export async function hapusKodeRekening(id: string) {
  const supabase = await createClient();
  const guardError = await pastikanTahapanPerubahan();
  if (guardError) return { error: guardError };
  const { error } = await supabase.from("kode_rekening").delete().eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, "delete", "kode_rekening", id, {});
  revalidatePath("/master-data");
  return { ok: true };
}

// ---------- Pegawai ----------
const PegawaiSchema = z.object({
  nama: z.string().min(3),
  nip: z.string().min(8, "NIP minimal 8 digit"),
  username: z.string().trim().toLowerCase().min(3, "Username minimal 3 karakter").regex(/^[a-z0-9._-]+$/, "Username hanya boleh huruf kecil, angka, titik, garis bawah/hubung").optional().or(z.literal("")),
  pangkat: z.string().optional(),
  jabatan: z.string().optional(),
  no_sk: z.string().optional(),
  role: z.enum(["Administrator", "KPA", "PPTK", "BPP", "Auditor", "Viewer"]),
});
export async function simpanPegawai(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string | null;
  const parsed = PegawaiSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors.map((e) => e.message).join(" ") };
  const payload = { ...parsed.data, username: parsed.data.username || null };

  const { data, error } = id
    ? await supabase.from("pegawai").update(payload).eq("id", id).select("id").single()
    : await supabase.from("pegawai").insert({ ...payload, status_aktif: true }).select("id").single();
  if (error) return { error: error.message.includes("pegawai_username_key") ? "Username sudah dipakai pegawai lain." : error.message };

  await logAudit(supabase, id ? "update" : "create", "pegawai", data.id, { nama: parsed.data.nama, role: parsed.data.role });
  revalidatePath("/master-data");
  revalidatePath("/pengguna");
  return { ok: true };
}
export async function nonaktifkanPegawai(id: string, aktif: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("pegawai").update({ status_aktif: aktif }).eq("id", id);
  if (error) return { error: error.message };
  await logAudit(supabase, aktif ? "aktifkan" : "nonaktifkan", "pegawai", id, {});
  revalidatePath("/pengguna");
  return { ok: true };
}
