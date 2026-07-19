import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PANDA-SPJ — Pendamping Administrasi Dokumen SPJ",
  description: "Bagian Perekonomian dan Sumber Daya Alam, Sekretariat Daerah Kota Batu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased bg-batu-mist text-batu-ink font-sans">{children}</body>
    </html>
  );
}
