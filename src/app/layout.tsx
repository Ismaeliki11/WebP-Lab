import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "WebP Lab Pro | Herramientas de imagen profesionales",
  description:
    "Plataforma de alto rendimiento para convertir y optimizar imágenes a WebP, AVIF, JPG y PNG. Sin límites, rápido y seguro.",
  keywords: ["WebP", "AVIF", "Image Converter", "Optimization", "Sharp", "Next.js", "Design Tools"],
  authors: [{ name: "WebP Lab Team" }],
  openGraph: {
    title: "WebP Lab Pro | Optimización de imágenes sin límites",
    description: "Pipeline de conversión profesional con soporte para formatos modernos.",
    url: "https://webp-lab.vercel.app",
    siteName: "WebP Lab",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WebP Lab Pro",
    description: "Optimización de imágenes profesional y ultra rápida.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}