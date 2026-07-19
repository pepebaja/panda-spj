"use client";

import { useRef, useState } from "react";

export default function ImportExportPanel({ tahunAktifId }: { tahunAktifId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState<any>(null);

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setHasil(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tahun_id", tahunAktifId);
    const res = await fetch("/api/import/excel", { method: "POST", body: fd });
    const json = await res.json();
    setHasil(json);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
      <div className="font-semibold text-sm text-[#0F2A43] mb-2">Import / Export Excel</div>
      <p className="text-[12px] text-slate-500 mb-3">
        Format kolom impor: <span className="font-mono text-[11px]">Kode Rekening, Program, Kegiatan, Sub Kegiatan, Belanja, Sumber Dana, PPTK, Pagu Murni, Pagu Pergeseran, Pagu Perubahan</span>.
        Referensi yang belum ada akan dibuat otomatis.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="text-[12.5px]" />
        <button onClick={handleImport} disabled={busy} className="px-3 py-1.5 rounded-md bg-[#0F2A43] text-white text-[12.5px] font-medium hover:bg-[#16385A] disabled:opacity-60">
          {busy ? "Mengimpor..." : "Impor Kode Rekening"}
        </button>
        <a href="/api/export/excel?jenis=rekening" className="px-3 py-1.5 rounded-md border border-slate-300 text-[12.5px] font-medium hover:bg-slate-50">
          Ekspor Kode Rekening
        </a>
        <a href="/api/export/excel?jenis=transaksi" className="px-3 py-1.5 rounded-md border border-slate-300 text-[12.5px] font-medium hover:bg-slate-50">
          Ekspor Rekap Transaksi
        </a>
      </div>
      {hasil && (
        <div className="mt-3 text-[12.5px] bg-slate-50 rounded-lg p-3">
          <div>Total baris: {hasil.total} — Berhasil: <span className="text-emerald-600 font-medium">{hasil.sukses}</span> — Gagal: <span className="text-red-600 font-medium">{hasil.gagal}</span></div>
          {hasil.errors?.length > 0 && (
            <ul className="mt-1 list-disc ml-4 text-red-600">
              {hasil.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
