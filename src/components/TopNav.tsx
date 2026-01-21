"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";

const navLinks = [
  { href: "/transfer", label: "Transfer" },
  { href: "/import", label: "Import" },
  { href: "/review", label: "Review" },
  { href: "/runs", label: "Runs" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between mb-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/40 transition-shadow">
          <Flame className="w-5 h-5 text-white fill-current" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <span className="font-display font-semibold text-xl text-foreground tracking-tight">
          Shiftify
        </span>
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-full glass">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200
                ${isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {isActive && (
                <span className="absolute inset-0 bg-white/10 rounded-full" />
              )}
              <span className="relative">{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* GitHub Link */}
      <Link
        href="https://github.com/HuLaxx/Shiftify"
        target="_blank"
        className="px-4 py-2 text-sm font-medium text-muted-foreground border border-white/10 rounded-full hover:border-white/20 hover:text-foreground hover:bg-white/5 transition-all"
      >
        GitHub
      </Link>
    </nav>
  );
}
