import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getKonteksAnggaran } from "@/lib/konteks-anggaran";
import KonteksSwitcher from "./konteks-switcher";
import UsernameBanner from "./username-banner";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", chip: "bg-sky-400" },
  { href: "/master-data", label: "Data Master", icon: "🗂️", chip: "bg-amber-400", roles: ["Administrator"] },
  { href: "/transaksi", label: "Transaksi Baru", icon: "📝", chip: "bg-emerald-400" },
  { href: "/dokumen", label: "Dokumen", icon: "📄", chip: "bg-violet-400" },
  { href: "/rekapitulasi", label: "Rekapitulasi", icon: "📈", chip: "bg-rose-400" },
  { href: "/pengguna", label: "Pengguna", icon: "👤", chip: "bg-cyan-400", roles: ["Administrator"] },
  { href: "/audit-trail", label: "Audit Trail", icon: "🕒", chip: "bg-orange-400", roles: ["Administrator", "Auditor"] },
  { href: "/backup", label: "Backup & Restore", icon: "💾", chip: "bg-teal-400", roles: ["Administrator"] },
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const hdrs = await headers();

  // middleware.ts sudah memvalidasi sesi dan menaruh id pengguna di header
  // `x-user-id` — pakai itu di jalur normal supaya TIDAK perlu memanggil
  // supabase.auth.getUser() lagi di sini (getUser() adalah round-trip ke
  // Supabase Auth; memanggilnya dua kali per navigasi menggandakan latensi).
  // Fallback ke getUser() hanya kalau header entah kenapa tidak ada.
  let userId = hdrs.get("x-user-id");
  let userEmailFallback: string | null = null;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
    userEmailFallback = user.email ?? null;
  }

  const pathname = hdrs.get("x-pathname") || "";

  // Ambil profil pegawai & konteks tahun/tahapan secara PARALEL (independen
  // satu sama lain) alih-alih berurutan, untuk mempercepat render awal.
  const [pegawaiResult, konteks] = await Promise.all([
    supabase.from("pegawai").select("nama, role, username").eq("id", userId).single(),
    getKonteksAnggaran(),
  ]);

  let pegawai = pegawaiResult.data;
  if (pegawaiResult.error) {
    // Kemungkinan kolom `username` belum ada (migration 0002 belum dijalankan) —
    // fallback ke query tanpa username agar nama/role tetap tampil.
    const fallback = await supabase.from("pegawai").select("nama, role").eq("id", userId).single();
    pegawai = fallback.data ? { ...fallback.data, username: null } : null;
  }

  // Nama tampilan: nama lengkap > username > email (email hanya sebagai
  // upaya terakhir kalau baris pegawai belum lengkap sama sekali).
  let displayName = pegawai?.nama || pegawai?.username;
  if (!displayName) {
    if (!userEmailFallback) {
      const { data: { user } } = await supabase.auth.getUser();
      userEmailFallback = user?.email ?? null;
    }
    displayName = userEmailFallback || "Pengguna";
  }

  const usernameBelumDiatur = pegawai !== null && !pegawai.username;
  const activeNav = NAV.find((n) => pathname.startsWith(n.href));

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-batu-gradient text-white flex flex-col overflow-y-auto">
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <Image src="/logo-panda-spj.jpeg" alt="Logo PANDA-SPJ" width={40} height={40} className="rounded-lg shrink-0 ring-2 ring-white/20" />
          <div>
            <div className="text-[9px] tracking-[0.15em] text-blue-200 font-medium">PEMERINTAH KOTA BATU</div>
            <div className="font-display font-extrabold text-base leading-tight">PANDA-SPJ</div>
            <div className="text-[10px] text-blue-100/80 leading-snug">Bag. Perekonomian &amp; SDA</div>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.filter((n) => !n.roles || n.roles.includes(pegawai?.role)).map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 mx-2.5 my-0.5 px-2.5 py-2 rounded-lg text-[13.5px] transition-colors ${
                  active ? "bg-white/15 text-white font-medium" : "text-blue-100 hover:bg-white/10"
                }`}>
                <span className={`h-6 w-6 rounded-md ${n.chip} flex items-center justify-center text-[11px] shrink-0 ${active ? "shadow-sm shadow-black/20" : "opacity-90"}`}>
                  {n.icon}
                </span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-[11.5px] text-blue-100 flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-batu-gold to-amber-500 flex items-center justify-center text-[11px] font-bold text-batu-navy shrink-0">
            {initials(displayName)}
          </span>
          <div className="min-w-0">
            <div className="font-medium truncate">{displayName}</div>
            <div className="text-blue-200/70 truncate">{pegawai?.role || "-"}</div>
          </div>
        </div>
      </aside>

      {/* Konten + topbar (statis, tidak ikut scroll — hanya <main> yang scroll) */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-[13.5px] text-slate-500">
            {activeNav && <span className={`h-2 w-2 rounded-full ${activeNav.chip}`} />}
            <span className="font-medium text-batu-navy">{activeNav?.label || "PANDA-SPJ"}</span>
          </div>
          <div className="flex items-center gap-3">
            <KonteksSwitcher tahun={konteks?.tahun ?? null} tahapanKode={konteks?.tahapanKode ?? null} />
            <div className="hidden sm:flex items-center gap-2 text-[12.5px] text-slate-500">
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-batu-navy to-batu-forest flex items-center justify-center text-[10.5px] font-bold text-white shrink-0">
                {initials(displayName)}
              </span>
              <div className="leading-tight">
                <div className="font-medium text-slate-700">{displayName}</div>
                <div className="text-[10.5px] text-slate-400">{pegawai?.role || "-"}</div>
              </div>
            </div>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-lg px-3 py-1.5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                Keluar
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 min-w-0 p-6 overflow-y-auto">
          {usernameBelumDiatur && <UsernameBanner />}
          {children}
        </main>
      </div>
    </div>
  );
}
