import { NextRequest, NextResponse } from "next/server";
import { Packer } from "docx";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateNotaDinas } from "@/lib/documents/notaDinas";
import { generateSPTB } from "@/lib/documents/sptb";
import { generateKuitansi } from "@/lib/documents/kuitansi";
import { generateNotaDinasPdf } from "@/lib/documents/pdf/notaDinasPdf";
import { generateSPTBPdf } from "@/lib/documents/pdf/sptbPdf";
import { generateKuitansiPdf } from "@/lib/documents/pdf/kuitansiPdf";
import type { DokumenPayload } from "@/lib/types";

const JENIS_MAP: Record<string, { file: string; generateDocx: (p: DokumenPayload) => any; generatePdf: (p: DokumenPayload) => Promise<Uint8Array> }> = {
  nota_dinas: { file: "Nota-Dinas", generateDocx: generateNotaDinas, generatePdf: generateNotaDinasPdf },
  sptb: { file: "SPTB", generateDocx: generateSPTB, generatePdf: generateSPTBPdf },
  kuitansi: { file: "Kwitansi", generateDocx: generateKuitansi, generatePdf: generateKuitansiPdf },
};

/**
 * GET /api/documents/[transaksiId]/[jenis]
 * jenis ∈ nota_dinas | sptb | kuitansi
 * Mengambil satu baris transaksi (beserta relasi kode_rekening & pegawai),
 * lalu menghasilkan file .docx langsung untuk diunduh oleh pengguna.
 * Setiap pemanggilan dicatat ke audit_log.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ transaksiId: string; jenis: string }> }) {
  const { transaksiId, jenis } = await params;
  const format = (req.nextUrl.searchParams.get("format") || "docx").toLowerCase();
  const target = JENIS_MAP[jenis];
  if (!target) {
    return NextResponse.json({ error: `Jenis dokumen tidak dikenal: ${jenis}` }, { status: 400 });
  }
  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json({ error: `Format tidak dikenal: ${format}. Gunakan docx atau pdf.` }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }

  // Ambil transaksi + relasi. Query ini mengasumsikan foreign key sesuai schema.sql;
  // sesuaikan nama relasi jika Anda mengubah nama constraint di Supabase.
  const { data: row, error } = await supabase
    .from("transaksi")
    .select(`
      *,
      rincian:transaksi_rincian(*),
      rekening:kode_rekening(*),
      pptk:pegawai!transaksi_pptk_id_fkey(*),
      kpa:pegawai!transaksi_kpa_id_fkey(*),
      bpp:pegawai!transaksi_bpp_id_fkey(*)
    `)
    .eq("id", transaksiId)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  }

  const payload: DokumenPayload = {
    transaksi: row as any,
    rekening: row.rekening,
    pptk: row.pptk,
    kpa: row.kpa,
    bpp: row.bpp,
  };

  const doc = format === "docx" ? target.generateDocx(payload) : null;
  const buffer = format === "docx" ? await Packer.toBuffer(doc) : Buffer.from(await target.generatePdf(payload));

  // Audit trail + arsip metadata dokumen (service role: bypass RLS untuk log sistem)
  const admin = createServiceRoleClient();
  await admin.from("dokumen").insert({
    transaksi_id: transaksiId,
    jenis,
    nomor: jenis === "nota_dinas" ? row.nomor_nota_dinas : jenis === "kuitansi" ? row.nomor_bukti_kuitansi : null,
    format,
  });
  await admin.from("audit_log").insert({
    actor_id: userData.user.id,
    aksi: "generate_dokumen",
    entitas: "transaksi",
    entitas_id: transaksiId,
    detail: { jenis, format },
  });

  const ext = format === "docx" ? "docx" : "pdf";
  const mime = format === "docx"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";
  const filename = `${target.file}-${row.nomor_nota_dinas || transaksiId}.${ext}`;
  // PDF disajikan "inline" agar bisa langsung dilihat & dicetak di tab browser
  // (pemicu "Lihat"/"Cetak"); DOCX tetap "attachment" karena browser tidak
  // bisa merender docx secara native (pemicu "Unduh" untuk dibuka di Word).
  const disposition = format === "pdf" ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename="${filename}"`,
    },
  });
}
