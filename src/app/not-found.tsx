import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F5F8]">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-[10px] tracking-[0.2em] text-slate-400 font-medium">PANDA-SPJ</div>
        <div className="text-5xl font-bold text-[#0F2A43] mt-3">404</div>
        <div className="text-sm text-slate-500 mt-2 mb-6">Halaman yang Anda cari tidak ditemukan.</div>
        <Link
          href="/dashboard"
          className="inline-block bg-[#0F2A43] text-white rounded-lg py-2.5 px-5 text-sm font-semibold hover:bg-[#16385A]"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
