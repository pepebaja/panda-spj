import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/export/excel?jenis=rekening|transaksi
 * Mengekspor data master rekening atau rekap transaksi ke file .xlsx
 * yang siap dibuka di Excel/Google Sheets untuk pelaporan manual.
 */
export async function GET(req: NextRequest) {
  const jenis = req.nextUrl.searchParams.get("jenis") || "rekening";
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ error: "Anda harus login." }, { status: 401 });

  let rows: Record<string, any>[] = [];
  let sheetName = "Data";

  if (jenis === "rekening") {
    const { data } = await supabase
      .from("kode_rekening")
      .select("kode, belanja, pagu_murni, pagu_pergeseran, pagu_perubahan, program:program(nama), kegiatan:kegiatan(nama), sub_kegiatan:sub_kegiatan(nama), sumber_dana:sumber_dana(kode), pptk:pegawai(nama)");
    sheetName = "Kode Rekening";
    rows = (data || []).map((r: any) => ({
      "Kode Rekening": r.kode,
      "Program": r.program?.nama,
      "Kegiatan": r.kegiatan?.nama,
      "Sub Kegiatan": r.sub_kegiatan?.nama,
      "Belanja": r.belanja,
      "Sumber Dana": r.sumber_dana?.kode,
      "PPTK": r.pptk?.nama,
      "Pagu Murni": r.pagu_murni,
      "Pagu Pergeseran": r.pagu_pergeseran,
      "Pagu Perubahan": r.pagu_perubahan,
    }));
  } else {
    const { data } = await supabase
      .from("transaksi")
      .select("judul_acara, tanggal_acara, ajuan, status, nomor_nota_dinas, jenis_pengadaan, pajak_daerah, ppn, pph22, pph23, pph_perorangan, pph_final_4ayat2, pph21_final, jumlah_potongan, jumlah_diterima, rekening:kode_rekening(kode, belanja)")
      .order("tanggal_acara", { ascending: false });
    sheetName = "Rekap Transaksi";
    rows = (data || []).map((t: any) => ({
      "Nomor Nota Dinas": t.nomor_nota_dinas,
      "Tanggal": t.tanggal_acara,
      "Judul Kegiatan": t.judul_acara,
      "Kode Rekening": t.rekening?.kode,
      "Belanja": t.rekening?.belanja,
      "Jenis Pengadaan": t.jenis_pengadaan,
      "Ajuan (Rp)": t.ajuan,
      "Pajak Daerah (Rp)": t.pajak_daerah,
      "PPN (Rp)": t.ppn,
      "PPh 22 (Rp)": t.pph22,
      "PPh 23 (Rp)": t.pph23,
      "PPh Perorangan (Rp)": t.pph_perorangan,
      "PPh Final 4(2) (Rp)": t.pph_final_4ayat2,
      "PPh 21 Final (Rp)": t.pph21_final,
      "Jumlah Potongan (Rp)": t.jumlah_potongan,
      "Jumlah Diterima (Rp)": t.jumlah_diterima,
      "Status": t.status,
    }));
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${sheetName.replace(/\s/g, "-")}.xlsx"`,
    },
  });
}
