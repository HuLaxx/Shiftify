"use client";

import Link from "next/link";
import { Flame } from "lucide-react";

export default function AnimatedLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizes = {
        sm: { box: "w-9 h-9", icon: "w-4 h-4", text: "text-lg" },
        md: { box: "w-11 h-11", icon: "w-5 h-5", text: "text-xl" },
        lg: { box: "w-14 h-14", icon: "w-7 h-7", text: "text-2xl" },
    };

    const s = sizes[size];

    return (
        <Link href="/" className="flex items-center gap-3 group">
            {/* Animated gradient border container */}
            <div className="relative">
                {/* Rotating gradient ring */}
                <div
                    className={`absolute -inset-0.5 rounded-xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity`}
                    style={{
                        background: "linear-gradient(135deg, #ff6b35, #9d4edd, #00d9ff, #ff6b35)",
                        backgroundSize: "300% 300%",
                        animation: "gradient-shift 4s ease infinite, spin-slow 8s linear infinite",
                    }}
                />

                {/* Inner logo container */}
                <div
                    className={`relative ${s.box} rounded-xl bg-gradient-to-br from-primary via-orange-500 to-primary flex items-center justify-center shadow-lg shadow-primary/40 group-hover:shadow-xl group-hover:shadow-primary/60 transition-all`}
                    style={{
                        animation: "gradient-shift 6s ease infinite",
                        backgroundSize: "200% 200%",
                    }}
                >
                    <Flame className={`${s.icon} text-white fill-current drop-shadow-lg`} />

                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {/* Text with gradient */}
            <span
                className={`font-display font-bold ${s.text} tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground group-hover:from-primary group-hover:to-secondary transition-all`}
            >
                Shiftify
            </span>
        </Link>
    );
}
