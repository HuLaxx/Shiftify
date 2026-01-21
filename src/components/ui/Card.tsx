"use client";

import { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";

type CardVariant = "default" | "elevated" | "glow";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    variant?: CardVariant;
    hoverEffect?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
    default: `
    glass-card
  `,
    elevated: `
    glass-card
    shadow-2xl shadow-black/50
  `,
    glow: `
    glass-card
    shadow-lg shadow-primary/10
    hover:shadow-xl hover:shadow-primary/20
  `,
};

export default function Card({
    children,
    variant = "default",
    hoverEffect = true,
    className = "",
    ...props
}: CardProps) {
    const hoverStyles = hoverEffect
        ? "transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/15"
        : "";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`
        rounded-2xl p-6
        ${variantStyles[variant]}
        ${hoverStyles}
        ${className}
      `}
            {...props}
        >
            {children}
        </motion.div>
    );
}
