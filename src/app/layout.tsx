import type { Metadata } from "next";
import Script from "next/script";
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
  metadataBase: new URL("https://shiftify.hulax.uk"), // Replace with actual domain when deployed
  title: {
    default: "Shiftify — Your Music Passport",
    template: "%s | Shiftify",
  },
  description: "Music-library import, review and reporting tools, with an experimental YouTube Music account-transfer adapter. Credential-based features require a trusted server.",
  keywords: [
    "youtube music transfer",
    "export youtube music",
    "playlist converter",
    "local music tool",
    "music data portability",
    "hulax",
    "open source music tool"
  ],
  authors: [{ name: "HuLaX", url: "https://portfolio.hulax.uk/" }],
  creator: "HuLaX",
  publisher: "HuLaX",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shiftify.hulax.uk",
    title: "Shiftify — Your Music Passport",
    description: "Import and review tracklists with an experimental YouTube Music account-transfer workflow. Authenticated actions require a trusted deployment.",
    siteName: "Shiftify",
    images: [
      {
        url: "/assets/hero-banner.png", // Existing repository asset, not a generated placeholder
        width: 1200,
        height: 630,
        alt: "Shiftify - Music Transfer Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shiftify — Your Music Passport",
    description: "Explore portable music libraries, track reviews and account-transfer workflows.",
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
        <Script
          id="strip-extension-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function () {
  try {
    var attr = "bis_skin_checked";
    var remove = function () {
      var nodes = document.querySelectorAll("[" + attr + "]");
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].removeAttribute(attr);
      }
    };
    remove();
    var observer = new MutationObserver(function () {
      remove();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: [attr],
    });
  } catch (e) {}
})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
