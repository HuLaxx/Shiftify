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
    bg-gradient-to-r from-sky-600 via-blue-700 to-amber-600
    text-white font-semibold
    shadow-lg shadow-sky-600/25
    hover:shadow-xl hover:shadow-sky-600/40
    hover:scale-[1.02] active:scale-[0.98]
  `,
    secondary: `
    bg-gradient-to-r from-fuchsia-700 via-pink-700 to-amber-600
    text-white font-medium
    shadow-lg shadow-fuchsia-600/25
    hover:shadow-xl hover:shadow-fuchsia-600/40
    hover:scale-[1.02] active:scale-[0.98]
  `,
    ghost: `
    bg-transparent text-white/80
    hover:bg-white/10 hover:text-white
    active:scale-[0.98]
  `,
    outline: `
    bg-white/5 border border-white/30
    text-white/85 font-medium
    hover:border-white/60 hover:bg-white/15
    hover:text-white active:scale-[0.98]
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
