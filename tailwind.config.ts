import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palet "Batu" — diturunkan dari kop surat resmi (navy) dan identitas
        // kota pegunungan/agraris Batu (hijau hutan, emas lambang, biru langit).
        navy: { DEFAULT: "#0F2A43", dark: "#0A1E30", light: "#1E5C97" },
        gold: { DEFAULT: "#B8860B" },
        batu: {
          navy: "#0F2A43",
          forest: "#0E7C4A",
          sky: "#0E86D4",
          gold: "#C8860B",
          mist: "#F5F8F7",
          ink: "#1B2A2E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        serif: ["'Times New Roman'", "serif"],
      },
      backgroundImage: {
        "batu-gradient": "linear-gradient(135deg, #0F2A43 0%, #0E5C4A 60%, #0E7C4A 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
