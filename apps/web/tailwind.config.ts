import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // paleta base — refinamos quando entrarmos no dashboard (Etapa 7)
        brand: {
          50: "#eef4ff",
          500: "#3b5bfd",
          600: "#2d46e0",
          900: "#0f1a4d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
