"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
    primary: `
    bg-gradient-to-r from-primary to-orange-500
    text-primary-foreground font-semibold
    shadow-lg shadow-primary/25
    hover:shadow-xl hover:shadow-primary/40
    hover:scale-[1.02]
  `,
    secondary: `
    bg-gradient-to-r from-secondary/80 to-purple-600/80
    text-secondary-foreground font-medium
    shadow-lg shadow-secondary/20
    hover:shadow-xl hover:shadow-secondary/30
    hover:scale-[1.02]
  `,
    ghost: `
    bg-transparent text-foreground/70
    hover:bg-white/5 hover:text-foreground
  `,
    outline: `
    bg-transparent border border-white/20
    text-foreground/80 font-medium
    hover:border-white/40 hover:bg-white/5
    hover:text-foreground
  `,
};

const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-5 py-2.5 text-sm rounded-xl gap-2",
    lg: "px-8 py-4 text-base rounded-2xl gap-2.5",
};

export default function Button({
    children,
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled,
    className = "",
    ...props
}: ButtonProps) {
    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={disabled || isLoading}
            className={`
        inline-flex items-center justify-center
        transition-all duration-300 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
            {...props}
        >
            {isLoading ? (
                <>
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span className="ml-2">Loading...</span>
                </>
            ) : (
                children
            )}
        </motion.button>
    );
}
