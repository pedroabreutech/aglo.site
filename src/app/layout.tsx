import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const descricao =
  "Envie uma foto de multidão e receba no seu e-mail a contagem estimada de pessoas, feita com inteligência artificial. Gratuito.";

export const metadata: Metadata = {
  title: "Aglo | Contagem de multidões com IA",
  description: descricao,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Aglo | Quantas pessoas tem na sua foto?",
    description: descricao,
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#F8FAFC] text-slate-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}
