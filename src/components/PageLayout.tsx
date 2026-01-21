"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedLogo from "@/components/AnimatedLogo";
import GlowOrb from "@/components/ui/GlowOrb";
import { Flame } from "lucide-react";

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
        <div className="min-h-screen flex flex-col relative">
            {/* Background Orbs */}
            {showOrbs && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    {orbConfig.map((orb, i) => (
                        <GlowOrb key={i} color={orb.color} size={orb.size} className={orb.position} delay={i * 0.8} />
                    ))}
                    <div className="absolute inset-0 grid-pattern opacity-20" />
                </div>
            )}

            {/* Header */}
            <header className="relative z-20 px-6 lg:px-12 py-6">
                <nav className="flex items-center justify-between max-w-7xl mx-auto">
                    <AnimatedLogo size="md" />

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-full glass">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`
                    relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200
                    ${isActive
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                        }
                  `}
                                >
                                    {isActive && (
                                        <span className="absolute inset-0 bg-white/10 rounded-full" />
                                    )}
                                    <span className="relative">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* GitHub Link */}
                    <Link
                        href="https://github.com/HuLaxx/Shiftify"
                        target="_blank"
                        className="px-4 py-2 text-sm font-medium text-muted-foreground border border-white/10 rounded-full hover:border-white/25 hover:bg-white/5 transition-all"
                    >
                        GitHub
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 px-6 lg:px-12 pb-12">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 px-6 lg:px-12 py-8 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <div
                            className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center"
                            style={{
                                animation: "gradient-shift 6s ease infinite",
                                backgroundSize: "200% 200%",
                            }}
                        >
                            <Flame className="w-3.5 h-3.5 text-white fill-current" />
                        </div>
                        <span>Shiftify — Built with privacy in mind</span>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="hover:text-foreground transition-colors">
                                {link.label}
                            </Link>
                        ))}
                        <Link href="https://github.com/HuLaxx/Shiftify" target="_blank" className="hover:text-foreground transition-colors">
                            GitHub
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
