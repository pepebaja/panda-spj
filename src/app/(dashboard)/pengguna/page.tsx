import { createClient } from "@/lib/supabase/server";
import PenggunaTable from "./table";
import UndangPenggunaForm from "./invite-form";
import TautkanAkunForm from "./tautkan-form";

export const revalidate = 0;

export default async function PenggunaPage() {
  const supabase = await createClient();
  const { data: pegawaiList } = await supabase.from("pegawai").select("*").order("nama");

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-batu-navy">Manajemen Pengguna</h1>
        <p className="text-sm text-slate-500">Kelola akses berdasarkan role: Administrator, KPA, PPTK, BPP, Auditor, Viewer.</p>
      </div>
      <UndangPenggunaForm />
      <TautkanAkunForm />
      <PenggunaTable list={pegawaiList || []} />
    </div>
  );
}
