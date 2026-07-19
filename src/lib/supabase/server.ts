import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

/**
 * Client Supabase untuk Server Components, Server Actions, dan Route Handlers.
 * Membaca sesi pengguna dari cookie sehingga RLS berjalan sesuai identitas
 * pengguna yang login (bukan service role).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() dipanggil dari Server Component — aman diabaikan karena
            // middleware.ts yang menangani refresh sesi.
          }
        },
      },
    }
  );
}

/**
 * Client dengan service role — HANYA dipakai di Route Handlers tepercaya
 * (misal generator dokumen) yang perlu bypass RLS, misal untuk menulis
 * ke tabel audit_log atau storage. Jangan pernah diimpor ke Client Component.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
