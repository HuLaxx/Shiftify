"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { href: "/", label: "Home" },
  { href: "/transfer", label: "Transfer" },
  { href: "/import", label: "Import" },
  { href: "/review", label: "Review" },
  { href: "/runs", label: "Runs" },
];

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-4 mb-8">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
          <Flame className="h-4 w-4 text-white fill-current" />
        </div>
        <div>
          <p className="font-display text-lg font-medium tracking-tight text-white group-hover:text-primary transition-colors">
            Shiftify
          </p>
        </div>
      </Link>

      <nav className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 z-10 ${active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-white/10 rounded-full border border-white/10 -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
