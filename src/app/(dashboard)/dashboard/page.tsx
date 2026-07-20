import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getKonteksAnggaran } from "@/lib/konteks-anggaran";
import { rupiah } from "@/lib/format";

export const revalidate = 0; // selalu ambil data terkini

function paguSesuaiTahapan(r: any, tahapanKode?: string) {
  if (tahapanKode === "murni") return r.pagu_murni || 0;
  if (tahapanKode === "pergeseran") return r.pagu_pergeseran || 0;
  return r.pagu_perubahan || 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const konteks = await getKonteksAnggaran();
  const tahunId = konteks?.tahunId || "";

  const { data: rekeningList } = await supabase
    .from("kode_rekening")
    .select("*, program:program(nama)")
    .eq("tahun_id", tahunId);
  const { data: transaksiList } = await supabase
    .from("transaksi")
    .select("ajuan, status, rekening:kode_rekening(program:program(nama))")
    .eq("tahun_id", tahunId);

  const belumAdaData = !rekeningList || rekeningList.length === 0;

  const totalPagu = (rekeningList || []).reduce((s: number, r: any) => s + paguSesuaiTahapan(r, konteks?.tahapanKode), 0);
  const totalRealisasi = (transaksiList || []).filter((t: any) => t.status !== "ditolak").reduce((s: number, t: any) => s + t.ajuan, 0);
  const dokumenDraft = (transaksiList || []).filter((t: any) => t.status === "draft").length;
  const dokumenSelesai = (transaksiList || []).filter((t: any) => t.status === "dicairkan").length;

  const byProgram: Record<string, { pagu: number; realisasi: number }> = {};
  (rekeningList || []).forEach((r: any) => {
    const nama = r.program?.nama || "Tanpa Program";
    byProgram[nama] = byProgram[nama] || { pagu: 0, realisasi: 0 };
    byProgram[nama].pagu += paguSesuaiTahapan(r, konteks?.tahapanKode);
  });
  (transaksiList || []).forEach((t: any) => {
    const nama = t.rekening?.program?.nama || "Tanpa Program";
    byProgram[nama] = byProgram[nama] || { pagu: 0, realisasi: 0 };
    if (t.status !== "ditolak") byProgram[nama].realisasi += t.ajuan;
  });

  const cards = [
    { label: "Total Pagu", value: rupiah(totalPagu), accent: "from-batu-navy to-batu-light", icon: "💰" },
    { label: "Total Realisasi", value: rupiah(totalRealisasi), accent: "from-emerald-500 to-emerald-400", icon: "✅" },
    { label: "Sisa Anggaran", value: rupiah(totalPagu - totalRealisasi), accent: "from-amber-500 to-batu-gold", icon: "🧮" },
    { label: "Dok. Draft / Selesai", value: `${dokumenDraft} / ${dokumenSelesai}`, accent: "from-sky-500 to-batu-sky", icon: "📄" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-xl text-batu-navy">Dashboard Realisasi Anggaran</h1>
          <p className="text-sm text-slate-500">
            Tahun Anggaran {konteks?.tahun || "—"} · Tahapan {konteks?.tahapanKode === "murni" ? "Murni" : konteks?.tahapanKode === "pergeseran" ? "Pergeseran" : "Perubahan"} — data real-time dari Supabase.
          </p>
        </div>
      </div>

      {belumAdaData ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
          <div className="text-[14px] font-medium text-batu-navy mb-1">Belum ada Kode Rekening untuk Tahun Anggaran {konteks?.tahun}</div>
          <p className="text-[13px] text-slate-500 mb-4 max-w-md mx-auto">
            Dashboard akan otomatis terisi begitu ada data Kode Rekening. Cara tercepat: impor sekaligus lewat file Excel
            di halaman Data Master (kolom: Kode Rekening, Program, Kegiatan, Sub Kegiatan, Belanja, Sumber Dana, PPTK,
            Pagu Murni/Pergeseran/Perubahan).
          </p>
          <Link href="/master-data" className="inline-block text-[13px] font-medium bg-batu-navy text-white rounded-lg px-4 py-2 hover:bg-batu-navy/90">
            Buka Data Master →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {cards.map((c, i) => (
              <div key={i} className="relative bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-hidden">
                <div className={`absolute top-0 left-0 h-full w-1 bg-gradient-to-b ${c.accent}`} />
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{c.label}</div>
                  <span className={`h-7 w-7 rounded-lg bg-gradient-to-br ${c.accent} flex items-center justify-center text-[12px] shrink-0`}>{c.icon}</span>
                </div>
                <div className="text-lg font-bold mt-1.5 text-batu-navy">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="font-semibold text-sm text-batu-navy mb-3">Realisasi per Program</div>
            <div className="space-y-3">
              {Object.entries(byProgram).map(([program, v], i) => {
                const pct = v.pagu > 0 ? Math.min(100, (v.realisasi / v.pagu) * 100) : 0;
                const bars = ["from-batu-sky to-sky-400", "from-batu-forest to-emerald-400", "from-batu-gold to-amber-400", "from-violet-500 to-violet-400"];
                return (
                  <div key={program}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="font-medium text-slate-700">{program}</span>
                      <span className="text-slate-500">{rupiah(v.realisasi)} / {rupiah(v.pagu)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${bars[i % bars.length]}`} style={{ width: pct + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
