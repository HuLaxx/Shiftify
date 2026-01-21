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
  weight: ["400", "600"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shiftify.vercel.app"), // Replace with actual domain when deployed
  title: {
    default: "Shiftify - The Ultimate Music Transfer Tool",
    template: "%s | Shiftify",
  },
  description: "Seamlessly transfer your YouTube Music library to other platforms locally. Privacy-first, cookie-based, and completely free. A project by HuLaX.",
  keywords: [
    "youtube music transfer",
    "export youtube music",
    "playlist converter",
    "spotify transfer",
    "apple music import",
    "local music tool",
    "privacy focused",
    "hulax",
    "open source music tool"
  ],
  authors: [{ name: "HuLaX", url: "https://hulax.vercel.app" }],
  creator: "HuLaX",
  publisher: "HuLaX",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shiftify.vercel.app",
    title: "Shiftify - Transfer Your Music Library",
    description: "The privacy-first tool to move your playlists between services. No API keys required.",
    siteName: "Shiftify",
    images: [
      {
        url: "/og-image.png", // We should create this or use specific image
        width: 1200,
        height: 630,
        alt: "Shiftify - Music Transfer Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shiftify - Transfer Your Music",
    description: "Move your YouTube Music library locally. Free & Open Source.",
    creator: "@HuLaxx", // Placeholder
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${merienda.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
