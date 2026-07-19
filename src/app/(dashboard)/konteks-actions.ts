"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setKonteksAnggaran } from "@/lib/konteks-anggaran";

export async function gantiKonteksAnggaran(formData: FormData) {
  const tahun = Number(formData.get("tahun_anggaran"));
  const tahapanKode = String(formData.get("tahapan"));

  const supabase = await createClient();
  const { data: tahunRow } = await supabase.from("tahun_anggaran").select("id").eq("tahun", tahun).maybeSingle();
  const { data: tahapanRow } = await supabase.from("tahapan_anggaran").select("id").eq("kode", tahapanKode).maybeSingle();

  if (tahunRow && tahapanRow) {
    await setKonteksAnggaran(tahunRow.id, tahapanRow.id);
  }
  revalidatePath("/", "layout");
}
