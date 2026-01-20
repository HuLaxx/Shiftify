"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Music2,
  Search,
  Settings,
  XCircle,
  RefreshCw,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";


// --- Types (Preserved) ---

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
  pages?: number;
  truncated?: boolean;
  missingTitle?: number;
  missingVideoId?: number;
  diagnostics?: TracksDiagnostics;
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

type TracksDiagnostics = {
  rendererCounts?: Record<string, number>;
  parsedCounts?: Record<string, number>;
  missingTitleByType?: Record<string, number>;
  missingVideoIdByType?: Record<string, number>;
  reportedTotal?: number | null;
  metadataCounts?: Record<string, number>;
  stopReason?: string;
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
const RETRY_DELAY_MS = 900;
const MAX_REPORT_LINES = 200;

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
  const [tracksNotice, setTracksNotice] = useState<string | null>(null);
  const [tracksDiagnostics, setTracksDiagnostics] = useState<TracksDiagnostics | null>(null);

  // Destination State
  const [destCookies, setDestCookies] = useState("");
  const [destAuthUser, setDestAuthUser] = useState("0");
  const [destVerified, setDestVerified] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);

  // Settings
  const [allowSearchFallback, setAllowSearchFallback] = useState(false);
  const [clearBeforeTransfer, setClearBeforeTransfer] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  const [clearStatus, setClearStatus] = useState<"idle" | "running" | "done" | "stopped" | "error">("idle");
  const [clearProgress, setClearProgress] = useState({ current: 0, total: 0, removed: 0, failed: 0 });

  // Transfer State
  const [logs, setLogs] = useState<string[]>([]);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [retryPasses, setRetryPasses] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [transferStatus, setTransferStatus] = useState<"idle" | "running" | "stopped" | "done" | "error">("idle");

  const cancelRef = useRef(false);

  // Computed
  const missingVideoIdTracks = useMemo(
    () => tracks.filter((track) => !track.videoId),
    [tracks],
  );

  const selectedPlaylist = useMemo(
    () => playlists.find((item) => item.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId],
  );

  // --- Logic Helpers (Preserved) ---

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`${time} ${message}`, ...prev]);
  };

  const createRun = async (total: number) => {
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        body: JSON.stringify({ kind: "transfer", total }),
      });
      const data = (await res.json()) as { id?: string };
      if (data.id) return data.id;
    } catch {
      return null;
    }
    return null;
  };

  const logRunEvent = async (id: string | null, level: string, message: string) => {
    if (!id) return;
    try {
      await fetch(`/api/runs/${id}/events`, {
        method: "POST",
        body: JSON.stringify({ level, message }),
      });
    } catch { }
  };

  const finalizeRun = async (id: string | null, status: string, totals: { total: number; success: number; failed: number }) => {
    if (!id) return;
    try {
      await fetch(`/api/runs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...totals }),
      });
    } catch { }
  };

  const getDelayFromMessage = (message: string, fallback: number) => {
    const lower = message.toLowerCase();
    if (lower.includes("429") || lower.includes("rate")) return Math.max(fallback, 1500);
    if (lower.includes("timeout")) return Math.max(fallback, 1200);
    return fallback;
  };

  const copyReport = async (label: string, lines: string[]) => {
    if (lines.length === 0) {
      addLog(`${label}: nothing to copy.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      addLog(`Copied ${label} (${lines.length} lines).`);
    } catch {
      addLog(`Copy failed for ${label}.`);
    }
  };

  // --- API Actions ---

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
        if (!allowSearchFallback) return { ok: false, reason: "Missing video ID (exact mode)." };
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

  const clearDestinationLiked = async () => {
    if (!clearBeforeTransfer) return true;
    if (clearConfirm.trim().toUpperCase() !== "CLEAR") {
      addLog("Type CLEAR to confirm wipe.");
      setClearStatus("error");
      return false;
    }

    setClearStatus("running");
    setClearProgress({ current: 0, total: 0, removed: 0, failed: 0 });
    addLog("Clearing destination...");

    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "get_playlist_tracks",
          cookies: destCookies,
          authUser: destAuthUser,
          params: { id: "LM" },
        }),
      });
      const data = (await res.json()) as TracksResponse;
      if (data.error) throw new Error(data.error);
      const list = data.tracks || [];
      setClearProgress({ current: 0, total: list.length, removed: 0, failed: 0 });

      for (let i = 0; i < list.length; i += 1) {
        if (cancelRef.current) {
          setClearStatus("stopped");
          return false;
        }

        const track = list[i];
        setClearProgress((prev) => ({ ...prev, current: i + 1 }));

        if (!track.videoId) {
          setClearProgress((prev) => ({ ...prev, failed: prev.failed + 1 }));
          continue;
        }

        await fetch("/api/ytm", {
          method: "POST",
          body: JSON.stringify({
            action: "remove_like",
            cookies: destCookies,
            authUser: destAuthUser,
            params: { videoId: track.videoId },
          }),
        });

        setClearProgress((prev) => ({ ...prev, removed: prev.removed + 1 }));
        await sleep(BASE_DELAY_MS);
      }

      setClearStatus("done");
      return true;
    } catch (error: unknown) {
      setClearStatus("error");
      addLog(`Clear error: ${error instanceof Error ? error.message : "Unknown"}`);
      return false;
    }
  };

  const runRetryPass = async (queue: FailedEntry[], pass: number) => {
    if (queue.length === 0) return [];
    addLog(`Retry pass ${pass} for ${queue.length} tracks.`);
    const remaining: FailedEntry[] = [];

    for (const entry of queue) {
      if (cancelRef.current) break;
      const track = entry.track;
      addLog(`Retrying: ${track.title}`);
      const result = await processTrack(track);
      if (result.ok) {
        setProgress((prev) => ({
          ...prev,
          success: prev.success + 1,
          failed: Math.max(0, prev.failed - 1),
        }));
        addLog(`Recovered: ${track.title}`);
      } else {
        remaining.push({ track, reason: result.reason || entry.reason });
      }
      await sleep(getDelayFromMessage(result.reason ?? "", RETRY_DELAY_MS));
    }
    return remaining;
  };

  const retryFailedTracks = async () => {
    if (failedEntries.length === 0 || transferStatus === "running") return;
    cancelRef.current = false;
    setTransferStatus("running");
    const nextPass = retryPasses + 1;
    setRetryPasses(nextPass);
    const remaining = await runRetryPass(failedEntries, nextPass);
    setFailedEntries(remaining);
    setTransferStatus(cancelRef.current ? "stopped" : "done");
  };

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
    setTracksDiagnostics(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({ action: "get_playlist_tracks", cookies: sourceCookies, authUser: sourceAuthUser, params: { id: selectedPlaylistId } }),
      });
      const data = (await res.json()) as TracksResponse;
      if (data.error) throw new Error(data.error);
      if (data.authUser && data.authUser !== sourceAuthUser) setSourceAuthUser(data.authUser);

      const loadedTracks = data.tracks || [];
      setTracks(loadedTracks);
      setTracksDiagnostics(data.diagnostics ?? null);

      const count = data.count ?? loadedTracks.length;
      if (count > 0) {
        setTracksNotice(`Loaded ${count} tracks.`);
      }
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
    setRetryPasses(0);

    const activeRunId = await createRun(tracks.length);

    if (clearBeforeTransfer) {
      const cleared = await clearDestinationLiked();
      if (!cleared || cancelRef.current) {
        setTransferStatus(cancelRef.current ? "stopped" : "error");
        return;
      }
    }

    const failed: FailedEntry[] = [];
    let successCount = 0;

    for (let i = 0; i < tracks.length; i++) {
      if (cancelRef.current) break;
      const track = tracks[i];
      setProgress(p => ({ ...p, current: i + 1 }));
      addLog(`Processing: ${track.title}`);

      const result = await processTrack(track);
      if (result.ok) {
        setProgress(p => ({ ...p, success: p.success + 1 }));
        successCount++;
      } else {
        setProgress(p => ({ ...p, failed: p.failed + 1 }));
        failed.push({ track, reason: result.reason || "Error" });
        addLog(`Failed: ${result.reason}`);
      }

      await sleep(BASE_DELAY_MS);
    }

    // Retry Logic
    let remaining = failed;
    if (!cancelRef.current && remaining.length > 0) {
      setRetryPasses(1);
      remaining = await runRetryPass(remaining, 1);
    }

    setFailedEntries(remaining);
    setTransferStatus(cancelRef.current ? "stopped" : "done");
    if (activeRunId) await finalizeRun(activeRunId, "done", { total: tracks.length, success: successCount, failed: remaining.length });
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

  // --- Render Helpers ---

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-12">
      <div className="flex items-center gap-4">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
                        ${step === s.id ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" :
                step > s.id ? "bg-primary/20 text-primary" : "bg-white/5 text-zinc-500"}
                    `}>
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
            </div>
            <span className={`ml-2 text-sm font-medium transition-colors ${step === s.id ? "text-white" : "text-zinc-600"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-[2px] mx-3 rounded-full ${step > s.id ? "bg-primary/30" : "bg-white/5"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-4xl mx-auto">
      {renderStepIndicator()}

      <AnimatePresence mode="wait">

        {/* Step 1: Source */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-display font-semibold mb-2">Connect Source</h2>
                <p className="text-zinc-400">Paste cookies from the YouTube Music account you want to transfer FROM.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Source Account Cookies</label>
                  <textarea
                    value={sourceCookies}
                    onChange={(e) => setSourceCookies(e.target.value)}
                    className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-700"
                    placeholder="cookie: ..."
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Auth User ID</label>
                    <input
                      type="text"
                      value={sourceAuthUser}
                      onChange={(e) => setSourceAuthUser(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={fetchPlaylists} isLoading={sourceLoading} disabled={!sourceCookies}>
                      Fetch Playlists <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
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
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display font-semibold mb-2">Select Music</h2>
                  <p className="text-zinc-400">Choose a playlist or Liked Music to transfer.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Change Source</Button>
              </div>

              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlaylistId(p.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4
                                    ${selectedPlaylistId === p.id
                        ? "bg-primary/10 border-primary/50 shadow-lg shadow-primary/10"
                        : "bg-white/5 border-white/5 hover:bg-white/10"}
                                `}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedPlaylistId === p.id ? "bg-primary text-white" : "bg-white/10 text-zinc-400"}`}>
                      <Music2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-zinc-200">{p.title}</div>
                      <div className="text-xs text-zinc-500">{p.subtitle}</div>
                    </div>
                    {selectedPlaylistId === p.id && <CheckCircle2 className="ml-auto w-5 h-5 text-primary" />}
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
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display font-semibold mb-2">Destination</h2>
                  <p className="text-zinc-400">Paste cookies for the TARGET account.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Back</Button>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Music2 className="w-4 h-4" />
                </div>
                <div className="text-sm">
                  Ready to transfer <span className="font-bold text-white">{tracks.length}</span> tracks from <span className="font-bold text-white">{selectedPlaylist?.title}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Destination Cookies</label>
                  <textarea
                    value={destCookies}
                    onChange={(e) => setDestCookies(e.target.value)}
                    className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm focus:border-secondary/50 focus:ring-1 focus:ring-secondary/50 outline-none transition-all placeholder:text-zinc-700"
                    placeholder="cookie: ..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Auth User ID</label>
                    <input
                      type="text"
                      value={destAuthUser}
                      onChange={(e) => setDestAuthUser(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-zinc-500">
                    {destVerified ? <span className="text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Verified</span> : "Not verified"}
                  </div>
                  <Button onClick={verifyDestination} isLoading={destLoading} variant="secondary" disabled={!destCookies}>
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
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display font-semibold mb-2">Transferring</h2>
                  <p className="text-zinc-400">Sit back while we move your music.</p>
                </div>
                {transferStatus === 'idle' && <Button variant="ghost" size="sm" onClick={() => setStep(3)}>Back</Button>}
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Progress</span>
                  <span>{Math.round((progress.current / (progress.total || 1)) * 100)}%</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 pt-1">
                  <span className="text-green-400">{progress.success} Success</span>
                  <span className="text-red-400">{progress.failed} Failed</span>
                </div>
              </div>

              {/* Controls */}
              {transferStatus === 'idle' && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Options</span>
                    <div className="h-px bg-white/10 flex-1" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={allowSearchFallback} onChange={e => setAllowSearchFallback(e.target.checked)} className="rounded border-white/20 bg-black/20 text-primary" />
                      <span className="text-sm text-zinc-400">Allow Search Fallback</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={clearBeforeTransfer} onChange={e => setClearBeforeTransfer(e.target.checked)} className="rounded border-white/20 bg-black/20 text-primary" />
                      <span className="text-sm text-zinc-400">Wipe Destination First</span>
                    </label>
                  </div>
                  {clearBeforeTransfer && (
                    <input
                      type="text"
                      placeholder="Type 'CLEAR' to confirm"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm"
                      value={clearConfirm}
                      onChange={e => setClearConfirm(e.target.value)}
                    />
                  )}
                  <Button onClick={runTransfer} className="w-full">Start Transfer Now</Button>
                </div>
              )}

              {/* Logs */}
              <div className="h-64 bg-black/40 rounded-xl border border-white/5 p-4 overflow-y-auto font-mono text-xs text-zinc-400 space-y-1 custom-scrollbar">
                {logs.length === 0 ? <span className="text-zinc-600">Waiting to start...</span> : logs.map((log, i) => (
                  <div key={i}>{log}</div>
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
  );
}
