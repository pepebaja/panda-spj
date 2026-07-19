import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// Urutan insert mengikuti dependensi foreign key agar tidak melanggar constraint.
const URUTAN_RESTORE = [
  "tahun_anggaran", "tahapan_anggaran", "sumber_dana", "pegawai",
  "program", "kegiatan", "sub_kegiatan", "kode_rekening",
  "transaksi", "transaksi_rincian", "dokumen",
];

/**
 * POST /api/restore
 * Body: multipart/form-data field "file" berisi JSON hasil /api/backup.
 * PERINGATAN: melakukan upsert (by id) — tidak menghapus data yang sudah ada
 * tapi tidak termasuk dalam file backup. Hanya untuk Administrator.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });

  const { data: pegawaiAktor } = await supabase.from("pegawai").select("role").eq("id", userData.user.id).single();
  if (pegawaiAktor?.role !== "Administrator") {
    return NextResponse.json({ error: "Hanya Administrator yang dapat memulihkan backup." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File backup wajib diunggah." }, { status: 400 });

  let parsed: { data: Record<string, any[]> };
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return NextResponse.json({ error: "File bukan JSON backup yang valid." }, { status: 400 });
  }

  const admin = createServiceRoleClient(); // bypass RLS untuk operasi pemulihan massal
  const ringkasan: Record<string, number> = {};

  for (const tabel of URUTAN_RESTORE) {
    const rows = parsed.data[tabel];
    if (!rows || rows.length === 0) continue;
    const { error } = await admin.from(tabel).upsert(rows, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ error: `Gagal memulihkan tabel ${tabel}: ${error.message}`, ringkasanSebelumGagal: ringkasan }, { status: 500 });
    }
    ringkasan[tabel] = rows.length;
  }

  await supabase.from("audit_log").insert({
    actor_id: userData.user.id, aksi: "restore", entitas: "database", entitas_id: null, detail: ringkasan,
  });

  return NextResponse.json({ ok: true, ringkasan });
}
