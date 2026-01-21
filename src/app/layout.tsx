import type { Metadata } from "next";
import { Inter, Space_Grotesk, Merienda } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
const merienda = Merienda({
  subsets: ["latin"],
  variable: "--font-merienda",
});

export const metadata: Metadata = {
  title: "Shiftify - Transfer Your Music",
  description: "Transfer your YouTube Music library to other platforms locally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${merienda.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
