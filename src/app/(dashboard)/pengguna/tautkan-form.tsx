"use client";

import { useState } from "react";

const ROLES = ["Administrator", "KPA", "PPTK", "BPP", "Auditor", "Viewer"];

export default function TautkanAkunForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(fd: FormData) {
    setBusy(true);
    setError("");
    setSuccess(false);
    const payload = Object.fromEntries(fd.entries());
    const res = await fetch("/api/pengguna/tautkan", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || "Gagal menautkan akun."); return; }
    setSuccess(true);
    setTimeout(() => { setOpen(false); setSuccess(false); window.location.reload(); }, 1200);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm text-batu-navy">Tautkan Akun yang Sudah Ada</div>
          <div className="text-[11.5px] text-slate-400">Untuk akun yang sudah dibuat manual di Supabase Authentication, belum lewat undangan aplikasi ini.</div>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-[12px] px-3 py-1.5 rounded-md border border-batu-navy/20 text-batu-navy font-medium hover:bg-batu-mist shrink-0">
          {open ? "Tutup" : "+ Tautkan"}
        </button>
      </div>
      {open && (
        <form action={submit} className="grid grid-cols-3 gap-2 mt-3">
          <input name="email" type="email" required placeholder="Email akun di Supabase Auth" className="border rounded px-2 py-1.5 text-sm" />
          <input name="username" required placeholder="Username (untuk login)" className="border rounded px-2 py-1.5 text-sm" />
          <input name="nama" required placeholder="Nama lengkap" className="border rounded px-2 py-1.5 text-sm" />
          <input name="nip" required placeholder="NIP" className="border rounded px-2 py-1.5 text-sm" />
          <select name="role" required className="border rounded px-2 py-1.5 text-sm">
            <option value="">Role</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input name="pangkat" placeholder="Pangkat/Golongan (opsional)" className="border rounded px-2 py-1.5 text-sm" />
          <div className="col-span-3 flex items-center gap-2">
            <button disabled={busy} className="px-3 py-1.5 bg-batu-navy text-white rounded text-sm disabled:opacity-60">
              {busy ? "Menautkan..." : "Tautkan Akun"}
            </button>
            {error && <span className="text-[12px] text-rose-600">{error}</span>}
            {success && <span className="text-[12px] text-emerald-600">Akun berhasil ditautkan ✓</span>}
          </div>
        </form>
      )}
    </div>
  );
}
