import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const TautkanSchema = z.object({
  email: z.string().email(),
  nama: z.string().min(3),
  nip: z.string().min(3),
  username: z.string().trim().toLowerCase().min(3).regex(/^[a-z0-9._-]+$/),
  role: z.enum(["Administrator", "KPA", "PPTK", "BPP", "Auditor", "Viewer"]),
  pangkat: z.string().optional(),
  jabatan: z.string().optional(),
});

/**
 * POST /api/pengguna/tautkan
 * Untuk akun yang SUDAH ADA di Supabase Authentication (dibuat manual lewat
 * Dashboard, bukan lewat undangan aplikasi ini) tapi belum punya baris
 * `pegawai` yang tertaut. Mencari user berdasarkan email via
 * auth.admin.listUsers(), lalu membuat/memperbarui baris `pegawai` dengan
 * id yang sama. Hanya Administrator yang boleh mengakses endpoint ini.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });

  const { data: aktor } = await supabase.from("pegawai").select("role").eq("id", userData.user.id).single();
  if (aktor?.role !== "Administrator") {
    return NextResponse.json({ error: "Hanya Administrator yang dapat menautkan akun." }, { status: 403 });
  }

  const parsed = TautkanSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(" ") }, { status: 400 });
  }
  const { email, nama, nip, username, role, pangkat, jabatan } = parsed.data;

  const admin = createServiceRoleClient();

  const { data: usernameTaken } = await admin.from("pegawai").select("id").eq("username", username).maybeSingle();
  if (usernameTaken) return NextResponse.json({ error: "Username sudah dipakai pegawai lain." }, { status: 409 });

  // Supabase JS admin API tidak punya getUserByEmail langsung — cari lewat
  // listUsers dan filter di sisi server (aman untuk basis pengguna kecil
  // seperti instansi pemerintah; untuk >>1000 pengguna pertimbangkan paginasi).
  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    return NextResponse.json({ error: `Gagal mengambil daftar akun: ${listError.message}` }, { status: 500 });
  }
  const found = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) {
    return NextResponse.json({ error: "Tidak ditemukan akun dengan email tersebut di Supabase Authentication. Buat akunnya dulu di sana, atau gunakan 'Undang Pengguna Baru'." }, { status: 404 });
  }

  const { error: pegawaiError } = await admin.from("pegawai").upsert({
    id: found.id,
    nama, nip, username, role, pangkat, jabatan, status_aktif: true,
  });
  if (pegawaiError) {
    return NextResponse.json({ error: pegawaiError.message }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_id: userData.user.id, aksi: "tautkan_akun", entitas: "pegawai", entitas_id: found.id, detail: { email, username },
  });

  return NextResponse.json({ ok: true, userId: found.id });
}
