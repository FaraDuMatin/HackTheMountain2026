import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "LuminaWave — Sound, Visualized",
  description:
    "Turn any song or your own voice into a 3D artwork you can fly through, capture, and share.",
  openGraph: {
    title: "LuminaWave — Sound, Visualized",
    description:
      "Turn any song or your own voice into a 3D artwork you can fly through, capture, and share.",
    type: "website",
    siteName: "LuminaWave",
  },
  twitter: {
    card: "summary_large_image",
    title: "LuminaWave — Sound, Visualized",
    description:
      "Turn any song or your own voice into a 3D artwork you can fly through, capture, and share.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
