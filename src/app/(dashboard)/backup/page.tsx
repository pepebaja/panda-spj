"use client";

import { useRef, useState } from "react";

export default function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleRestore() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setHasil(null);
    setErrorMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/restore", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) setErrorMsg(json.error || "Gagal memulihkan backup.");
    else setHasil(json.ringkasan);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0F2A43]">Backup &amp; Restore</h1>
        <p className="text-sm text-slate-500">Cadangkan seluruh data master dan transaksi, atau pulihkan dari file backup sebelumnya.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
        <div className="font-semibold text-sm text-[#0F2A43] mb-2">Buat Backup</div>
        <p className="text-[12.5px] text-slate-500 mb-3">Mengunduh satu file JSON berisi seluruh tabel master &amp; transaksi.</p>
        <a href="/api/backup" className="inline-block px-4 py-2 rounded-lg bg-[#0F2A43] text-white text-[13px] font-medium hover:bg-[#16385A]">
          ⬇️ Unduh Backup Sekarang
        </a>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="font-semibold text-sm text-[#0F2A43] mb-2">Pulihkan dari Backup</div>
        <p className="text-[12.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
          ⚠️ Operasi ini menulis ulang (upsert) data berdasarkan ID. Pastikan file berasal dari fitur Backup di atas.
        </p>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="application/json" className="text-[12.5px]" />
          <button onClick={handleRestore} disabled={busy} className="px-3 py-1.5 rounded-md bg-red-600 text-white text-[12.5px] font-medium hover:bg-red-700 disabled:opacity-60">
            {busy ? "Memulihkan..." : "Pulihkan Data"}
          </button>
        </div>
        {errorMsg && <div className="mt-3 text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{errorMsg}</div>}
        {hasil && (
          <div className="mt-3 text-[12.5px] bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            Berhasil dipulihkan: {Object.entries(hasil).map(([t, n]) => `${t} (${n})`).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
