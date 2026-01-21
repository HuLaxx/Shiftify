"use client";

import { ReactNode, MouseEvent } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit" | "reset";
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: `
    bg-gradient-to-r from-primary to-orange-500
    text-primary-foreground font-semibold
    shadow-lg shadow-primary/25
    hover:shadow-xl hover:shadow-primary/40
    hover:scale-[1.02] active:scale-[0.98]
  `,
    secondary: `
    bg-gradient-to-r from-secondary/80 to-purple-600/80
    text-secondary-foreground font-medium
    shadow-lg shadow-secondary/20
    hover:shadow-xl hover:shadow-secondary/30
    hover:scale-[1.02] active:scale-[0.98]
  `,
    ghost: `
    bg-transparent text-foreground/70
    hover:bg-white/5 hover:text-foreground
    active:scale-[0.98]
  `,
    outline: `
    bg-transparent border border-white/20
    text-foreground/80 font-medium
    hover:border-white/40 hover:bg-white/5
    hover:text-foreground active:scale-[0.98]
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
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
    type = "button",
    onClick,
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            onClick={onClick}
            className={`
        inline-flex items-center justify-center
        transition-all duration-300 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
        >
            {isLoading ? (
                <>
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span className="ml-2">Loading...</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}
