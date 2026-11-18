import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDFPro — PDF Editor Pro · CORPAC AIS/ARO SPHI",
  description: "PDFPro v2.9.8: editor de PDF, Word y Excel con sellos de recepción y personales, OCR, decodificador aeronáutico METAR/TAF/FPL. CORPAC AIS/ARO SPHI.",
  keywords: ["PDFPro", "PDF", "editor", "Word", "Excel", "sellos", "FPL", "CORPAC", "AIS/ARO", "METAR", "TAF"],
  authors: [{ name: "CORPAC AIS/ARO SPHI" }],
  icons: {
    icon: "/pdfpro-icon.svg",
  },
  openGraph: {
    title: "PDFPro — PDF Editor Pro",
    description: "Editor de PDF, Word y Excel con sellos, OCR y decodificador aeronáutico. CORPAC AIS/ARO SPHI.",
    siteName: "PDFPro",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
