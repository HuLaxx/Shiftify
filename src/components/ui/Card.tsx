"use client";

import { ReactNode } from "react";

type CardVariant = "default" | "elevated" | "glow";

interface CardProps {
    children: ReactNode;
    variant?: CardVariant;
    hoverEffect?: boolean;
    className?: string;
}

const variantStyles: Record<CardVariant, string> = {
    default: "glass-card",
    elevated: "glass-card shadow-2xl shadow-black/50",
    glow: "glass-card shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20",
};

export default function Card({
    children,
    variant = "default",
    hoverEffect = true,
    className = "",
}: CardProps) {
    const hoverStyles = hoverEffect
        ? "transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/15"
        : "";

    return (
        <div
            className={`
        rounded-2xl p-6
        ${variantStyles[variant]}
        ${hoverStyles}
        ${className}
      `}
        >
            {children}
        </div>
    );
}
