"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedLogo from "@/components/AnimatedLogo";
import GlowOrb from "@/components/ui/GlowOrb";
import { Flame, Github, Twitter, Heart, Linkedin, Mail } from "lucide-react";

const navLinks = [
    { href: "/transfer", label: "Transfer" },
    { href: "/import", label: "Import" },
    { href: "/review", label: "Review" },
    { href: "/runs", label: "Runs" },
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
                <div className="max-w-3xl mx-auto">
                    <nav className="pointer-events-auto flex items-center justify-between p-2 pl-4 pr-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20 ring-1 ring-white/5 transition-all duration-300 hover:bg-black/50 hover:border-white/20 hover:ring-white/10">
                        <AnimatedLogo size="sm" />

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1 mx-4">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
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

                        {/* GitHub Link */}
                        <Link
                            href="https://github.com/HuLaxx/Shiftify"
                            target="_blank"
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-full hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group"
                        >
                            <Github className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            <span className="hidden sm:inline">Star</span>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 px-6 lg:px-12 pt-32 pb-20">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Spacious Footer */}
            <footer className="relative z-10 mt-auto border-t border-white/5 bg-black/40 backdrop-blur-2xl">
                <div className="px-6 lg:px-12 py-20">
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
                                <li><Link href="/transfer" className="hover:text-fuchsia-400 transition-colors">Transfer Music</Link></li>
                                <li><Link href="/import" className="hover:text-fuchsia-400 transition-colors">Import Playlist</Link></li>
                                <li><Link href="/review" className="hover:text-fuchsia-400 transition-colors">Review Queue</Link></li>
                                <li><Link href="/runs" className="hover:text-fuchsia-400 transition-colors">Run History</Link></li>
                            </ul>
                        </div>

                        {/* Column: Connect */}
                        <div>
                            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white mb-6">Connect</h3>
                            <ul className="space-y-4 text-sm text-muted-foreground">
                                <li><Link href="https://github.com/HuLaxx/Shiftify" target="_blank" className="hover:text-blue-400 transition-colors flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</Link></li>
                                <li><Link href="#" className="hover:text-blue-400 transition-colors flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Link></li>
                                <li><Link href="mailto:contact@example.com" className="hover:text-blue-400 transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> Gmail</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
                        <p>© {new Date().getFullYear()} Shiftify. All rights reserved.</p>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                            <span>Made with</span>
                            <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
                            <span>a project by <strong className="text-white">HuLaxx</strong></span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
