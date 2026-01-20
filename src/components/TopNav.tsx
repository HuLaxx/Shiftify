"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";

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
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-white/80 shadow-sm shadow-black/10 transition-transform group-hover:-translate-y-0.5">
          <Flame className="h-4 w-4 text-foreground" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-foreground">
            Shiftify
          </p>
        </div>
      </Link>

      <nav className="flex flex-wrap items-center gap-1 rounded-full border border-foreground/10 bg-white/70 p-1 shadow-sm backdrop-blur-md">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] rounded-full transition-colors ${active ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
