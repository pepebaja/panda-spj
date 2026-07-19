"use client";

import { useTransition } from "react";
import { nonaktifkanPegawai } from "../master-data/actions";

const ROLE_COLORS: Record<string, string> = {
  Administrator: "bg-rose-50 text-rose-700",
  KPA: "bg-violet-50 text-violet-700",
  PPTK: "bg-blue-50 text-blue-700",
  BPP: "bg-teal-50 text-teal-700",
  Auditor: "bg-amber-50 text-amber-700",
  Viewer: "bg-slate-100 text-slate-600",
};
function roleBadge(role: string) {
  return ROLE_COLORS[role] || "bg-slate-100 text-slate-600";
}

export default function PenggunaTable({ list }: { list: any[] }) {
  const [pending, start] = useTransition();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="bg-slate-50 text-slate-500 text-[10.5px] uppercase tracking-wide">
          <tr>
            <th className="text-left p-2.5">Nama</th>
            <th className="text-left p-2.5">Username</th>
            <th className="text-left p-2.5">NIP</th>
            <th className="text-left p-2.5">Role</th>
            <th className="text-left p-2.5">Status</th>
            <th className="text-right p-2.5">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="p-2.5 font-medium">{p.nama}</td>
              <td className="p-2.5 text-slate-500 font-mono text-[11.5px]">{p.username || <span className="text-slate-300">—</span>}</td>
              <td className="p-2.5 text-slate-500">{p.nip}</td>
              <td className="p-2.5"><span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${roleBadge(p.role)}`}>{p.role}</span></td>
              <td className="p-2.5">
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] ${p.status_aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.status_aktif ? "Aktif" : "Nonaktif"}
                </span>
              </td>
              <td className="p-2.5 text-right">
                <button disabled={pending} onClick={() => start(async () => { await nonaktifkanPegawai(p.id, !p.status_aktif); })} className="text-[12px] text-blue-600 hover:underline">
                  {p.status_aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
