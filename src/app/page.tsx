"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Flame,
  Layout,
  Music2,
  ListMusic,
  Fingerprint,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

export default function Home() {
  return (
    <main className="relative min-h-screen px-6 py-12 lg:px-12 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[520px] h-[520px] bg-primary/15 rounded-full blur-[160px] animate-float opacity-70" />
        <div className="absolute top-[10%] right-[-10%] w-[420px] h-[420px] bg-secondary/20 rounded-full blur-[160px] animate-float opacity-60" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-[-20%] left-[30%] w-[560px] h-[560px] bg-accent/10 rounded-full blur-[200px] animate-float opacity-40" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-32">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-foreground/15 bg-white/80 shadow-sm shadow-black/10">
              <Flame className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-display font-semibold text-xl tracking-tight text-foreground">Shiftify</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 rounded-full border border-foreground/10 bg-white/70 px-2 py-1 shadow-sm backdrop-blur-md">
            {[
              { href: "/transfer", label: "Transfer" },
              { href: "/import", label: "Import" },
              { href: "/review", label: "Review" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-foreground/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => window.open("https://github.com", "_blank")}>
            GitHub
          </Button>
        </header>

        {/* Hero */}
        <section className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/10 bg-white/70 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Privacy First Transfer
            </motion.div>

            <motion.h1 variants={item} className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.92] text-foreground">
              Move your <br />
              <span className="text-primary">music library</span> with calm precision.
            </motion.h1>

            <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Seamlessly transfer your YouTube Music library and Liked Songs with a secure, cookie-first workflow. No API keys required.
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap gap-4">
              <Link href="/transfer">
                <Button size="lg" className="group">
                  Start Transfer
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/import">
                <Button variant="outline" size="lg">
                  Import Data
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/20 rounded-[2rem] blur-3xl -z-10" />
            <Card className="border border-foreground/10 bg-white/85 backdrop-blur-xl p-0 overflow-hidden shadow-[0_40px_90px_rgba(20,18,14,0.16)]">
              <div className="p-6 border-b border-foreground/10 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-foreground/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-foreground/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-foreground/20" />
                </div>
                <div className="text-xs font-mono text-muted-foreground">Transfer Brief</div>
              </div>
              <div className="p-8 space-y-6">
                {[
                  { step: 1, label: "Analyzing Source Cookies", icon: Fingerprint, color: "text-primary" },
                  { step: 2, label: "Fetching Liked Songs", icon: Music2, color: "text-accent" },
                  { step: 3, label: "Matching Metadata", icon: Layout, color: "text-secondary" },
                  { step: 4, label: "Migrating Playlist", icon: ListMusic, color: "text-foreground" }
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.2 }}
                    className="flex items-center gap-4 group"
                  >
                    <div className={`p-3 rounded-xl bg-foreground/5 border border-foreground/10 group-hover:bg-foreground/10 transition-colors ${s.color}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{s.label}</div>
                      <div className="text-xs text-muted-foreground">Processing segment {i + 1024}...</div>
                    </div>
                    {i < 3 && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    {i === 3 && <div className="w-4 h-4 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />}
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Features Minimal */}
        <section className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Cookie-Based", desc: "No complex OAuth setup. Just use your browser cookies for secure access." },
            { title: "Deep Diagnostics", desc: "Full visibility into every track match, failure, and retry attempt." },
            { title: "No Data Loss", desc: "Automatic export of failed transfers ensures you never lose a song." }
          ].map((f, i) => (
            <Card key={i} className="group">
              <h3 className="text-xl font-display font-semibold mb-3 group-hover:text-primary transition-colors text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
