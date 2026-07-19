"use client";

import { useActionState } from "react";
import { aturUsernameSaya } from "./username-actions";

export default function UsernameBanner() {
  const [state, formAction, pending] = useActionState(aturUsernameSaya, undefined);

  if (state?.ok) {
    return (
      <div className="mb-4 text-[12.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
        ✓ Username berhasil diatur. Mulai sekarang Anda bisa login memakai username ini (selain email).
      </div>
    );
  }

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="text-[12.5px] text-amber-800 flex-1">
          <span className="font-semibold">Anda belum mengatur username.</span> Saat ini Anda hanya bisa login
          memakai email. Atur username sekali di sini agar bisa login lebih cepat berikutnya.
        </div>
        <form action={formAction} className="flex gap-2 shrink-0">
          <input
            name="username" required minLength={3} placeholder="mis. sari.anas"
            className="border border-amber-300 rounded-md px-2.5 py-1.5 text-[12.5px] w-40 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button disabled={pending} type="submit" className="bg-amber-600 text-white rounded-md px-3 py-1.5 text-[12.5px] font-medium hover:bg-amber-700 disabled:opacity-60 whitespace-nowrap">
            {pending ? "Menyimpan..." : "Simpan Username"}
          </button>
        </form>
      </div>
      {state?.error && <div className="mt-2 text-[12px] text-rose-700">{state.error}</div>}
    </div>
  );
}
