import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getKonteksAnggaran } from "@/lib/konteks-anggaran";
import TransaksiForm from "../../form";

export default async function EditTransaksiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const konteks = await getKonteksAnggaran();

  const { data: tx } = await supabase
    .from("transaksi")
    .select("*, rincian:transaksi_rincian(*)")
    .eq("id", id)
    .single();

  if (!tx) notFound();
  if (tx.status !== "draft") {
    return (
      <div className="max-w-lg mx-auto mt-10 text-center bg-white border border-dashed border-slate-200 rounded-xl p-8">
        <div className="text-[14px] font-medium text-batu-navy mb-1">Transaksi tidak dapat diedit</div>
        <p className="text-[13px] text-slate-500">
          Transaksi ini berstatus <span className="font-semibold">{tx.status}</span>. Hanya transaksi berstatus
          <span className="font-semibold"> draft</span> yang dapat diubah.
        </p>
      </div>
    );
  }

  const { data: rekeningList } = await supabase
    .from("kode_rekening")
    .select("*, program:program(nama), kegiatan:kegiatan(nama), sub_kegiatan:sub_kegiatan(nama), sumber_dana:sumber_dana(kode), pptk:pegawai(nama)")
    .eq("tahun_id", tx.tahun_id);
  const { data: tahapanList } = await supabase.from("tahapan_anggaran").select("*");
  const { data: tahunList } = await supabase.from("tahun_anggaran").select("*").order("tahun", { ascending: false });

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display font-extrabold text-xl text-batu-navy">Ubah Transaksi</h1>
        <p className="text-sm text-slate-500">{tx.judul_acara} — {tx.nomor_nota_dinas}</p>
      </div>
      <TransaksiForm
        rekeningList={rekeningList || []}
        tahapanList={tahapanList || []}
        tahunList={tahunList || []}
        konteks={konteks}
        editing={{
          id: tx.id,
          kode_rekening_id: tx.kode_rekening_id,
          tahapan_anggaran_id: tx.tahapan_anggaran_id,
          judul_acara: tx.judul_acara,
          tanggal_acara: tx.tanggal_acara,
          no_sk_kpa: tx.no_sk_kpa || "",
          rincian: tx.rincian || [],
          jenis_pengadaan: tx.jenis_pengadaan,
          status_pkp: tx.status_pkp,
          status_npwp: tx.status_npwp,
          jenis_penyedia: tx.jenis_penyedia,
          kualifikasi_konstruksi: tx.kualifikasi_konstruksi,
          golongan_honorarium: tx.golongan_honorarium,
          metode_pengadaan: tx.metode_pengadaan,
          harga_termasuk_pajak: tx.harga_termasuk_pajak,
          kena_pajak_daerah: tx.kena_pajak_daerah,
        }}
      />
    </div>
  );
}
