"use client";

import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
}

export default function Card({ children, className = "", hoverEffect = true, ...props }: CardProps) {
    const hoverStyles = hoverEffect
        ? "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(22,19,15,0.16)]"
        : "";

    return (
        <div className={`glass-card rounded-3xl p-6 ${hoverStyles} ${className}`} {...props}>
            {children}
        </div>
    );
}
