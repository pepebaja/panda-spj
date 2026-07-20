"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { setKonteksAnggaran, pastikanKonteksTersedia } from "@/lib/konteks-anggaran";

export async function gantiKonteksAnggaran(formData: FormData) {
  const tahun = Number(formData.get("tahun_anggaran"));
  const tahapanKode = String(formData.get("tahapan"));

  // Pakai service role + fungsi self-healing yang sama dengan login, supaya
  // mengganti ke tahun yang belum ada baris `tahun_anggaran`-nya (mis. tahun
  // depan yang belum dibuka) tetap berhasil, bukan gagal diam-diam.
  const admin = createServiceRoleClient();
  const hasil = await pastikanKonteksTersedia(admin, tahun, tahapanKode);
  if (hasil) {
    await setKonteksAnggaran(hasil.tahunId, hasil.tahapanId);
  }
  revalidatePath("/", "layout");
}
