"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { rupiah } from "@/lib/format";

const PERIODE_OPTIONS = [
  { id: "harian", label: "Harian" },
  { id: "bulanan", label: "Bulanan" },
  { id: "triwulanan", label: "Triwulanan" },
  { id: "tahunan", label: "Tahunan" },
];
const WARNA = ["#0F2A43", "#1E5C97", "#B8860B", "#2E7D5B", "#8B5CF6", "#DC6B19"];

function labelPeriode(iso: string, periode: string) {
  const d = new Date(iso);
  if (periode === "harian") return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  if (periode === "bulanan") return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  if (periode === "triwulanan") return `TW${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  return String(d.getFullYear());
}

export default function RekapCharts({ data }: { data: any[] }) {
  const [periode, setPeriode] = useState("bulanan");
  const valid = data.filter((t) => t.status !== "ditolak");

  const seriWaktu = useMemo(() => {
    const map: Record<string, number> = {};
    valid.forEach((t) => {
      const key = labelPeriode(t.tanggal_acara, periode);
      map[key] = (map[key] || 0) + t.ajuan;
    });
    return Object.entries(map).map(([periode, total]) => ({ periode, total }));
  }, [valid, periode]);

  const byProgram = useMemo(() => {
    const map: Record<string, number> = {};
    valid.forEach((t) => {
      const key = t.rekening?.program?.nama || "Lainnya";
      map[key] = (map[key] || 0) + t.ajuan;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [valid]);

  const bySumberDana = useMemo(() => {
    const map: Record<string, number> = {};
    valid.forEach((t) => {
      const key = t.rekening?.sumber_dana?.kode || "Lainnya";
      map[key] = (map[key] || 0) + t.ajuan;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [valid]);

  const byPptk = useMemo(() => {
    const map: Record<string, number> = {};
    valid.forEach((t) => {
      const key = t.pptk?.nama || "Lainnya";
      map[key] = (map[key] || 0) + t.ajuan;
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [valid]);

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {PERIODE_OPTIONS.map((p) => (
          <button key={p.id} onClick={() => setPeriode(p.id)}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium ${periode === p.id ? "bg-white shadow-sm text-[#0F2A43]" : "text-slate-500"}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="font-semibold text-sm text-[#0F2A43] mb-3">Realisasi per {PERIODE_OPTIONS.find((p) => p.id === periode)?.label}</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={seriWaktu}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
            <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => (v / 1_000_000).toFixed(0) + "jt"} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => rupiah(v)} />
            <Bar dataKey="total" fill="#0F2A43" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="font-semibold text-sm text-[#0F2A43] mb-3">Realisasi per Program</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byProgram} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                {byProgram.map((_, i) => <Cell key={i} fill={WARNA[i % WARNA.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => rupiah(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div className="font-semibold text-sm text-[#0F2A43] mb-3">Realisasi per Sumber Dana</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={bySumberDana} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                {bySumberDana.map((_, i) => <Cell key={i} fill={WARNA[i % WARNA.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => rupiah(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="font-semibold text-sm text-[#0F2A43] mb-3">Realisasi per PPTK</div>
        <ResponsiveContainer width="100%" height={Math.max(180, byPptk.length * 40)}>
          <BarChart data={byPptk} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
            <XAxis type="number" tickFormatter={(v) => (v / 1_000_000).toFixed(0) + "jt"} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip formatter={(v: number) => rupiah(v)} />
            <Bar dataKey="total" fill="#B8860B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
