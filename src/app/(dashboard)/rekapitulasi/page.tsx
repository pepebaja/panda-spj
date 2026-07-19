import { createClient } from "@/lib/supabase/server";
import RekapCharts from "./charts";

export const revalidate = 0;

export default async function RekapitulasiPage() {
  const supabase = await createClient();
  const { data: transaksiList } = await supabase
    .from("transaksi")
    .select("ajuan, tanggal_acara, status, rekening:kode_rekening(program:program(nama), sumber_dana:sumber_dana(kode)), pptk:pegawai!transaksi_pptk_id_fkey(nama)")
    .order("tanggal_acara", { ascending: true });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0F2A43]">Rekapitulasi Realisasi</h1>
        <p className="text-sm text-slate-500">Ringkasan harian, bulanan, triwulanan, dan tahunan — per program, sumber dana, dan PPTK.</p>
      </div>
      <RekapCharts data={transaksiList || []} />
    </div>
  );
}
