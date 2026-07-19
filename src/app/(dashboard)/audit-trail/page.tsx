import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

const AKSI_WARNA: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-blue-50 text-blue-700",
  delete: "bg-red-50 text-red-700",
  generate_dokumen: "bg-amber-50 text-amber-700",
  import_excel: "bg-purple-50 text-purple-700",
  aktifkan: "bg-emerald-50 text-emerald-700",
  nonaktifkan: "bg-slate-100 text-slate-600",
};

export default async function AuditTrailPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("*, aktor:pegawai!audit_log_actor_id_fkey(nama)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0F2A43]">Audit Trail</h1>
        <p className="text-sm text-slate-500">200 aktivitas terakhir pada sistem — siapa mengubah apa, dan kapan.</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-slate-500 text-[10.5px] uppercase tracking-wide">
            <tr>
              <th className="text-left p-2.5">Waktu</th>
              <th className="text-left p-2.5">Aktor</th>
              <th className="text-left p-2.5">Aksi</th>
              <th className="text-left p-2.5">Entitas</th>
              <th className="text-left p-2.5">Detail</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((l: any) => (
              <tr key={l.id} className="border-t border-slate-100 align-top">
                <td className="p-2.5 whitespace-nowrap text-slate-500">{new Date(l.created_at).toLocaleString("id-ID")}</td>
                <td className="p-2.5">{l.aktor?.nama || "-"}</td>
                <td className="p-2.5"><span className={`px-2 py-0.5 rounded-full text-[10.5px] ${AKSI_WARNA[l.aksi] || "bg-slate-100 text-slate-600"}`}>{l.aksi}</span></td>
                <td className="p-2.5">{l.entitas}</td>
                <td className="p-2.5 text-slate-500 max-w-md truncate">{l.detail ? JSON.stringify(l.detail) : "-"}</td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">Belum ada aktivitas tercatat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
