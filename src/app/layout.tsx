import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Cris Tech - Gerador de Imagens",
  description: "Automação e gestão completa de imagens",
  icons: {
    icon: "https://arxaqnwuyesmjcsyfmbj.supabase.co/storage/v1/object/public/imagens-sem-exclusao/file-Photoroom%20(1).png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} font-sans antialiased bg-[#0A0A0A] text-white`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111111",
              color: "#fff",
              border: "1px solid #1E1E1E",
            },
          }}
        />
      </body>
    </html>
  );
}
