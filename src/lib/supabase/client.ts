import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

/**
 * Client Supabase untuk dipakai di Client Components ('use client').
 * Menggunakan anon key — akses data tunduk pada Row Level Security (RLS)
 * yang didefinisikan di supabase/schema.sql.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
