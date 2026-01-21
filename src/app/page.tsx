"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Flame,
  Shield,
  Zap,
  Music2,
  Download,
  Sparkles,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import GlowOrb from "@/components/ui/GlowOrb";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const features = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Cookie-based authentication. Your data never leaves your browser.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized transfer protocol with automatic retry and recovery.",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Download,
    title: "Full Export",
    description: "Export failed transfers as CSV. Never lose a single track.",
    gradient: "from-secondary/20 to-secondary/5",
  },
];

const stats = [
  { value: "10K+", label: "Tracks Transferred" },
  { value: "100%", label: "Privacy Focused" },
  { value: "0", label: "API Keys Required" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <GlowOrb color="primary" size="xl" className="top-[-30%] left-[-20%]" delay={0} />
        <GlowOrb color="secondary" size="lg" className="top-[20%] right-[-15%]" delay={1} />
        <GlowOrb color="accent" size="md" className="bottom-[-10%] left-[30%]" delay={2} />
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 lg:px-12 py-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/50 transition-all">
              <Flame className="w-6 h-6 text-white fill-current" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">Shiftify</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {["Transfer", "Import", "Review", "Runs"].map((label) => (
              <Link
                key={label}
                href={`/${label.toLowerCase()}`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <Link
            href="https://github.com/HuLaxx/Shiftify"
            target="_blank"
            className="px-4 py-2 text-sm font-medium border border-white/10 rounded-full hover:border-white/25 hover:bg-white/5 transition-all"
          >
            GitHub
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="min-h-[90vh] flex items-center px-6 lg:px-12 py-20">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-7xl mx-auto w-full"
          >
            {/* Badge */}
            <motion.div variants={item} className="mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                Privacy-First Music Transfer
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              variants={item}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-display font-bold leading-[0.9] tracking-tight mb-8"
            >
              Move your
              <br />
              <span className="text-gradient">music soul.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={item}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed mb-12"
            >
              Seamlessly transfer your YouTube Music library and Liked Songs
              using a secure, cookie-based workflow.{" "}
              <span className="text-foreground font-medium">No API keys required.</span>
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={item} className="flex flex-wrap gap-4 mb-20">
              <Link href="/transfer">
                <Button size="lg" className="group">
                  Start Transfer
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/import">
                <Button variant="outline" size="lg">
                  Import Playlist
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={item}
              className="flex flex-wrap gap-12 md:gap-20"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-4xl md:text-5xl font-display font-bold text-gradient mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="px-6 lg:px-12 py-24">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Built for <span className="text-gradient">power users</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Everything you need to migrate your music library with confidence.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card variant="elevated" className="h-full group">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <h3 className="text-xl font-display font-semibold mb-3 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Transfer Preview Section */}
        <section className="px-6 lg:px-12 py-24">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Card variant="glow" className="p-0 overflow-hidden">
                {/* Window Chrome */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/30" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
                    <div className="w-3 h-3 rounded-full bg-green-500/30" />
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    Transfer Protocol v2.0
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                  {[
                    { step: 1, label: "Analyzing Cookies", status: "complete", color: "text-primary" },
                    { step: 2, label: "Fetching Liked Songs", status: "complete", color: "text-accent" },
                    { step: 3, label: "Matching Metadata", status: "complete", color: "text-secondary" },
                    { step: 4, label: "Transferring Tracks", status: "active", color: "text-foreground" },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.15 }}
                      className="flex items-center gap-4"
                    >
                      <div className={`w-10 h-10 rounded-xl glass flex items-center justify-center ${s.color}`}>
                        <Music2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.status === "active" ? "In progress..." : "Completed"}
                        </div>
                      </div>
                      {s.status === "complete" && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                      {s.status === "active" && (
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 lg:px-12 py-24">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                Ready to <span className="text-gradient">shift</span> your music?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Start your transfer now. It only takes a few minutes.
              </p>
              <Link href="/transfer">
                <Button size="lg" className="group">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 lg:px-12 py-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Flame className="w-4 h-4 text-primary" />
              <span>Shiftify — Built with privacy in mind</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/transfer" className="hover:text-foreground transition-colors">Transfer</Link>
              <Link href="/import" className="hover:text-foreground transition-colors">Import</Link>
              <Link href="https://github.com/HuLaxx/Shiftify" target="_blank" className="hover:text-foreground transition-colors">GitHub</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
