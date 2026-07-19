import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABEL_BACKUP = [
  "tahun_anggaran", "tahapan_anggaran", "program", "kegiatan", "sub_kegiatan",
  "sumber_dana", "pegawai", "kode_rekening", "transaksi", "transaksi_rincian", "dokumen",
];

/**
 * GET /api/backup
 * Mengekspor seluruh tabel penting sebagai satu file JSON terstruktur.
 * Gunakan /api/restore untuk memulihkan (Administrator only).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });

  const { data: pegawaiAktor } = await supabase.from("pegawai").select("role").eq("id", userData.user.id).single();
  if (pegawaiAktor?.role !== "Administrator") {
    return NextResponse.json({ error: "Hanya Administrator yang dapat membuat backup." }, { status: 403 });
  }

  const backup: Record<string, any[]> = {};
  for (const tabel of TABEL_BACKUP) {
    const { data } = await supabase.from(tabel).select("*");
    backup[tabel] = data || [];
  }

  await supabase.from("audit_log").insert({
    actor_id: userData.user.id, aksi: "backup", entitas: "database", entitas_id: null,
    detail: { tabel: TABEL_BACKUP, timestamp: new Date().toISOString() },
  });

  const filename = `backup-panda-spj-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify({ createdAt: new Date().toISOString(), data: backup }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
