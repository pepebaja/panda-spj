"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { hapusTransaksi } from "../transaksi/actions";

export default function RowActions({ id, status, judulAcara }: { id: string; status: string; judulAcara: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  if (status !== "draft") {
    return <span className="text-[11px] text-slate-300" title="Hanya transaksi berstatus draft yang bisa diubah/dihapus">—</span>;
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[11px] text-slate-500">Hapus &ldquo;{judulAcara}&rdquo;?</span>
        <button
          disabled={pending}
          onClick={() => start(async () => {
            const res = await hapusTransaksi(id);
            if (res.error) { setError(res.error); setConfirming(false); }
          })}
          className="text-[11.5px] px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? "..." : "Ya, Hapus"}
        </button>
        <button onClick={() => setConfirming(false)} className="text-[11.5px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
      <Link href={`/transaksi/${id}/edit`} className="text-[12px] text-sky-700 hover:underline font-medium">Ubah</Link>
      <button onClick={() => setConfirming(true)} className="text-[12px] text-rose-600 hover:underline font-medium">Hapus</button>
    </div>
  );
}
