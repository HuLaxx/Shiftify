"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Zap,
  Music2,
  Download,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageLayout from "@/components/PageLayout";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const features = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Cookie-based authentication. Your data never leaves your browser.",
    gradient: "from-blue-500/20 to-fuchsia-500/5",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized transfer protocol with automatic retry and recovery.",
    gradient: "from-fuchsia-500/20 to-amber-500/5",
  },
  {
    icon: Download,
    title: "Full Export",
    description: "Export failed transfers as CSV. Never lose a single track.",
    gradient: "from-amber-500/20 to-blue-500/5",
  },
];

const stats = [
  { value: "10K+", label: "Tracks Transferred" },
  { value: "100%", label: "Privacy Focused" },
  { value: "0", label: "API Keys Required" },
];

export default function Home() {
  return (
    <PageLayout
      orbConfig={[
        { color: "primary", position: "top-[-30%] left-[-20%]", size: "xl" },
        { color: "secondary", position: "top-[20%] right-[-15%]", size: "lg" },
        { color: "accent", position: "bottom-[-10%] left-[30%]", size: "md" },
      ]}
    >
      {/* Hero Section */}
      <section className="min-h-[80vh] flex items-center py-20 relative">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-4xl mx-auto w-full text-center space-y-8"
        >
          {/* Badge */}
          <motion.div variants={item} className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/10">
              <Shield className="w-4 h-4" />
              Privacy-First Music Transfer
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={item} className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white leading-tight">
              Move your music <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-fuchsia-400 to-amber-400 animate-gradient">
                without limits
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transfer your playlists and liked songs from YouTube Music to a CSV report. Open source, secure, and running entirely in your browser.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/transfer">
              <Button size="lg" className="shadow-lg shadow-blue-500/25">
                Start Transfer <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/import">
              <Button variant="outline" size="lg">
                Import from Text
              </Button>
            </Link>
          </motion.div>

          {/* Stats Bar */}
          <motion.div variants={item} className="pt-20">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 p-6 rounded-2xl glass border-white/5">
              {stats.map((stat, i) => (
                <div key={i} className="text-center space-y-1">
                  <div className="text-3xl font-display font-bold text-white tracking-tight" suppressHydrationWarning>{stat.value}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Preview Section */}
      <section className="py-24 relative">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-display font-bold text-white">Why Shiftify?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built for music lovers who care about their data ownership.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full p-8 group hover:bg-white/[0.07] transition-colors relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Transfer Preview Section */}
      <section className="py-24 border-t border-white/5">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-display font-bold leading-tight text-white">
              Visual Transfer <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-fuchsia-400">Control Center</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Watch your transfer in real-time with our terminal-inspired interface. Verify every track, retry failed items, and export detailed reports.
            </p>
            <div className="space-y-4">
              {[
                "Batch processing for large playlists",
                "Fuzzy search fallback for better matching",
                "Export complete history to CSV/JSON"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Music2 className="w-3 h-3 text-blue-400" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
            <Link href="/transfer">
              <Button size="lg" variant="secondary" className="mt-4">
                Launch App
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-fuchsia-500/20 blur-2xl rounded-3xl" />
            <Card variant="glow" className="relative p-6 bg-black/40 backdrop-blur-xl border-white/10">
              {/* Mock UI */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-xs font-mono text-muted-foreground">shiftify-cli — v2.0</div>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="text-green-400">$ init transfer --source=ytm</div>
                <div className="text-muted-foreground">Connecting to source... <span className="text-blue-400">Connected</span></div>
                <div className="text-muted-foreground">Fetching playlist 'Driving Vibes'... <span className="text-fuchsia-400">142 tracks found</span></div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-4">
                  <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 to-fuchsia-500" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Progress: 67%</span>
                  <span>92/142 Success</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </PageLayout>
  );
}
