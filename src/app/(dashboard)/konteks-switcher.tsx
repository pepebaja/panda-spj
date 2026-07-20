"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gantiKonteksAnggaran } from "./konteks-actions";
import { TAHUN_ANGGARAN_OPTIONS, TAHAPAN_OPTIONS } from "@/lib/anggaran-constants";

/**
 * Switcher ini SELALU dirender, bahkan saat konteks belum terbentuk sama
 * sekali (tahun/tahapanKode bernilai null) — supaya pengguna selalu punya
 * cara mengatur/memperbaiki konteks dari topbar tanpa perlu logout. Versi
 * sebelumnya menyembunyikan switcher ini di belakang badge peringatan saat
 * konteks null, yang justru menutup satu-satunya jalan keluar dari kondisi
 * tsb selain logout — itu sudah diperbaiki di sini.
 */
export default function KonteksSwitcher({ tahun, tahapanKode }: { tahun: number | null; tahapanKode: string | null }) {
  const [open, setOpen] = useState(!tahun); // otomatis terbuka kalau belum diatur
  const [pending, start] = useTransition();
  const router = useRouter();
  const tahapanLabel = TAHAPAN_OPTIONS.find((t) => t.kode === tahapanKode)?.label || tahapanKode;
  const belumDiatur = !tahun || !tahapanKode;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-2.5 py-1.5 border transition-colors ${
          belumDiatur ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" : "bg-batu-mist border-slate-200 text-batu-navy hover:bg-slate-100"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${belumDiatur ? "bg-rose-500" : "bg-batu-forest"}`} />
        {belumDiatur ? "⚠️ Atur Tahun Anggaran" : `TA ${tahun} · ${tahapanLabel}`}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <form
            action={(fd) => start(async () => {
              await gantiKonteksAnggaran(fd);
              setOpen(false);
              router.refresh(); // muat ulang data halaman (Kode Rekening, dsb) sesuai konteks baru
            })}
            className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 z-20 space-y-2.5"
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {belumDiatur ? "Atur Konteks Kerja" : "Ganti Konteks Kerja"}
            </div>
            {belumDiatur && (
              <div className="text-[11.5px] text-slate-500 leading-snug">
                Pilih Tahun Anggaran &amp; Tahapan, lalu klik Terapkan. Data yang belum ada di database akan dibuat otomatis.
              </div>
            )}
            <div>
              <label className="text-[11.5px] font-medium text-slate-600">Tahun Anggaran</label>
              <select name="tahun_anggaran" defaultValue={tahun ?? new Date().getFullYear()} className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-[13px]">
                {TAHUN_ANGGARAN_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11.5px] font-medium text-slate-600">Tahapan</label>
              <select name="tahapan" defaultValue={tahapanKode ?? "perubahan"} className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-[13px]">
                {TAHAPAN_OPTIONS.map((t) => <option key={t.kode} value={t.kode}>{t.label}</option>)}
              </select>
            </div>
            <button disabled={pending} type="submit" className="w-full bg-batu-navy text-white rounded-md py-1.5 text-[12.5px] font-medium hover:bg-batu-navy/90 disabled:opacity-60">
              {pending ? "Menerapkan..." : "Terapkan"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
