import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const InviteSchema = z.object({
  email: z.string().email(),
  nama: z.string().min(3),
  nip: z.string().min(3),
  username: z.string().trim().toLowerCase().min(3, "Username minimal 3 karakter").regex(/^[a-z0-9._-]+$/, "Username hanya boleh huruf kecil, angka, titik, garis bawah/hubung"),
  role: z.enum(["Administrator", "KPA", "PPTK", "BPP", "Auditor", "Viewer"]),
  pangkat: z.string().optional(),
  jabatan: z.string().optional(),
});

/**
 * POST /api/pengguna/invite
 * Mengundang pengguna baru via email (Supabase Auth Admin API) sekaligus
 * membuat baris `pegawai` dengan id = auth user id agar role & RLS langsung
 * berlaku saat pengguna menyelesaikan pendaftaran dari tautan undangan.
 * Hanya Administrator yang boleh mengakses endpoint ini.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });

  const { data: aktor } = await supabase.from("pegawai").select("role").eq("id", userData.user.id).single();
  if (aktor?.role !== "Administrator") {
    return NextResponse.json({ error: "Hanya Administrator yang dapat mengundang pengguna." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors.map((e) => e.message).join(" ") }, { status: 400 });
  }
  const { email, nama, nip, username, role, pangkat, jabatan } = parsed.data;

  const admin = createServiceRoleClient();

  const { data: usernameTaken } = await admin.from("pegawai").select("id").eq("username", username).maybeSingle();
  if (usernameTaken) {
    return NextResponse.json({ error: "Username sudah dipakai pegawai lain." }, { status: 409 });
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${req.nextUrl.origin}/login`,
  });
  if (inviteError || !invited?.user) {
    return NextResponse.json({ error: inviteError?.message || "Gagal mengirim undangan." }, { status: 500 });
  }

  const { error: pegawaiError } = await admin.from("pegawai").insert({
    id: invited.user.id, // disamakan dengan auth.users.id agar RLS & middleware mengenali role
    nama, nip, username, role, pangkat, jabatan, status_aktif: true,
  });
  if (pegawaiError) {
    // Rollback: batalkan undangan bila gagal menyimpan profil pegawai, agar tidak ada auth user "yatim"
    await admin.auth.admin.deleteUser(invited.user.id);
    return NextResponse.json({ error: `Gagal menyimpan profil pegawai: ${pegawaiError.message}` }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_id: userData.user.id,
    aksi: "invite_pengguna",
    entitas: "pegawai",
    entitas_id: invited.user.id,
    detail: { email, role },
  });

  return NextResponse.json({ ok: true, userId: invited.user.id });
}
