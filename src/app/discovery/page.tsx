"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shuffle, Sparkles, ListMusic, Users, MicVocal, Radio } from "lucide-react";

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

const discoveryFeatures = [
  {
    icon: Shuffle,
    title: "Auto-DJ",
    description: "Crossfade sets with energy curves and smart transitions.",
    gradient: "from-blue-500/15 to-transparent",
  },
  {
    icon: Sparkles,
    title: "Mood Mixes",
    description: "Build playlists by mood, BPM, era, or time of day.",
    gradient: "from-fuchsia-500/15 to-transparent",
  },
  {
    icon: ListMusic,
    title: "Setlist Builder",
    description: "Target duration and energy arc for events and sets.",
    gradient: "from-amber-500/15 to-transparent",
  },
  {
    icon: Users,
    title: "Taste Match",
    description: "Compare listeners and generate a shared queue.",
    gradient: "from-blue-500/10 to-fuchsia-500/10",
  },
  {
    icon: MicVocal,
    title: "Lyric Mode",
    description: "Sync lyrics and highlight chorus moments for sing-alongs.",
    gradient: "from-fuchsia-500/10 to-amber-500/10",
  },
];

const flowSteps = [
  {
    title: "Crowd profile",
    detail: "Map overlap and outliers to avoid jarring pivots mid-set.",
  },
  {
    title: "Tension arcs",
    detail: "Balance peaks, resets, and long climbs without manual swaps.",
  },
  {
    title: "Transition guardrails",
    detail: "Guard against BPM jumps and tone clashes before they happen.",
  },
];

export default function DiscoveryPage() {
  return (
    <PageLayout>
      <section className="relative py-20">
        <div className="absolute inset-0 alive-lines opacity-15 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Discovery
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white">
            Mix smarter. Keep the flow.
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Shiftify Discovery turns listeners into a shared taste map, then builds an energy-aware mix that stays on tempo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/party">
              <Button size="lg">
                Start a Room <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/transfer">
              <Button variant="outline" size="lg">
                Move Your Library
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
          {discoveryFeatures.map((feature) => (
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
                  <div className="h-px w-12 bg-gradient-to-r from-fuchsia-400/60 to-transparent" />
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Mix Flow
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
              Curate without friction
            </h2>
            <p className="text-muted-foreground">
              Auto-DJ, Mood Mixes, and Taste Match work together to keep the crowd engaged without constant manual edits.
            </p>
            <div className="space-y-4">
              {flowSteps.map((step) => (
                <div key={step.title} className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="text-white font-semibold">{step.title}</div>
                  <div className="text-sm text-muted-foreground">{step.detail}</div>
                </div>
              ))}
            </div>
          </div>
          <Card variant="elevated" className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-display font-semibold">Live Discovery</h3>
                <p className="text-sm text-muted-foreground">Designed for rooms, crews, and shared sessions.</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Energy curve auto-balances peaks and cooldowns.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
                Mood filters keep BPM and tone consistent.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Shared taste map removes harsh transitions.
              </div>
            </div>
          </Card>
        </div>
      </section>
    </PageLayout>
  );
}
