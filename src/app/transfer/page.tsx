"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Music2,
  ArrowLeft,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageLayout from "@/components/PageLayout";

// --- Types ---

type PlaylistItem = {
  id: string;
  title: string;
  subtitle?: string;
};

type TrackItem = {
  title: string;
  artist: string;
  videoId?: string | null;
};

type FailedEntry = {
  track: TrackItem;
  reason: string;
};

type PlaylistResponse = {
  playlists?: PlaylistItem[];
  authUser?: string;
  error?: string;
};

type TracksResponse = {
  tracks?: TrackItem[];
  authUser?: string;
  count?: number;
  error?: string;
};

type VerifyResponse = {
  ok?: boolean;
  authUser?: string;
  error?: string;
};

type SearchResponse = {
  videoId?: string | null;
  error?: string;
};

// --- Constants ---

const steps = [
  { id: 1, label: "Source" },
  { id: 2, label: "Playlist" },
  { id: 3, label: "Destination" },
  { id: 4, label: "Transfer" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_DELAY_MS = 450;

// --- Main Component ---

export default function TransferPage() {
  const [step, setStep] = useState(1);

  // Source State
  const [sourceCookies, setSourceCookies] = useState("");
  const [sourceAuthUser, setSourceAuthUser] = useState("0");
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);

  // Playlist State
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);

  // Destination State
  const [destCookies, setDestCookies] = useState("");
  const [destAuthUser, setDestAuthUser] = useState("0");
  const [destVerified, setDestVerified] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);

  // Settings
  const [allowSearchFallback, setAllowSearchFallback] = useState(false);

  // Transfer State
  const [logs, setLogs] = useState<string[]>([]);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [transferStatus, setTransferStatus] = useState<"idle" | "running" | "stopped" | "done" | "error">("idle");

  const cancelRef = useRef(false);

  const selectedPlaylist = useMemo(
    () => playlists.find((item) => item.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId],
  );

  // --- Helpers ---

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`${time} ${message}`, ...prev]);
  };

  const searchVideoId = async (query: string) => {
    const res = await fetch("/api/ytm", {
      method: "POST",
      body: JSON.stringify({
        action: "search",
        cookies: destCookies,
        authUser: destAuthUser,
        params: { query },
      }),
    });
    const data = (await res.json()) as SearchResponse;
    if (data.error) throw new Error(data.error);
    return data.videoId ?? null;
  };

  const findVideoIdForTrack = async (track: TrackItem) => {
    const queries = [`${track.title} ${track.artist} audio`, `${track.title} ${track.artist}`, track.title];
    for (const query of queries) {
      const videoId = await searchVideoId(query);
      if (videoId) return videoId;
      await sleep(120);
    }
    return null;
  };

  const processTrack = async (track: TrackItem) => {
    try {
      let videoId = track.videoId ?? null;
      if (!videoId) {
        if (!allowSearchFallback) return { ok: false, reason: "Missing video ID." };
        videoId = await findVideoIdForTrack(track);
      }
      if (!videoId) return { ok: false, reason: "No match found." };

      const likeRes = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "like",
          cookies: destCookies,
          authUser: destAuthUser,
          params: { videoId },
        }),
      });
      const likeData = (await likeRes.json()) as { error?: string };
      if (likeData.error) throw new Error(likeData.error);
      return { ok: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Transfer error.";
      return { ok: false, reason: message };
    }
  };

  // --- API Actions ---

  const fetchPlaylists = async () => {
    setSourceLoading(true);
    setSourceError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({ action: "list_playlists", cookies: sourceCookies, authUser: sourceAuthUser }),
      });
      const data = (await res.json()) as PlaylistResponse;
      if (data.error) throw new Error(data.error);
      if (data.authUser && data.authUser !== sourceAuthUser) setSourceAuthUser(data.authUser);
      setPlaylists(data.playlists || []);
      setStep(2);
    } catch (error: unknown) {
      setSourceError(error instanceof Error ? error.message : "Failed to load playlists.");
    } finally {
      setSourceLoading(false);
    }
  };

  const fetchTracks = async () => {
    if (!selectedPlaylistId) return setTracksError("Pick a playlist.");
    setTracksLoading(true);
    setTracksError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({ action: "get_playlist_tracks", cookies: sourceCookies, authUser: sourceAuthUser, params: { id: selectedPlaylistId } }),
      });
      const data = (await res.json()) as TracksResponse;
      if (data.error) throw new Error(data.error);
      setTracks(data.tracks || []);
      setStep(3);
    } catch (error: unknown) {
      setTracksError(error instanceof Error ? error.message : "Failed to load tracks.");
    } finally {
      setTracksLoading(false);
    }
  };

  const verifyDestination = async () => {
    setDestLoading(true);
    setDestError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({ action: "verify", cookies: destCookies, authUser: destAuthUser }),
      });
      const data = (await res.json()) as VerifyResponse;
      if (data.error) throw new Error(data.error);
      if (data.authUser && data.authUser !== destAuthUser) setDestAuthUser(data.authUser);
      setDestVerified(Boolean(data.ok));
      setStep(4);
    } catch (error: unknown) {
      setDestError(error instanceof Error ? error.message : "Verification failed.");
      setDestVerified(false);
    } finally {
      setDestLoading(false);
    }
  };

  const runTransfer = async () => {
    if (!destVerified || tracks.length === 0) return;

    cancelRef.current = false;
    setTransferStatus("running");
    setProgress({ current: 0, total: tracks.length, success: 0, failed: 0 });
    setLogs([]);
    setFailedEntries([]);

    const failed: FailedEntry[] = [];

    for (let i = 0; i < tracks.length; i++) {
      if (cancelRef.current) break;
      const track = tracks[i];
      setProgress(p => ({ ...p, current: i + 1 }));
      addLog(`Processing: ${track.title}`);

      const result = await processTrack(track);
      if (result.ok) {
        setProgress(p => ({ ...p, success: p.success + 1 }));
      } else {
        setProgress(p => ({ ...p, failed: p.failed + 1 }));
        failed.push({ track, reason: result.reason || "Error" });
        addLog(`Failed: ${result.reason}`);
      }

      await sleep(BASE_DELAY_MS);
    }

    setFailedEntries(failed);
    setTransferStatus(cancelRef.current ? "stopped" : "done");
  };

  const resetAll = () => {
    setStep(1);
    setSourceCookies("");
    setPlaylists([]);
    setSelectedPlaylistId(null);
    setTracks([]);
    setDestCookies("");
    setDestVerified(false);
    setLogs([]);
    setProgress({ current: 0, total: 0, success: 0, failed: 0 });
    setTransferStatus("idle");
    setFailedEntries([]);
  };

  // --- Step Indicator ---

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-10">
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold border-2 transition-all duration-300
                ${step === s.id ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30" :
                  step > s.id ? "bg-primary/20 text-primary border-primary/40" : "bg-white/5 text-muted-foreground border-white/10"}
              `}
            >
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
            </div>
            <span className={`ml-2 text-sm font-medium transition-colors ${step === s.id ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-10 h-0.5 mx-3 rounded-full ${step > s.id ? "bg-primary/50" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // --- Input Styles ---

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-white/[0.07] transition-all outline-none";
  const smallInputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary/50 transition-all outline-none";

  return (
    <PageLayout
      orbConfig={[
        { color: "primary", position: "top-[-20%] right-[-10%]", size: "lg" },
        { color: "secondary", position: "bottom-[10%] left-[-10%]", size: "md" },
      ]}
    >
      <div className="max-w-4xl mx-auto">
        {renderStepIndicator()}

        <AnimatePresence mode="wait">

          {/* Step 1: Source */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card variant="elevated" className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-semibold mb-2">Connect Source</h2>
                  <p className="text-muted-foreground">Paste cookies from the YouTube Music account you want to transfer FROM.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Source Account Cookies</label>
                    <textarea
                      value={sourceCookies}
                      onChange={(e) => setSourceCookies(e.target.value)}
                      className={`${inputClass} h-32 font-mono text-xs`}
                      placeholder="cookie: ..."
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Auth User ID</label>
                      <input type="text" value={sourceAuthUser} onChange={(e) => setSourceAuthUser(e.target.value)} className={smallInputClass} />
                    </div>
                    <Button onClick={fetchPlaylists} isLoading={sourceLoading} disabled={!sourceCookies}>
                      Fetch Playlists <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                  {sourceError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {sourceError}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Playlist Selection */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card variant="elevated" className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-semibold mb-2">Select Music</h2>
                    <p className="text-muted-foreground">Choose a playlist or Liked Music to transfer.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                </div>

                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {playlists.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlaylistId(p.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4
                        ${selectedPlaylistId === p.id
                          ? "bg-primary/15 border-primary/40 shadow-lg shadow-primary/10"
                          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"}
                      `}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${selectedPlaylistId === p.id ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"}`}>
                        <Music2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.subtitle}</div>
                      </div>
                      {selectedPlaylistId === p.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={fetchTracks} isLoading={tracksLoading} disabled={!selectedPlaylistId}>
                    Load Tracks <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                {tracksError && <div className="text-red-400 text-sm">{tracksError}</div>}
              </Card>
            </motion.div>
          )}

          {/* Step 3: Destination */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card variant="elevated" className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-semibold mb-2">Destination</h2>
                    <p className="text-muted-foreground">Paste cookies for the TARGET account.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Music2 className="w-5 h-5" />
                  </div>
                  <div className="text-sm">
                    Ready to transfer <span className="font-bold text-foreground">{tracks.length}</span> tracks from <span className="font-bold text-foreground">{selectedPlaylist?.title}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Destination Cookies</label>
                    <textarea
                      value={destCookies}
                      onChange={(e) => setDestCookies(e.target.value)}
                      className={`${inputClass} h-32 font-mono text-xs`}
                      placeholder="cookie: ..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Auth User ID</label>
                      <input type="text" value={destAuthUser} onChange={(e) => setDestAuthUser(e.target.value)} className={smallInputClass} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      {destVerified ? <span className="text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Verified</span> : "Not verified"}
                    </div>
                    <Button onClick={verifyDestination} isLoading={destLoading} disabled={!destCookies}>
                      Verify & Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                  {destError && <div className="text-red-400 text-sm">{destError}</div>}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Execution */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card variant="elevated" className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-semibold mb-2">Transferring</h2>
                    <p className="text-muted-foreground">Sit back while we move your music.</p>
                  </div>
                  {transferStatus === 'idle' && <Button variant="ghost" size="sm" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
                </div>

                {/* Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-mono">{Math.round((progress.current / (progress.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                      transition={{ type: "spring", stiffness: 50 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">{progress.success} Success</span>
                    <span className="text-red-400">{progress.failed} Failed</span>
                  </div>
                </div>

                {/* Controls */}
                {transferStatus === 'idle' && (
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={allowSearchFallback} onChange={e => setAllowSearchFallback(e.target.checked)} className="rounded bg-white/10 border-white/20 text-primary focus:ring-primary/30" />
                      <span className="text-sm text-muted-foreground">Allow Search Fallback for missing IDs</span>
                    </label>
                    <Button onClick={runTransfer} className="w-full">Start Transfer Now</Button>
                  </div>
                )}

                {/* Logs */}
                <div className="h-64 bg-black/30 rounded-xl border border-white/5 p-4 overflow-y-auto font-mono text-xs text-muted-foreground space-y-1 custom-scrollbar">
                  {logs.length === 0 ? <span className="text-muted-foreground/50">Waiting to start...</span> : logs.map((log, i) => (
                    <div key={i} className="hover:text-foreground transition-colors">{log}</div>
                  ))}
                </div>

                {transferStatus === 'done' && (
                  <div className="flex justify-center pt-4">
                    <Button onClick={resetAll} variant="outline">Start New Transfer</Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
