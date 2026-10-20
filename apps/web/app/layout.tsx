import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OmniScan — AI Deepfake, Voice Clone & Synthetic Media Detection Platform",
  description:
    "Multi-modal forensic investigation platform for AI-generated images, synthetic speech, and deepfake video manipulation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#080d16] text-[#edf3ff] antialiased selection:bg-[#14b8a6]/20 selection:text-[#14b8a6] min-h-screen">
        {children}
      </body>
    </html>
  );
}
