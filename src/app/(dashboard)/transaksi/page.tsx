import { createClient } from "@/lib/supabase/server";
import { getKonteksAnggaran } from "@/lib/konteks-anggaran";
import TransaksiForm from "./form";

export default async function TransaksiPage() {
  const supabase = await createClient();
  const konteks = await getKonteksAnggaran();

  const { data: rekeningList } = await supabase
    .from("kode_rekening")
    .select("*, program:program(nama), kegiatan:kegiatan(nama), sub_kegiatan:sub_kegiatan(nama), sumber_dana:sumber_dana(kode), pptk:pegawai(nama)")
    .eq("tahun_id", konteks?.tahunId || "");
  const { data: tahapanList } = await supabase.from("tahapan_anggaran").select("*");
  const { data: tahunList } = await supabase.from("tahun_anggaran").select("*").order("tahun", { ascending: false });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-xl text-batu-navy">Transaksi Pencairan GU</h1>
          <p className="text-sm text-slate-500">Isi satu kali — Nota Dinas, SPTB, dan Kwitansi dibuat otomatis.</p>
        </div>
        {konteks && (
          <span className="text-[12px] px-3 py-1.5 rounded-lg bg-batu-mist border border-slate-200 text-batu-navy font-medium">
            TA {konteks.tahun} · {konteks.tahapanKode === "murni" ? "Murni" : konteks.tahapanKode === "pergeseran" ? "Pergeseran" : "Perubahan"}
          </span>
        )}
      </div>
      {!rekeningList?.length ? (
        <div className="text-[13px] text-slate-500 bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
          Belum ada Kode Rekening untuk Tahun Anggaran {konteks?.tahun}. Isi lewat Data Master, atau ganti Tahun Anggaran di pojok kanan atas.
        </div>
      ) : (
        <TransaksiForm rekeningList={rekeningList} tahapanList={tahapanList || []} tahunList={tahunList || []} konteks={konteks} />
      )}
    </div>
  );
}
