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
        <Link href="/" className="flex items-center gap-3 group px-2 py-1">
            {/* Animated gradient border container */}
            <div className="relative">
                {/* Rotating gradient ring - Vibrant Mix (Blue -> Fuchsia -> Amber) */}
                <div
                    className={`absolute -inset-0.5 rounded-xl opacity-75 blur-sm group-hover:opacity-100 transition-opacity`}
                    style={{
                        background: "linear-gradient(135deg, #3b82f6, #d946ef, #f59e0b, #3b82f6)",
                        backgroundSize: "300% 300%",
                        animation: "gradient-shift 4s ease infinite, spin-slow 8s linear infinite",
                    }}
                />

                {/* Inner logo container */}
                <div
                    className={`relative ${s.box} rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/40 transition-all overflow-hidden`}
                >
                    {/* Inner gradient fill - Blue to Fuchsia */}
                    <div
                        className="absolute inset-0 bg-gradient-to-br from-blue-500 to-fuchsia-500 opacity-90"
                        style={{
                            clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)"
                        }}
                    />

                    {/* Icon */}
                    <Flame className={`relative z-10 ${s.icon} text-white fill-current drop-shadow-sm`} />

                    {/* Hover flame animation inside - Warm Amber/Fuchsia */}
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-amber-500 via-fuchsia-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{
                            mixBlendMode: "overlay",
                            filter: "blur(4px)"
                        }}
                    />
                </div>
            </div>

            {/* Text with hover effect - Blue -> Fuchsia -> Amber */}
            <span
                className={`font-display font-bold ${s.text} tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:via-fuchsia-500 group-hover:to-amber-500 transition-all duration-300`}
            >
                Shiftify
            </span>
        </Link>
    );
}
