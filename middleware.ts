import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Rute yang membutuhkan role tertentu (di luar daftar ini = semua role login boleh akses)
const ROUTE_ROLES: Record<string, string[]> = {
  "/master-data": ["Administrator"],
  "/pengguna": ["Administrator"],
  "/audit-trail": ["Administrator", "Auditor"],
  "/backup": ["Administrator"],
};

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // Cookie yang perlu ditulis ulang (mis. refresh token Supabase) dikumpulkan
  // dulu, baru diterapkan ke response TUNGGAL di akhir — supaya tidak ada
  // reassignment `response` yang bisa saling menimpa (menghindari kelas bug
  // "kehilangan cookie refresh sesi").
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/api/public");

  // Teruskan user.id via header agar Server Component (layout.tsx) tidak
  // perlu memanggil supabase.auth.getUser() lagi — getUser() melakukan
  // round-trip validasi ke Supabase Auth, jadi memanggilnya dua kali per
  // navigasi (middleware + layout) menggandakan latensi tanpa manfaat
  // keamanan tambahan (middleware sudah memvalidasi sesi di sini).
  if (user) requestHeaders.set("x-user-id", user.id);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  if (user && !isPublic) {
    const restriction = Object.entries(ROUTE_ROLES).find(([prefix]) => path.startsWith(prefix));
    if (restriction) {
      const { data: pegawai } = await supabase.from("pegawai").select("role").eq("id", user.id).single();
      const allowedRoles = restriction[1];
      if (!pegawai || !allowedRoles.includes(pegawai.role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("denied", path);
        return NextResponse.redirect(url);
      }
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
