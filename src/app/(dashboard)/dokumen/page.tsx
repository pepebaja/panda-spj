import { createClient } from "@/lib/supabase/server";
import { rupiah } from "@/lib/format";
import RowActions from "./row-actions";

export const revalidate = 0;

export default async function DokumenPage() {
  const supabase = await createClient();
  const { data: transaksiList } = await supabase
    .from("transaksi")
    .select("*, rekening:kode_rekening(belanja, kode)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display font-extrabold text-xl text-batu-navy">Dokumen Pencairan GU</h1>
        <p className="text-sm text-slate-500">Lihat, cetak, ubah, atau hapus Nota Dinas, SPTB, dan Kwitansi per transaksi.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-slate-500 text-[10.5px] uppercase tracking-wide">
            <tr>
              <th className="text-left p-2.5">Judul Kegiatan</th>
              <th className="text-left p-2.5">Belanja</th>
              <th className="text-right p-2.5">Ajuan</th>
              <th className="text-right p-2.5">Diterima Bersih</th>
              <th className="text-left p-2.5">Status</th>
              <th className="text-left p-2.5">Dokumen</th>
              <th className="text-right p-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(transaksiList || []).map((t: any) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-batu-mist/60">
                <td className="p-2.5 font-medium">{t.judul_acara}</td>
                <td className="p-2.5 text-slate-500">{t.rekening?.belanja}</td>
                <td className="p-2.5 text-right">{rupiah(t.ajuan)}</td>
                <td className="p-2.5 text-right text-emerald-700 font-medium">{rupiah(t.jumlah_diterima || t.ajuan)}</td>
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10.5px] capitalize">{t.status}</span>
                </td>
                <td className="p-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { jenis: "nota_dinas", label: "Nota Dinas" },
                      { jenis: "sptb", label: "SPTB" },
                      { jenis: "kuitansi", label: "Kwitansi" },
                    ].map((d) => (
                      <span key={d.jenis} className="inline-flex rounded-md overflow-hidden border border-batu-navy/20">
                        <a href={`/api/documents/${t.id}/${d.jenis}?format=docx`}
                          className="text-[11.5px] px-2 py-1 bg-batu-navy text-white hover:bg-batu-navy/90">
                          {d.label} (.docx)
                        </a>
                        <a href={`/api/documents/${t.id}/${d.jenis}?format=pdf`} target="_blank" rel="noopener noreferrer"
                          className="text-[11.5px] px-2 py-1 bg-batu-gold text-white hover:brightness-95">
                          Lihat/Cetak PDF
                        </a>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-2.5 text-right">
                  <RowActions id={t.id} status={t.status} judulAcara={t.judul_acara} />
                </td>
              </tr>
            ))}
            {(!transaksiList || transaksiList.length === 0) && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-400">Belum ada transaksi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
