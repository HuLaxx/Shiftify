
import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/ui/CustomCursor";
import PageTransition from "@/components/ui/PageTransition";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shiftify | Premium Music Transfer",
  description: "Seamlessly transfer your music library with style.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
        <CustomCursor />
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  );
}
