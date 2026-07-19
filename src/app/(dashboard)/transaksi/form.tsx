"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { buatTransaksi, updateTransaksi, type TransaksiFormState } from "./actions";
import { rupiah } from "@/lib/format";
import { hitungPajak, JENIS_PENGADAAN_OPTIONS, type JenisPengadaan } from "@/lib/pajak";

type Rincian = { id: string; uraian: string; volume: number; satuan: string; harga_satuan: number };
const emptyRincian = (): Rincian => ({ id: crypto.randomUUID(), uraian: "", volume: 1, satuan: "Kali", harga_satuan: 0 });

const butuhKualifikasiKonstruksi = (j: JenisPengadaan) => j === "jasa_konstruksi_pelaksanaan" || j === "jasa_konstruksi_konsultansi";
const butuhGolonganHonorarium = (j: JenisPengadaan) => j === "honorarium_pns";
const bukanObjekPphBadan = (j: JenisPengadaan) => j === "jasa_lainnya" || j === "jasa_konsultansi";

export interface TransaksiAwal {
  id: string;
  kode_rekening_id: string;
  tahapan_anggaran_id: string;
  judul_acara: string;
  tanggal_acara: string;
  no_sk_kpa: string;
  rincian: Rincian[];
  jenis_pengadaan: JenisPengadaan;
  status_pkp: boolean;
  status_npwp: boolean;
  jenis_penyedia: "badan_usaha" | "perorangan";
  kualifikasi_konstruksi: string | null;
  golongan_honorarium: string | null;
  metode_pengadaan: "manual" | "e_katalog";
  harga_termasuk_pajak: boolean;
  kena_pajak_daerah: boolean;
}

export default function TransaksiForm({
  rekeningList, tahapanList, tahunList, konteks, editing,
}: {
  rekeningList: any[]; tahapanList: any[]; tahunList: any[]; konteks?: { tahunId: string; tahapanId: string } | null;
  editing?: TransaksiAwal;
}) {
  const router = useRouter();
  const isEdit = !!editing;
  const action = isEdit ? updateTransaksi.bind(null, editing!.id) : buatTransaksi;
  const [state, formAction, pending] = useActionState<TransaksiFormState, FormData>(action as any, { ok: false });

  const [rekeningId, setRekeningId] = useState(editing?.kode_rekening_id || rekeningList[0]?.id || "");
  const [tahapanId, setTahapanId] = useState(editing?.tahapan_anggaran_id || konteks?.tahapanId || tahapanList[0]?.id || "");
  const [judulAcara, setJudulAcara] = useState(editing?.judul_acara || "");
  const [tanggalAcara, setTanggalAcara] = useState(editing?.tanggal_acara || "");
  const [noSkKpa, setNoSkKpa] = useState(editing?.no_sk_kpa || "");
  const [rincian, setRincian] = useState<Rincian[]>(editing?.rincian?.length ? editing.rincian : [emptyRincian()]);

  const [jenisPengadaan, setJenisPengadaan] = useState<JenisPengadaan>(editing?.jenis_pengadaan || "barang");
  const [statusPkp, setStatusPkp] = useState(editing?.status_pkp ?? true);
  const [statusNpwp, setStatusNpwp] = useState(editing?.status_npwp ?? true);
  const [jenisPenyedia, setJenisPenyedia] = useState<"badan_usaha" | "perorangan">(editing?.jenis_penyedia || "badan_usaha");
  const [kualifikasiKonstruksi, setKualifikasiKonstruksi] = useState(editing?.kualifikasi_konstruksi || "kecil_bersertifikat");
  const [golonganHonorarium, setGolonganHonorarium] = useState(editing?.golongan_honorarium || "III");
  const [metodePengadaan, setMetodePengadaan] = useState<"manual" | "e_katalog">(editing?.metode_pengadaan || "manual");
  const [hargaTermasukPajak, setHargaTermasukPajak] = useState(editing?.harga_termasuk_pajak ?? false);
  const [kenaPajakDaerah, setKenaPajakDaerah] = useState(editing?.kena_pajak_daerah ?? false);

  const rekening = rekeningList.find((r) => r.id === rekeningId);
  const tahapanKode = tahapanList.find((t) => t.id === tahapanId)?.kode || "murni";
  const pagu = rekening
    ? tahapanKode === "murni" ? rekening.pagu_murni : tahapanKode === "pergeseran" ? rekening.pagu_pergeseran : rekening.pagu_perubahan
    : 0;
  const ajuan = useMemo(() => rincian.reduce((s, it) => s + Number(it.volume || 0) * Number(it.harga_satuan || 0), 0), [rincian]);
  const sisaPagu = pagu - ajuan;
  const melebihiPagu = sisaPagu < 0;

  const pajak = useMemo(() => {
    if (ajuan <= 0) return null;
    return hitungPajak({
      jenisPengadaan, nilaiTagihan: ajuan, hargaTermasukPajak, statusPkp, statusNpwp, jenisPenyedia,
      kualifikasiKonstruksi: kualifikasiKonstruksi as any, golonganHonorarium: golonganHonorarium as any, metodePengadaan,
      kenaPajakDaerah,
    });
  }, [jenisPengadaan, ajuan, hargaTermasukPajak, statusPkp, statusNpwp, jenisPenyedia, kualifikasiKonstruksi, golonganHonorarium, metodePengadaan, kenaPajakDaerah]);

  const clientErrors: string[] = [];
  if (!judulAcara.trim()) clientErrors.push("Judul kegiatan wajib diisi.");
  if (!tanggalAcara) clientErrors.push("Tanggal kegiatan wajib diisi.");
  if (ajuan <= 0) clientErrors.push("Rincian belanja belum diisi.");
  if (melebihiPagu) clientErrors.push(`Ajuan melebihi sisa pagu sebesar ${rupiah(-sisaPagu)}.`);

  if (state.ok && (state as any).transaksiId) {
    router.push(`/dokumen?tx=${(state as any).transaksiId}`);
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-5 gap-5"
      onSubmit={(e) => {
        if (clientErrors.length) e.preventDefault();
      }}
    >
      <input type="hidden" name="kode_rekening_id" value={rekeningId} />
      <input type="hidden" name="tahapan_anggaran_id" value={tahapanId} />
      <input type="hidden" name="tahun_id" value={konteks?.tahunId || tahunList[0]?.id || ""} />
      <input type="hidden" name="rincian" value={JSON.stringify(rincian.map(({ id, ...r }) => r))} />
      <input type="hidden" name="jenis_pengadaan" value={jenisPengadaan} />
      <input type="hidden" name="status_pkp" value={String(statusPkp)} />
      <input type="hidden" name="status_npwp" value={String(statusNpwp)} />
      <input type="hidden" name="jenis_penyedia" value={jenisPenyedia} />
      <input type="hidden" name="kualifikasi_konstruksi" value={butuhKualifikasiKonstruksi(jenisPengadaan) ? kualifikasiKonstruksi : ""} />
      <input type="hidden" name="golongan_honorarium" value={butuhGolonganHonorarium(jenisPengadaan) ? golonganHonorarium : ""} />
      <input type="hidden" name="metode_pengadaan" value={metodePengadaan} />
      <input type="hidden" name="harga_termasuk_pajak" value={String(hargaTermasukPajak)} />
      <input type="hidden" name="kena_pajak_daerah" value={String(kenaPajakDaerah)} />

      <div className="col-span-3 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-500">Kode Rekening / Kegiatan</label>
            <select className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={rekeningId} onChange={(e) => setRekeningId(e.target.value)}>
              {rekeningList.map((r) => (
                <option key={r.id} value={r.id}>{r.belanja} — {r.sub_kegiatan?.nama}</option>
              ))}
            </select>
          </div>

          {rekening && (
            <div className="grid grid-cols-3 gap-3 text-[11.5px] bg-batu-mist rounded p-3 border border-slate-100">
              <div><span className="text-slate-400 block">Program</span>{rekening.program?.nama}</div>
              <div><span className="text-slate-400 block">Kegiatan</span>{rekening.kegiatan?.nama}</div>
              <div><span className="text-slate-400 block">Sub Kegiatan</span>{rekening.sub_kegiatan?.nama}</div>
              <div><span className="text-slate-400 block">Sumber Dana</span>{rekening.sumber_dana?.kode}</div>
              <div><span className="text-slate-400 block">PPTK</span>{rekening.pptk?.nama}</div>
              <div><span className="text-slate-400 block">Pagu</span>{rupiah(pagu)}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500">Tahapan Anggaran</label>
              <select className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={tahapanId} onChange={(e) => setTahapanId(e.target.value)}>
                {tahapanList.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="judul_acara" className="text-[11px] font-medium text-slate-500">Judul Kegiatan / Acara</label>
              <input id="judul_acara" className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={judulAcara} onChange={(e) => setJudulAcara(e.target.value)} />
            </div>
            <div>
              <label htmlFor="tanggal_acara" className="text-[11px] font-medium text-slate-500">Tanggal Kegiatan</label>
              <input id="tanggal_acara" type="date" className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={tanggalAcara} onChange={(e) => setTanggalAcara(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Nomor SK KPA</label>
              <input className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={noSkKpa} onChange={(e) => setNoSkKpa(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm text-batu-navy">Rincian Barang / Jasa</div>
            <button type="button" onClick={() => setRincian((r) => [...r, emptyRincian()])} className="text-[12px] text-batu-gold font-medium hover:underline">
              + Tambah baris
            </button>
          </div>
          <div className="space-y-2">
            {rincian.map((it) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                <input className="col-span-5 border rounded px-2 py-1.5 text-[13px]" placeholder="Uraian barang/jasa" value={it.uraian}
                  onChange={(e) => setRincian((r) => r.map((x) => (x.id === it.id ? { ...x, uraian: e.target.value } : x)))} />
                <input type="number" className="col-span-2 border rounded px-2 py-1.5 text-[13px]" placeholder="Vol" value={it.volume}
                  onChange={(e) => setRincian((r) => r.map((x) => (x.id === it.id ? { ...x, volume: Number(e.target.value) } : x)))} />
                <input className="col-span-2 border rounded px-2 py-1.5 text-[13px]" placeholder="Satuan" value={it.satuan}
                  onChange={(e) => setRincian((r) => r.map((x) => (x.id === it.id ? { ...x, satuan: e.target.value } : x)))} />
                <input type="number" className="col-span-2 border rounded px-2 py-1.5 text-[13px]" placeholder="Harga satuan" value={it.harga_satuan}
                  onChange={(e) => setRincian((r) => r.map((x) => (x.id === it.id ? { ...x, harga_satuan: Number(e.target.value) } : x)))} />
                <button type="button" onClick={() => setRincian((r) => r.filter((x) => x.id !== it.id))} className="col-span-1 text-rose-500 hover:text-rose-700">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="font-semibold text-sm text-batu-navy">Klasifikasi Pajak Rekanan</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-slate-500">Jenis Pengadaan</label>
              <select className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={jenisPengadaan} onChange={(e) => setJenisPengadaan(e.target.value as JenisPengadaan)}>
                {JENIS_PENGADAAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500">Jenis Penyedia</label>
              <select className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={jenisPenyedia} onChange={(e) => setJenisPenyedia(e.target.value as any)}>
                <option value="badan_usaha">Badan Usaha (PT/CV/Koperasi)</option>
                <option value="perorangan">Perorangan</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500">Metode Pengadaan</label>
              <select className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={metodePengadaan} onChange={(e) => setMetodePengadaan(e.target.value as any)}>
                <option value="manual">Manual / Penunjukan Langsung</option>
                <option value="e_katalog">E-Katalog (INAPROC LKPP)</option>
              </select>
            </div>

            {butuhKualifikasiKonstruksi(jenisPengadaan) && (
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-slate-500">Kualifikasi Penyedia Jasa Konstruksi</label>
                <select className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={kualifikasiKonstruksi} onChange={(e) => setKualifikasiKonstruksi(e.target.value)}>
                  <option value="kecil_bersertifikat">Kecil / Perorangan Bersertifikat</option>
                  <option value="menengah_besar_bersertifikat">Menengah / Besar Bersertifikat</option>
                  <option value="tanpa_sertifikat">Tanpa Sertifikat Badan Usaha</option>
                </select>
              </div>
            )}
            {butuhGolonganHonorarium(jenisPengadaan) && (
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-slate-500">Golongan Penerima Honorarium (ASN)</label>
                <select className="w-full border rounded px-2 py-2 text-sm mt-0.5" value={golonganHonorarium} onChange={(e) => setGolonganHonorarium(e.target.value)}>
                  <option value="I_II">Golongan I/II (0%)</option>
                  <option value="III">Golongan III (5%)</option>
                  <option value="IV">Golongan IV (15%)</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 text-[12.5px] text-slate-600">
              <input type="checkbox" checked={statusPkp} onChange={(e) => setStatusPkp(e.target.checked)} className="rounded" />
              Rekanan PKP (Pengusaha Kena Pajak)
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-slate-600">
              <input type="checkbox" checked={statusNpwp} onChange={(e) => setStatusNpwp(e.target.checked)} className="rounded" />
              Rekanan memiliki NPWP
            </label>
            <label className="col-span-2 flex items-center gap-2 text-[12.5px] text-slate-600">
              <input type="checkbox" checked={hargaTermasukPajak} onChange={(e) => setHargaTermasukPajak(e.target.checked)} className="rounded" />
              Nilai rincian di atas SUDAH termasuk PPN
            </label>
            <label className="col-span-2 flex items-center gap-2 text-[12.5px] text-slate-600">
              <input type="checkbox" checked={kenaPajakDaerah} onChange={(e) => setKenaPajakDaerah(e.target.checked)} className="rounded" />
              Kena Pajak Daerah 10% (Restoran/Rumah Makan/Hotel) — PPN otomatis tidak dipungut
            </label>
          </div>

          {bukanObjekPphBadan(jenisPengadaan) && jenisPenyedia === "perorangan" && (
            <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ Jasa dari rekanan perorangan umumnya objek PPh 21 (bukan pegawai), bukan PPh 23. Pertimbangkan pilih jenis
              &ldquo;Honorarium Non-ASN&rdquo; bila sesuai, atau konsultasikan ke Bendahara/KPP sebelum menyimpan.
            </div>
          )}
        </div>

        {(clientErrors.length > 0 || state.errors?.length) && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-[12.5px] space-y-1">
            {[...clientErrors, ...(state.errors || [])].map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}

        <button disabled={pending || clientErrors.length > 0} type="submit"
          className={`w-full py-2.5 rounded-lg font-semibold text-sm ${pending || clientErrors.length ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-batu-navy to-batu-forest text-white hover:brightness-110"}`}>
          {pending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan & Buat 3 Dokumen"}
        </button>
      </div>

      <div className="col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sticky top-4">
          <div className="font-semibold text-sm text-batu-navy mb-3">Ringkasan Validasi Pagu</div>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex justify-between"><span className="text-slate-500">Pagu</span><span>{rupiah(pagu)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ajuan sekarang</span><span className="font-semibold">{rupiah(ajuan)}</span></div>
            <div className="h-px bg-slate-100 my-1" />
            <div className="flex justify-between"><span className="text-slate-500">Sisa pagu</span><span className={`font-bold ${melebihiPagu ? "text-rose-600" : "text-emerald-600"}`}>{rupiah(sisaPagu)}</span></div>
          </div>
        </div>

        {pajak && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="font-semibold text-sm text-batu-navy mb-3">Estimasi Potongan Pajak</div>
            <div className="space-y-1.5 text-[12.5px]">
              <div className="flex justify-between"><span className="text-slate-500">DPP</span><span>{rupiah(pajak.dpp)}</span></div>
              {pajak.pajakDaerah > 0 && <div className="flex justify-between"><span className="text-slate-500">Pajak Daerah (10%)</span><span>{rupiah(pajak.pajakDaerah)}</span></div>}
              {pajak.ppn > 0 && <div className="flex justify-between"><span className="text-slate-500">PPN (11%)</span><span>{rupiah(pajak.ppn)}</span></div>}
              {pajak.pph22 > 0 && <div className="flex justify-between"><span className="text-slate-500">PPh 22</span><span>{rupiah(pajak.pph22)}</span></div>}
              {pajak.pph23 > 0 && <div className="flex justify-between"><span className="text-slate-500">PPh 23</span><span>{rupiah(pajak.pph23)}</span></div>}
              {pajak.pphPerorangan > 0 && <div className="flex justify-between"><span className="text-slate-500">PPh Perorangan</span><span>{rupiah(pajak.pphPerorangan)}</span></div>}
              {pajak.pphFinal4Ayat2 > 0 && <div className="flex justify-between"><span className="text-slate-500">{pajak.labelPphFinal}</span><span>{rupiah(pajak.pphFinal4Ayat2)}</span></div>}
              {pajak.pph21Final > 0 && <div className="flex justify-between"><span className="text-slate-500">{pajak.labelPphFinal}</span><span>{rupiah(pajak.pph21Final)}</span></div>}
              <div className="h-px bg-slate-100 my-1" />
              <div className="flex justify-between font-semibold"><span>Jumlah Potongan</span><span className="text-rose-600">{rupiah(pajak.jumlahPotongan)}</span></div>
              <div className="flex justify-between font-bold text-[13.5px]"><span>Jumlah Diterima</span><span className="text-emerald-600">{rupiah(pajak.jumlahDiterima)}</span></div>
            </div>
            {pajak.catatan.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                {pajak.catatan.map((c, i) => (
                  <div key={i} className="text-[11px] text-slate-400 leading-snug">ℹ️ {c}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
