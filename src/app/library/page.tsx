"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, History, ListFilter, FileDown, ListChecks, Lock, Shield } from "lucide-react";

import PageLayout from "@/components/PageLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const list = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const libraryFeatures = [
  {
    icon: History,
    title: "Incremental Backups",
    description: "Scheduled exports with diffs and restore points.",
    gradient: "from-blue-500/15 to-transparent",
  },
  {
    icon: ListFilter,
    title: "Cleanup Tools",
    description: "Find duplicates, dead links, and bulk fixes.",
    gradient: "from-fuchsia-500/15 to-transparent",
  },
  {
    icon: FileDown,
    title: "Export Packs",
    description: "Bundle JSON, CSV, and M3U with playlist metadata.",
    gradient: "from-amber-500/15 to-transparent",
  },
  {
    icon: ListChecks,
    title: "Playlist Rules",
    description: "Constraints like BPM range, explicit filter, or artist caps.",
    gradient: "from-blue-500/10 to-fuchsia-500/10",
  },
  {
    icon: Lock,
    title: "Private Rooms",
    description: "Passcodes, participant limits, and audit logs.",
    gradient: "from-fuchsia-500/10 to-amber-500/10",
  },
];

const protectionStack = [
  "Integrity scans before every export",
  "Diff timelines with point-in-time restore",
  "Audit-ready change history per playlist",
  "Offline vault bundles for long-term storage",
];

export default function LibraryPage() {
  return (
    <PageLayout>
      <section className="relative py-20">
        <div className="absolute inset-0 alive-lines opacity-15 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Library + Pro
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white">
            Own your library end to end
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Shiftify keeps your library clean, backed up, and protected with pro-grade tools built for long-term curation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/transfer">
              <Button size="lg">
                Start a Backup <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/party">
              <Button variant="outline" size="lg">
                Open Party Mode
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 border-t border-white/5">
        <motion.div
          variants={list}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {libraryFeatures.map((feature) => (
            <motion.div key={feature.title} variants={listItem}>
              <Card className="h-full p-6 group relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="h-px w-12 bg-gradient-to-r from-amber-400/60 to-transparent" />
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <Card variant="elevated" className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold">Protection Stack</h3>
                <p className="text-sm text-muted-foreground">Built for long-term library care.</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {protectionStack.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {item}
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Pro Library
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
              Guard every playlist
            </h2>
            <p className="text-muted-foreground">
              Archive your sets, enforce rules, and keep a clean export trail for every playlist that matters.
            </p>
            <Link href="/transfer">
              <Button size="lg" variant="secondary">
                Start a Transfer <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
