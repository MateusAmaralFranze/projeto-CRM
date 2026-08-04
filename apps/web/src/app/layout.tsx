import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdTrack — Rastreamento de Performance de Vendas e Anúncios",
  description:
    "Plataforma SaaS multi-tenant de rastreamento de performance de vendas e anúncios.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
