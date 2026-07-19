"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { login } from "./actions";

const TAHUN_OPTIONS = Array.from({ length: 11 }, (_, i) => 2026 + i); // 2026..2036

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") || "/dashboard";
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Panel kiri — identitas & suasana "Batu" (kota pegunungan) */}
      <div className="relative md:w-[46%] bg-batu-gradient text-white overflow-hidden shrink-0">
        {/* Motif garis kontur pegunungan — elemen khas mewakili "Batu" */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.16]"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden="true"
        >
          <path d="M-20 620 C 90 560, 160 660, 260 600 S 420 520, 620 590" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <path d="M-20 660 C 100 610, 180 700, 280 650 S 440 570, 620 640" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <path d="M-20 700 C 110 660, 200 740, 300 700 S 460 630, 620 690" stroke="#C8860B" strokeWidth="2.5" fill="none" />
          <path d="M-20 740 C 120 705, 220 775, 320 745 S 480 685, 620 735" stroke="#FFFFFF" strokeWidth="2" fill="none" />
          <path d="M-20 780 C 130 750, 240 810, 340 785 S 500 735, 620 780" stroke="#FFFFFF" strokeWidth="2" fill="none" />
        </svg>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-batu-sky/20 blur-3xl" aria-hidden="true" />
        <div className="absolute top-1/3 -left-16 w-56 h-56 rounded-full bg-batu-gold/20 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-col justify-between h-full p-8 md:p-12 py-10">
          <div className="flex items-center gap-3">
            <Image src="/logo-panda-spj.jpeg" alt="Logo PANDA-SPJ" width={44} height={44} className="rounded-xl ring-2 ring-white/30" />
            <div>
              <div className="text-[10px] tracking-[0.25em] text-blue-100/80 font-medium">PEMERINTAH KOTA BATU</div>
              <div className="font-display font-extrabold text-lg leading-tight">PANDA-SPJ</div>
            </div>
          </div>

          <div className="my-10 md:my-0">
            <h1 className="font-display font-extrabold text-3xl md:text-[2.4rem] leading-[1.15] max-w-md">
              Pencairan GU, dari input sampai dokumen jadi.
            </h1>
            <p className="mt-4 text-[14px] text-blue-50/85 max-w-sm leading-relaxed">
              Satu kali input transaksi, tiga dokumen resmi langsung tersusun —
              Nota Dinas, SPTB, dan Kwitansi — sesuai format Bagian Perekonomian
              dan Sumber Daya Alam Sekretariat Daerah Kota Batu.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { color: "bg-batu-sky", label: "Cepat & Otomatis", desc: "3 dokumen sekali input" },
                { color: "bg-batu-gold", label: "Sesuai Format Resmi", desc: "Kop surat & penomoran asli" },
                { color: "bg-emerald-400", label: "Aman & Terlacak", desc: "Validasi pagu + audit trail" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className={`h-8 w-8 rounded-lg ${f.color} flex items-center justify-center text-batu-navy font-bold text-xs shrink-0`}>✓</span>
                  <div>
                    <div className="text-[13px] font-semibold leading-tight">{f.label}</div>
                    <div className="text-[11.5px] text-blue-100/70 leading-tight">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-blue-100/60">
            © {new Date().getFullYear()} Bagian Perekonomian &amp; SDA, Setda Kota Batu
          </div>
        </div>
      </div>

      {/* Panel kanan — form login */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 md:p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 md:hidden text-center">
            <Image src="/logo-panda-spj.jpeg" alt="Logo PANDA-SPJ" width={56} height={56} className="mx-auto rounded-xl mb-3" />
            <div className="font-display font-extrabold text-lg text-batu-navy">PANDA-SPJ</div>
          </div>

          <h2 className="font-display font-extrabold text-2xl text-batu-navy">Selamat datang kembali</h2>
          <p className="text-[13px] text-slate-500 mt-1.5 mb-7">Masuk dengan username dan kata sandi akun Anda.</p>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <div>
              <label htmlFor="username" className="text-[12.5px] font-medium text-slate-700">Username atau Email</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
                </span>
                <input
                  id="username" name="username" type="text" autoComplete="username" required autoFocus
                  placeholder="mis. sari.anas atau email"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-batu-sky focus:ring-2 focus:ring-batu-sky/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-[12.5px] font-medium text-slate-700">Kata Sandi</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V8a5 5 0 0 1 10 0v3" /></svg>
                </span>
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none transition-colors focus:border-batu-sky focus:ring-2 focus:ring-batu-sky/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.7 18.7 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 10 8 10 8a18.6 18.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tahun_anggaran" className="text-[12.5px] font-medium text-slate-700">Tahun Anggaran</label>
                <select
                  id="tahun_anggaran" name="tahun_anggaran" defaultValue={new Date().getFullYear()}
                  className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:border-batu-sky focus:ring-2 focus:ring-batu-sky/20 bg-white"
                >
                  {TAHUN_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="tahapan" className="text-[12.5px] font-medium text-slate-700">Tahapan</label>
                <select
                  id="tahapan" name="tahapan" defaultValue="perubahan"
                  className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:border-batu-sky focus:ring-2 focus:ring-batu-sky/20 bg-white"
                >
                  <option value="murni">Murni</option>
                  <option value="pergeseran">Pergeseran</option>
                  <option value="perubahan">Perubahan</option>
                </select>
              </div>
            </div>

            {state?.error && (
              <div className="text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {state.error}
              </div>
            )}

            <button
              disabled={pending}
              type="submit"
              className="w-full bg-gradient-to-r from-batu-navy to-batu-forest text-white rounded-lg py-2.5 text-sm font-semibold hover:brightness-110 active:brightness-95 transition disabled:opacity-60 shadow-sm shadow-batu-navy/20"
            >
              {pending ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="text-[11.5px] text-slate-400 mt-6 text-center">
            Lupa kata sandi atau belum punya akun? Hubungi Administrator PANDA-SPJ di bagian Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
