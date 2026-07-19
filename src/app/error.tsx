"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F5F8]">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-[10px] tracking-[0.2em] text-slate-400 font-medium">PANDA-SPJ</div>
        <div className="text-xl font-bold text-[#0F2A43] mt-3">Terjadi Kesalahan</div>
        <div className="text-[12.5px] text-slate-500 mt-2 mb-6">
          Sistem mengalami gangguan saat memuat halaman ini. Silakan coba lagi.
        </div>
        <button
          onClick={() => reset()}
          className="w-full bg-[#0F2A43] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#16385A]"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
