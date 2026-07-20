"use client";

import { useRef, useState } from "react";

export default function ImportExportPanel({ tahunAktifId }: { tahunAktifId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErrorMsg("Pilih file .xlsx terlebih dahulu (klik \"Choose File\").");
      return;
    }
    if (!tahunAktifId) {
      setErrorMsg(
        "Tahun Anggaran aktif tidak terdeteksi. Pastikan Anda memilih Tahun Anggaran saat login, " +
        "atau ganti lewat badge \"TA ...\" di pojok kanan atas, lalu coba impor lagi."
      );
      return;
    }

    setBusy(true);
    setHasil(null);
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tahun_id", tahunAktifId);
      const res = await fetch("/api/import/excel", { method: "POST", body: fd });

      let json: any;
      try {
        json = await res.json();
      } catch {
        setErrorMsg(`Server mengembalikan respons tidak terduga (status ${res.status}). Coba lagi, atau cek Vercel Function Logs.`);
        return;
      }

      if (!res.ok) {
        // Server SELALU mengirim field `error` untuk respons gagal (lihat
        // api/import/excel/route.ts) — tampilkan apa adanya, jangan dibiarkan
        // kosong seperti sebelumnya.
        setErrorMsg(json.error || `Impor gagal (status ${res.status}), tanpa pesan detail dari server.`);
        return;
      }

      setHasil(json);
    } catch (e: any) {
      setErrorMsg(`Gagal menghubungi server: ${e?.message || "tidak diketahui"}. Cek koneksi internet Anda.`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
      <div className="font-semibold text-sm text-batu-navy mb-2">Import / Export Excel</div>
      <p className="text-[12px] text-slate-500 mb-3">
        Format kolom impor: <span className="font-mono text-[11px]">Kode Rekening, Program, Kegiatan, Sub Kegiatan, Belanja, Sumber Dana, PPTK, Pagu Murni, Pagu Pergeseran, Pagu Perubahan</span>.
        Referensi yang belum ada akan dibuat otomatis.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="text-[12.5px]" />
        <button onClick={handleImport} disabled={busy} className="px-3 py-1.5 rounded-md bg-batu-navy text-white text-[12.5px] font-medium hover:bg-batu-navy/90 disabled:opacity-60">
          {busy ? "Mengimpor..." : "Impor Kode Rekening"}
        </button>
        <a href="/api/export/excel?jenis=rekening" className="px-3 py-1.5 rounded-md border border-slate-300 text-[12.5px] font-medium hover:bg-slate-50">
          Ekspor Kode Rekening
        </a>
        <a href="/api/export/excel?jenis=transaksi" className="px-3 py-1.5 rounded-md border border-slate-300 text-[12.5px] font-medium hover:bg-slate-50">
          Ekspor Rekap Transaksi
        </a>
      </div>

      {errorMsg && (
        <div className="mt-3 text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {hasil && (
        <div className="mt-3 text-[12.5px] bg-slate-50 rounded-lg p-3">
          <div>Total baris: {hasil.total ?? 0} — Berhasil: <span className="text-emerald-600 font-medium">{hasil.sukses ?? 0}</span> — Gagal: <span className="text-rose-600 font-medium">{hasil.gagal ?? 0}</span></div>
          {hasil.errors?.length > 0 && (
            <ul className="mt-1 list-disc ml-4 text-rose-600">
              {hasil.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
