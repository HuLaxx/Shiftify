"use client";

import { motion } from "framer-motion";

interface GlowOrbProps {
    color?: "primary" | "secondary" | "accent";
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    delay?: number;
}

const colors = {
    primary: "bg-primary/30",
    secondary: "bg-secondary/25",
    accent: "bg-accent/20",
};

const sizes = {
    sm: "w-[200px] h-[200px]",
    md: "w-[400px] h-[400px]",
    lg: "w-[600px] h-[600px]",
    xl: "w-[800px] h-[800px]",
};

const blurs = {
    sm: "blur-[60px]",
    md: "blur-[100px]",
    lg: "blur-[140px]",
    xl: "blur-[180px]",
};

export default function GlowOrb({
    color = "primary",
    size = "md",
    className = "",
    delay = 0,
}: GlowOrbProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay, ease: "easeOut" }}
            className={`
        absolute rounded-full pointer-events-none
        ${colors[color]}
        ${sizes[size]}
        ${blurs[size]}
        animate-float
        ${className}
      `}
            style={{ animationDelay: `${delay}s` }}
        />
    );
}
