"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedLogo from "@/components/AnimatedLogo";
import GlowOrb from "@/components/ui/GlowOrb";
import { Github, Linkedin, Mail } from "lucide-react";

const navLinks = [
    { href: "/transfer", label: "Transfer" },
    { href: "/party", label: "Party" },
    { href: "/discovery", label: "Discovery" },
    { href: "/library", label: "Library" },
];

interface PageLayoutProps {
    children: ReactNode;
    showOrbs?: boolean;
    orbConfig?: { color: "primary" | "secondary" | "accent"; position: string; size: "sm" | "md" | "lg" | "xl" }[];
}

export default function PageLayout({
    children,
    showOrbs = true,
    orbConfig = [
        { color: "primary", position: "top-[-20%] right-[-10%]", size: "lg" }, // Blue
        { color: "secondary", position: "bottom-[10%] left-[-10%]", size: "md" }, // Fuchsia
    ]
}: PageLayoutProps) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen flex flex-col relative font-sans">
            {/* Background Orbs */}
            {showOrbs && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    {orbConfig.map((orb, i) => (
                        <GlowOrb key={i} color={orb.color} size={orb.size} className={orb.position} delay={i * 0.8} />
                    ))}
                    <div className="absolute inset-0 grid-pattern opacity-10" />
                </div>
            )}

            {/* Floating Capsule Header - Refined Design */}
            <header className="fixed top-6 left-0 right-0 z-50 px-6 pointer-events-none">
                <div className="max-w-5xl mx-auto">
                    <nav className="pointer-events-auto flex items-center justify-between p-2 pl-4 pr-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20 ring-1 ring-white/5 transition-all duration-300 hover:bg-black/50 hover:border-white/20 hover:ring-white/10">

                        {/* Left Side: Logo & Credit */}
                        <div className="flex items-center gap-4">
                            <AnimatedLogo size="sm" />

                            {/* Partition */}
                            <div className="h-6 w-px bg-white/10" />

                            {/* HuLaX Header Credit */}
                            <a
                                href="https://hulax.vercel.app"
                                target="_blank"
                                rel="noreferrer"
                                className="group flex flex-col items-start gap-0.5 leading-tight text-white/70"
                            >
                                <span className="hulax-credit-label text-[0.5rem] text-white/60 transition-colors group-hover:text-white">
                                    A Project By
                                </span>
                                <span className="hulax-credit inline-block origin-left text-[0.7rem] text-white/80 transition-all group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:via-fuchsia-600 group-hover:to-amber-500 group-hover:font-black group-hover:drop-shadow-[0_0_14px_rgba(214,182,138,0.45)] sm:text-sm">
                                    HuLaX
                                </span>
                            </a>
                        </div>

                        {/* Center: Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => {
                                const isTransferRoute =
                                    link.href === "/transfer" &&
                                    ["/transfer", "/import", "/review", "/runs"].includes(pathname);
                                const isPartyRoute = link.href === "/party" && pathname.startsWith("/party");
                                const isDiscoveryRoute = link.href === "/discovery" && pathname.startsWith("/discovery");
                                const isLibraryRoute = link.href === "/library" && pathname.startsWith("/library");
                                const isActive = isTransferRoute || isPartyRoute || isDiscoveryRoute || isLibraryRoute || pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`
                      relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-300
                      ${isActive
                                                ? "text-white bg-white/10 shadow-inner"
                                                : "text-muted-foreground hover:text-white hover:bg-white/5"
                                            }
                    `}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right: GitHub Link (Glassy/Grey) */}
                        <div className="flex items-center gap-3">
                            {/* Music Visualizer Animation */}
                            <div className="hidden sm:flex items-end gap-0.5 h-4 w-4 opacity-50">
                                <div className="w-1 bg-white rounded-full animate-music-bar-1" style={{ height: '40%' }}></div>
                                <div className="w-1 bg-white rounded-full animate-music-bar-2" style={{ height: '80%' }}></div>
                                <div className="w-1 bg-white rounded-full animate-music-bar-3" style={{ height: '60%' }}></div>
                            </div>

                            <Link
                                href="https://github.com/HuLaxx/Shiftify"
                                target="_blank"
                                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white hover:border-white/20 transition-all shadow-lg hover:shadow-white/5 flex items-center gap-2"
                            >
                                <Github className="w-4 h-4 opacity-80" />
                                <span className="hidden sm:inline">GitHub</span>
                            </Link>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 px-6 lg:px-12 pt-32 pb-20">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Floating Footer */}
            <footer className="relative z-10 m-4 md:m-8 mt-auto rounded-3xl overflow-hidden border border-white/5 bg-black/40 backdrop-blur-3xl shadow-2xl">
                <div className="px-8 lg:px-12 py-16 md:py-24">
                    <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 lg:gap-24">

                        {/* Brand Column */}
                        <div className="md:col-span-2 space-y-6">
                            <AnimatedLogo size="md" />
                            <p className="text-muted-foreground max-w-sm leading-relaxed text-sm">
                                Seamlessly transfer your music library between platforms with a privacy-first, cookie-based approach. Designed for power users who value their data.
                            </p>
                        </div>

                        {/* Column: Pages */}
                        <div>
                            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white mb-6">Pages</h3>
                            <ul className="space-y-4 text-sm text-muted-foreground">
                                <li><Link href="/" className="hover:text-fuchsia-400 transition-colors">Home</Link></li>
                                <li><Link href="/transfer" className="hover:text-fuchsia-400 transition-colors">Transfer</Link></li>
                                <li><Link href="/party" className="hover:text-fuchsia-400 transition-colors">Party</Link></li>
                                <li><Link href="/discovery" className="hover:text-fuchsia-400 transition-colors">Discovery</Link></li>
                                <li><Link href="/library" className="hover:text-fuchsia-400 transition-colors">Library</Link></li>
                            </ul>
                        </div>

                        {/* Column: Connect */}
                        <div>
                            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white mb-6">Connect</h3>
                            <ul className="space-y-4 text-sm text-muted-foreground">
                                <li><Link href="https://github.com/HuLaxx" target="_blank" className="hover:text-blue-400 transition-colors flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</Link></li>
                                <li><Link href="https://www.linkedin.com/in/rahul-khanke-853717218/" target="_blank" className="hover:text-blue-400 transition-colors flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Link></li>
                                <li><Link href="mailto:rahulkhane786@gmail.com" className="hover:text-blue-400 transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> Gmail</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
                        <p>© {new Date().getFullYear()} Shiftify. All rights reserved.</p>

                        {/* HuLaX Footer Credit */}
                        <a
                            href="https://hulax.vercel.app"
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex items-baseline gap-1 text-white/70"
                        >
                            <span className="hulax-credit-label text-white/60 transition-all group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                                A Project By
                            </span>
                            <span className="hulax-credit inline-block origin-left text-base text-white/80 transition-all group-hover:scale-110 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:via-fuchsia-600 group-hover:to-amber-500 group-hover:font-black group-hover:drop-shadow-[0_0_14px_rgba(214,182,138,0.45)] sm:text-lg">
                                HuLaX
                            </span>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
