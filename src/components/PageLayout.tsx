"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedLogo from "@/components/AnimatedLogo";
import GlowOrb from "@/components/ui/GlowOrb";
import { Flame, Github, Twitter, Heart } from "lucide-react";

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
        { color: "primary", position: "top-[-20%] right-[-10%]", size: "lg" },
        { color: "secondary", position: "bottom-[10%] left-[-10%]", size: "md" },
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

            {/* Floating Capsule Header */}
            <header className="fixed top-6 left-0 right-0 z-50 px-6 pointer-events-none">
                <div className="max-w-4xl mx-auto">
                    <nav className="pointer-events-auto flex items-center justify-between p-2 pl-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/10 transition-all duration-300 hover:bg-white/10 hover:border-white/20">
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
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            <Github className="w-4 h-4" />
                            <span className="hidden sm:inline">Star</span>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content - Added padding top for floating header */}
            <main className="relative z-10 flex-1 px-6 lg:px-12 pt-32 pb-20">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Spacious Footer */}
            <footer className="relative z-10 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-lg">
                <div className="px-6 lg:px-12 py-16">
                    <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">

                        {/* Brand Column */}
                        <div className="md:col-span-2 space-y-6">
                            <AnimatedLogo size="md" />
                            <p className="text-muted-foreground max-w-sm leading-relaxed">
                                Seamlessly transfer your music library between platforms with a privacy-first, cookie-based approach. Designed for power users who value their data.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                                    <Github className="w-5 h-5" />
                                </a>
                                <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                                    <Twitter className="w-5 h-5" />
                                </a>
                            </div>
                        </div>

                        {/* Links Column */}
                        <div>
                            <h3 className="font-display font-semibold text-lg mb-6">Product</h3>
                            <ul className="space-y-4 text-sm text-muted-foreground">
                                <li><Link href="/transfer" className="hover:text-primary transition-colors">Transfer Music</Link></li>
                                <li><Link href="/import" className="hover:text-primary transition-colors">Import Playlist</Link></li>
                                <li><Link href="/review" className="hover:text-primary transition-colors">Review Queue</Link></li>
                                <li><Link href="/runs" className="hover:text-primary transition-colors">Run History</Link></li>
                            </ul>
                        </div>

                        {/* Legal/Info Column */}
                        <div>
                            <h3 className="font-display font-semibold text-lg mb-6">Resources</h3>
                            <ul className="space-y-4 text-sm text-muted-foreground">
                                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                                <li><Link href="#" className="hover:text-primary transition-colors">Privacy Guide</Link></li>
                                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                                <li><Link href="https://github.com/HuLaxx/Shiftify" className="hover:text-primary transition-colors">Source Code</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                        <p>© {new Date().getFullYear()} Shiftify. Open source and free forever.</p>
                        <div className="flex items-center gap-2">
                            <span>Made with</span>
                            <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
                            <span>by HuLaxx</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
