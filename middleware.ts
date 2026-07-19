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
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/api/public");

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
