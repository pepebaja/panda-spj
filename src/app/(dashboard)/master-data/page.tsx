import { createClient } from "@/lib/supabase/server";
import { getKonteksAnggaran } from "@/lib/konteks-anggaran";
import MasterDataTabs from "./tabs";
import ImportExportPanel from "./import-export-panel";

export const revalidate = 0;

export default async function MasterDataPage() {
  const supabase = await createClient();
  const konteks = await getKonteksAnggaran();
  const tahunId = konteks?.tahunId || "";

  const [{ data: tahunList }, { data: programList }, { data: kegiatanList }, { data: subKegiatanList },
         { data: rekeningList }, { data: pegawaiList }, { data: sumberDanaList }] = await Promise.all([
    supabase.from("tahun_anggaran").select("*").order("tahun", { ascending: false }),
    supabase.from("program").select("*").eq("tahun_id", tahunId),
    supabase.from("kegiatan").select("*, program:program(nama)"),
    supabase.from("sub_kegiatan").select("*, kegiatan:kegiatan(nama)"),
    supabase.from("kode_rekening").select("*, sub_kegiatan:sub_kegiatan(nama), sumber_dana:sumber_dana(kode), pptk:pegawai(nama)").eq("tahun_id", tahunId),
    supabase.from("pegawai").select("*"),
    supabase.from("sumber_dana").select("*"),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-xl text-batu-navy">Data Master</h1>
          <p className="text-sm text-slate-500">Sumber tunggal data anggaran &amp; kepegawaian untuk Tahun Anggaran {konteks?.tahun}.</p>
        </div>
      </div>

      {konteks?.tahapanKode === "perubahan" ? (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-[12.5px] text-emerald-800">
          <div className="font-semibold mb-1">✏️ Mode Perubahan aktif — Anda bisa menambah/mengubah anggaran.</div>
          <div className="leading-relaxed">
            Urutan mengisi anggaran/belanja baru: <b>1) Program</b> (pilih yang sudah ada, atau tambah baru) →{" "}
            <b>2) Kegiatan</b> (di bawah Program tsb) → <b>3) Sub Kegiatan</b> (di bawah Kegiatan tsb) →{" "}
            <b>4) Kode Rekening</b> (isi Belanja, Sumber Dana, Anggaran/pagu, dan PPTK sekaligus di tab terakhir ini).
            Kode Rekening baru otomatis dianggap sebagai penambahan pada tahap Perubahan (Pagu Murni &amp; Pergeseran = 0).
          </div>
        </div>
      ) : (
        <div className="mb-4 bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-[12.5px] text-slate-600">
          🔒 Tahapan aktif saat ini adalah <b>{konteks?.tahapanKode === "murni" ? "Murni" : "Pergeseran"}</b> — Program,
          Kegiatan, Sub Kegiatan, dan Kode Rekening bersifat baca-saja (sesuai dokumen DPA resmi) dan tidak bisa
          ditambah/diubah/dihapus dari sini. Untuk menambah anggaran atau kode rekening baru, ganti Tahapan ke{" "}
          <b>Perubahan</b> lewat badge di pojok kanan atas.
        </div>
      )}

      <ImportExportPanel tahunAktifId={tahunId} />
      <MasterDataTabs
        tahunList={tahunList || []}
        programList={programList || []}
        kegiatanList={kegiatanList || []}
        subKegiatanList={subKegiatanList || []}
        rekeningList={rekeningList || []}
        pegawaiList={pegawaiList || []}
        sumberDanaList={sumberDanaList || []}
        tahunId={tahunId}
        bisaUbah={konteks?.tahapanKode === "perubahan"}
      />
    </div>
  );
}
