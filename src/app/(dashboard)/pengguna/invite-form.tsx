"use client";

import { useState } from "react";

const ROLES = ["Administrator", "KPA", "PPTK", "BPP", "Auditor", "Viewer"];

export default function UndangPenggunaForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(fd: FormData) {
    setBusy(true);
    setError("");
    setSuccess(false);
    const payload = Object.fromEntries(fd.entries());
    const res = await fetch("/api/pengguna/invite", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error || "Gagal mengundang pengguna."); return; }
    setSuccess(true);
    setTimeout(() => { setOpen(false); setSuccess(false); window.location.reload(); }, 1200);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm text-[#0F2A43]">Undang Pengguna Baru</div>
        <button onClick={() => setOpen((o) => !o)} className="text-[12px] px-3 py-1.5 rounded-md bg-[#0F2A43] text-white font-medium hover:bg-[#16385A]">
          {open ? "Tutup" : "+ Undang"}
        </button>
      </div>
      {open && (
        <form action={submit} className="grid grid-cols-3 gap-2 mt-3">
          <input name="email" type="email" required placeholder="Email (untuk terima undangan)" className="border rounded px-2 py-1.5 text-sm" />
          <input name="username" required placeholder="Username (untuk login)" className="border rounded px-2 py-1.5 text-sm" />
          <input name="nama" required placeholder="Nama lengkap" className="border rounded px-2 py-1.5 text-sm" />
          <input name="nip" required placeholder="NIP" className="border rounded px-2 py-1.5 text-sm" />
          <select name="role" required className="border rounded px-2 py-1.5 text-sm">
            <option value="">Role</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input name="pangkat" placeholder="Pangkat/Golongan (opsional)" className="border rounded px-2 py-1.5 text-sm" />
          <input name="jabatan" placeholder="Jabatan (opsional)" className="border rounded px-2 py-1.5 text-sm" />
          <div className="col-span-3 flex items-center gap-2">
            <button disabled={busy} className="px-3 py-1.5 bg-[#0F2A43] text-white rounded text-sm disabled:opacity-60">
              {busy ? "Mengirim undangan..." : "Kirim Undangan"}
            </button>
            {error && <span className="text-[12px] text-red-600">{error}</span>}
            {success && <span className="text-[12px] text-emerald-600">Undangan terkirim ✓</span>}
          </div>
        </form>
      )}
    </div>
  );
}
