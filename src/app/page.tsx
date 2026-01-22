"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Zap,
  Music2,
  Download,
  Users,
  Radio,
  Video,
  ThumbsUp,
  Crown,
  QrCode,
  Shuffle,
  Sparkles,
  ListMusic,
  MicVocal,
  History,
  ListFilter,
  FileDown,
  ListChecks,
  Lock,
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

const heroSlides = [
  {
    id: "transfer",
    badgeIcon: Shield,
    badgeLabel: "Transfer Engine",
    heroTitle: "Move your music",
    heroAccent: "without limits",
    heroDescription: "Transfer playlists and liked songs with full local control. Export clean packs and keep your data in your browser.",
    heroGradient: "from-blue-400 via-fuchsia-400 to-amber-400",
    primaryCta: { label: "Start Transfer", href: "/transfer" },
    secondaryCta: { label: "Transfer Tools", href: "/transfer#tools" },
    stats: [
      { value: "10K+", label: "Tracks Moved" },
      { value: "0", label: "API Keys" },
      { value: "100%", label: "Local Runs" },
    ],
    icon: Download,
    eyebrow: "Transfer Engine",
    title: "Move libraries with full control",
    description: "Track every song, export clean packs, and keep ownership in your browser.",
    bullets: [
      "Live run console with retry",
      "CSV/JSON/M3U export packs",
      "Cookie auth, no API keys",
    ],
    ctaLabel: "Start Transfer",
    ctaHref: "/transfer",
    gradient: "from-blue-500/30 via-fuchsia-500/10 to-transparent",
  },
  {
    id: "party",
    badgeIcon: Radio,
    badgeLabel: "Party Mode",
    heroTitle: "Run the room",
    heroAccent: "stay in sync",
    heroDescription: "Spin a room code, sync YouTube playback, and let the crowd steer the queue.",
    heroGradient: "from-fuchsia-400 via-amber-400 to-blue-400",
    primaryCta: { label: "Open Party Mode", href: "/party" },
    secondaryCta: { label: "See Party Features", href: "/party#features" },
    stats: [
      { value: "Live", label: "Room Sync" },
      { value: "<2s", label: "Drift Fix" },
      { value: "+Votes", label: "Queue Control" },
    ],
    icon: Radio,
    eyebrow: "Party Mode",
    title: "Rooms that move together",
    description: "Sync the room, vote the queue, and react in real time.",
    bullets: [
      "Room sync with latency tuning",
      "Queue voting with auto-skip",
      "Chat and emoji reactions",
    ],
    ctaLabel: "Open Party Room",
    ctaHref: "/party",
    gradient: "from-fuchsia-500/30 via-amber-500/10 to-transparent",
  },
  {
    id: "discovery",
    badgeIcon: Shuffle,
    badgeLabel: "Discovery",
    heroTitle: "Mix smarter",
    heroAccent: "feel the flow",
    heroDescription: "Auto-DJ sets with energy curves, mood filters, and taste matches.",
    heroGradient: "from-amber-400 via-blue-400 to-fuchsia-400",
    primaryCta: { label: "Explore Discovery", href: "/discovery" },
    secondaryCta: { label: "See Party Mode", href: "/party" },
    stats: [
      { value: "Auto-DJ", label: "Energy Curves" },
      { value: "Mood", label: "Mix Filters" },
      { value: "Match", label: "Shared Taste" },
    ],
    icon: Shuffle,
    eyebrow: "Discovery",
    title: "Energy-aware mixes",
    description: "Auto-DJ your sets with mood, BPM, and shared taste logic.",
    bullets: [
      "Auto-DJ crossfade lanes",
      "Mood mixes by BPM and era",
      "Taste match playlists",
    ],
    ctaLabel: "See Discovery",
    ctaHref: "/discovery#features",
    gradient: "from-amber-500/25 via-blue-500/10 to-transparent",
  },
  {
    id: "library",
    badgeIcon: Lock,
    badgeLabel: "Library + Pro",
    heroTitle: "Own your library",
    heroAccent: "keep it pristine",
    heroDescription: "Back up, clean, and lock down playlists with rules and audit-ready exports.",
    heroGradient: "from-blue-400 via-amber-400 to-fuchsia-400",
    primaryCta: { label: "See Library Tools", href: "/library" },
    secondaryCta: { label: "Start Transfer", href: "/transfer" },
    stats: [
      { value: "Backups", label: "Restore Points" },
      { value: "Rules", label: "Playlist Limits" },
      { value: "Private", label: "Room Locks" },
    ],
    icon: Lock,
    eyebrow: "Library + Pro",
    title: "Own every playlist",
    description: "Back up, clean, export, and protect the sets you care about.",
    bullets: [
      "Backup snapshots and restore",
      "Cleanup duplicates and dead links",
      "Private rooms with audit logs",
    ],
    ctaLabel: "See Library",
    ctaHref: "/library#features",
    gradient: "from-blue-500/25 via-fuchsia-500/10 to-transparent",
  },
];

const partyFeatures = [
  {
    icon: Radio,
    title: "Room Sync",
    description: "Room codes, host roles, drift correction, and latency tuning.",
    gradient: "from-blue-500/20 to-transparent",
  },
  {
    icon: Video,
    title: "Watch Party",
    description: "Sync YouTube playback with chat, reactions, and emoji bursts.",
    gradient: "from-fuchsia-500/20 to-transparent",
  },
  {
    icon: ThumbsUp,
    title: "Queue Voting",
    description: "Guests upvote or downvote tracks. Auto-skip on consensus.",
    gradient: "from-amber-500/20 to-transparent",
  },
  {
    icon: Crown,
    title: "DJ Handoff",
    description: "Rotate hosts or run co-DJ sessions with permissions.",
    gradient: "from-blue-500/10 to-fuchsia-500/10",
  },
  {
    icon: QrCode,
    title: "QR Join",
    description: "One tap join, invite links, and room expiry controls.",
    gradient: "from-fuchsia-500/10 to-amber-500/10",
  },
];

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

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slideCount = heroSlides.length;
  const currentSlide = heroSlides[activeSlide];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((index) => (index + 1) % slideCount);
    }, 6500);
    return () => clearInterval(interval);
  }, [slideCount]);

  return (
    <PageLayout
      orbConfig={[
        { color: "primary", position: "top-[-30%] left-[-20%]", size: "xl" },
        { color: "secondary", position: "top-[20%] right-[-15%]", size: "lg" },
        { color: "accent", position: "bottom-[-10%] left-[30%]", size: "md" },
      ]}
    >
      {/* Hero Section */}
      <section className="min-h-[80vh] lg:min-h-[85vh] flex items-center pt-16 pb-24 lg:pt-20 lg:pb-28 relative">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-6xl mx-auto w-full grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center"
        >
          <div className="space-y-8 text-center lg:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div className="flex justify-center lg:justify-start">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/10">
                    <currentSlide.badgeIcon className="w-4 h-4" />
                    {currentSlide.badgeLabel}
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white leading-tight">
                    {currentSlide.heroTitle} <br />
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r ${currentSlide.heroGradient} animate-gradient`}>
                      {currentSlide.heroAccent}
                    </span>
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    {currentSlide.heroDescription}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <Link href={currentSlide.primaryCta.href}>
                    <Button size="lg" className="shadow-lg shadow-primary/25">
                      {currentSlide.primaryCta.label} <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  {currentSlide.secondaryCta && (
                    <Link href={currentSlide.secondaryCta.href}>
                      <Button variant="outline" size="lg">
                        {currentSlide.secondaryCta.label}
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="pt-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 p-6 rounded-2xl glass border-white/5">
                    {currentSlide.stats.map((stat) => (
                      <div key={`${currentSlide.id}-${stat.label}`} className="text-center lg:text-left space-y-1">
                        <div className="text-3xl font-display font-bold text-white tracking-tight" suppressHydrationWarning>{stat.value}</div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div variants={item} className="relative">
            <div className={`absolute -inset-6 bg-gradient-to-br ${currentSlide.gradient} blur-3xl opacity-70`} />
            <Card variant="glow" hoverEffect={false} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${currentSlide.gradient} opacity-70`} />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                    {currentSlide.eyebrow}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <currentSlide.icon className="w-5 h-5" />
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                  >
                    <h3 className="text-2xl md:text-3xl font-display font-semibold text-white">
                      {currentSlide.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {currentSlide.description}
                    </p>
                    <div className="space-y-2">
                      {currentSlide.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={currentSlide.ctaHref}>
                      <Button size="sm" variant="secondary">
                        {currentSlide.ctaLabel} <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>
            <div className="mt-4 flex items-center gap-2">
              {heroSlides.map((spotlight, index) => (
                <button
                  key={spotlight.id}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show ${spotlight.eyebrow}`}
                  className="group"
                >
                  <span
                    className={`block h-1.5 w-6 rounded-full transition-all ${index === activeSlide ? "bg-white" : "bg-white/20 group-hover:bg-white/40"}`}
                  />
                </button>
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
                <div className="text-muted-foreground">Fetching playlist &apos;Driving Vibes&apos;... <span className="text-fuchsia-400">142 tracks found</span></div>
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

      {/* Party & Sharing */}
      <section id="party" className="py-24 relative">
        <div className="absolute inset-0 alive-lines opacity-20 pointer-events-none" />
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Party And Sharing
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Rooms that move together</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sync the room, vote the queue, and keep the party on tempo.
            </p>
          </motion.div>

          <motion.div
            variants={list}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {partyFeatures.map((feature) => (
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
                    <div className="h-px w-12 bg-gradient-to-r from-blue-400/60 to-transparent" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          <div className="flex justify-center pt-10">
            <Link href="/party">
              <Button size="lg" variant="secondary">
                Explore Party Mode <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Discovery & Playback */}
      <section id="discovery" className="py-24 relative border-t border-white/5">
        <div className="absolute inset-0 alive-lines opacity-10 pointer-events-none" />
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Discovery And Playback
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Mix smarter, not harder</h2>
            <p className="text-muted-foreground max-w-2xl">
              Let Shiftify shape the energy, find new matches, and keep the flow clean.
            </p>
          </motion.div>

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
          <div className="flex justify-center lg:justify-start pt-10">
            <Link href="/discovery">
              <Button size="lg" variant="secondary">
                Explore Discovery <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Library & Pro */}
      <section id="library" className="py-24 relative border-t border-white/5">
        <div className="absolute inset-0 alive-lines opacity-15 pointer-events-none" />
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Library And Pro
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Own the library</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Backup, clean, export, and protect every playlist you care about.
            </p>
          </motion.div>

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
          <div className="flex justify-center pt-10">
            <Link href="/library">
              <Button size="lg" variant="secondary">
                Explore Library Tools <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </PageLayout>
  );
}
