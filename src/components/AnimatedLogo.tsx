"use client";

import Link from "next/link";
import { useId } from "react";

export default function AnimatedLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const gradientId = useId().replace(/:/g, "");
    const sizes = {
        sm: { box: "w-9 h-9", icon: "w-4 h-4", text: "text-lg" },
        md: { box: "w-11 h-11", icon: "w-5 h-5", text: "text-xl" },
        lg: { box: "w-14 h-14", icon: "w-6 h-6", text: "text-2xl" },
    };

    const s = sizes[size];

    return (
        <Link href="/" className="flex items-center gap-3 group px-2 py-1">
            <div className="relative">
                <div
                    className="absolute -inset-1 rounded-2xl opacity-70 blur-md group-hover:opacity-100 transition-opacity"
                    style={{
                        background: "conic-gradient(from 90deg, #38bdf8, #a855f7, #f59e0b, #38bdf8)",
                        animation: "spin-slow 10s linear infinite",
                    }}
                />

                <div
                    className={`relative ${s.box} rounded-2xl bg-slate-950/90 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40 group-hover:shadow-primary/30 transition-all overflow-hidden`}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            background: "linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0) 55%)",
                        }}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background: "radial-gradient(circle at 30% 20%, rgba(56,189,248,0.35), transparent 60%)",
                        }}
                    />
                    <svg
                        viewBox="0 0 24 24"
                        className={`relative z-10 ${s.icon}`}
                        style={{
                            filter: "drop-shadow(0 2px 8px rgba(56,189,248,0.35))",
                        }}
                        aria-hidden="true"
                    >
                        <defs>
                            <linearGradient id={`${gradientId}-pulse`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" />
                                <stop offset="55%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#f59e0b" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M10 7.6L16.4 11.4L10 15.2V7.6Z"
                            fill={`url(#${gradientId}-pulse)`}
                        />
                        <path
                            d="M4.6 15.5C6.8 12.6 9.3 11.1 12 11.1C14.7 11.1 17.2 12.6 19.4 15.5"
                            stroke={`url(#${gradientId}-pulse)`}
                            strokeWidth="1.7"
                            strokeLinecap="round"
                        />
                        <path
                            d="M7.3 15.5C8.7 13.8 10.2 13 12 13C13.8 13 15.3 13.8 16.7 15.5"
                            stroke={`url(#${gradientId}-pulse)`}
                            strokeWidth="1.7"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
            </div>

            <span
                className={`font-display font-bold ${s.text} tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:via-fuchsia-400 group-hover:to-amber-400 transition-all duration-300`}
            >
                Shiftify
            </span>
        </Link>
    );
}
