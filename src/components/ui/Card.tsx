"use client";

import { motion } from "framer-motion";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
}

export default function Card({ children, className = "", hoverEffect = true, ...props }: CardProps) {
    return (
        <motion.div
            initial={hoverEffect ? { y: 0 } : undefined}
            whileHover={hoverEffect ? { y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" } : undefined}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`glass-card rounded-2xl p-6 ${className}`}
            {...props}
        >
            {children}
        </motion.div>
    );
}
