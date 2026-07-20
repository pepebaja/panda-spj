import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/import/excel
 * Body: multipart/form-data dengan field "file" (.xlsx) dan "tahun_id".
 * Format kolom yang diharapkan (header persis, urutan bebas):
 * Kode Rekening | Program | Kegiatan | Sub Kegiatan | Belanja | Sumber Dana | PPTK (nama) | Pagu Murni | Pagu Pergeseran | Pagu Perubahan
 *
 * Program/Kegiatan/Sub Kegiatan/Sumber Dana/PPTK yang belum ada di database
 * akan dibuat otomatis (upsert by nama) agar admin tidak perlu menyiapkannya
 * lebih dulu satu per satu.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });

  const { data: pegawaiAktor } = await supabase.from("pegawai").select("role").eq("id", userData.user.id).single();
  if (pegawaiAktor?.role !== "Administrator") {
    return NextResponse.json({
      error: `Hanya Administrator yang dapat mengimpor data master. (Role terdeteksi pada akun Anda: "${pegawaiAktor?.role ?? "tidak ditemukan — baris pegawai untuk akun ini mungkin belum ada"}")`,
    }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const tahun_id = String(form.get("tahun_id") || "");
  if (!file) return NextResponse.json({ error: "File Excel wajib diunggah." }, { status: 400 });
  if (!tahun_id) return NextResponse.json({ error: "Tahun anggaran wajib dipilih." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  const errors: string[] = [];
  let sukses = 0;

  for (const [i, row] of rows.entries()) {
    const baris = i + 2; // +2: header + index 1-based
    try {
      const kode = String(row["Kode Rekening"] || "").trim();
      if (!kode) { errors.push(`Baris ${baris}: Kode Rekening kosong.`); continue; }

      const programId = await upsertByName(supabase, "program", { nama: row["Program"], tahun_id });
      const kegiatanId = await upsertByName(supabase, "kegiatan", { nama: row["Kegiatan"], program_id: programId });
      const subKegiatanId = await upsertByName(supabase, "sub_kegiatan", { nama: row["Sub Kegiatan"], kegiatan_id: kegiatanId });
      const sumberDanaId = await upsertByCode(supabase, "sumber_dana", { kode: row["Sumber Dana"], nama: row["Sumber Dana"] });
      const pptkId = await upsertPegawaiPptk(supabase, row["PPTK"]);

      const payload = {
        tahun_id, kode,
        program_id: programId, kegiatan_id: kegiatanId, sub_kegiatan_id: subKegiatanId,
        belanja: row["Belanja"], sumber_dana_id: sumberDanaId, pptk_id: pptkId,
        pagu_murni: Number(row["Pagu Murni"] || 0),
        pagu_pergeseran: Number(row["Pagu Pergeseran"] || row["Pagu Murni"] || 0),
        pagu_perubahan: Number(row["Pagu Perubahan"] || row["Pagu Murni"] || 0),
      };

      const { error } = await supabase.from("kode_rekening").upsert(payload, { onConflict: "tahun_id,kode" });
      if (error) { errors.push(`Baris ${baris}: ${error.message}`); continue; }
      sukses++;
    } catch (e: any) {
      errors.push(`Baris ${baris}: ${e.message}`);
    }
  }

  await supabase.from("audit_log").insert({
    actor_id: userData.user.id,
    aksi: "import_excel",
    entitas: "kode_rekening",
    entitas_id: null,
    detail: { total_baris: rows.length, sukses, gagal: errors.length },
  });

  return NextResponse.json({ total: rows.length, sukses, gagal: errors.length, errors: errors.slice(0, 20) });
}

async function upsertByName(supabase: any, table: string, payload: Record<string, any>) {
  if (!payload.nama) return null;
  const filter: Record<string, any> = { nama: payload.nama };
  if (payload.tahun_id) filter.tahun_id = payload.tahun_id;
  if (payload.program_id) filter.program_id = payload.program_id;
  if (payload.kegiatan_id) filter.kegiatan_id = payload.kegiatan_id;

  const { data: existing } = await supabase.from(table).select("id").match(filter).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error) throw new Error(`gagal membuat ${table}: ${error.message}`);
  return created.id;
}

async function upsertByCode(supabase: any, table: string, payload: { kode: string; nama: string }) {
  if (!payload.kode) return null;
  const { data: existing } = await supabase.from(table).select("id").eq("kode", payload.kode).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error) throw new Error(`gagal membuat ${table}: ${error.message}`);
  return created.id;
}

async function upsertPegawaiPptk(supabase: any, nama: string) {
  if (!nama) return null;
  const { data: existing } = await supabase.from("pegawai").select("id").eq("nama", nama).maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("pegawai")
    .insert({ nama, nip: "-", role: "PPTK", status_aktif: true })
    .select("id")
    .single();
  if (error) throw new Error(`gagal membuat pegawai PPTK: ${error.message}`);
  return created.id;
}
