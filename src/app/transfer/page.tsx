"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  editId?: string | null;
  browseId?: string | null;
};

type TrackItem = {
  title: string;
  artist: string;
  videoId?: string | null;
  setVideoId?: string | null;
  playlistId?: string | null;
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
  missingVideoId?: number;
  error?: string;
};

type VerifyResponse = {
  ok?: boolean;
  authUser?: string;
  error?: string;
};

type SearchResponse = {
  videoId?: string | null;
  authUser?: string;
  error?: string;
};

type ActionResponse = {
  success?: boolean;
  authUser?: string;
  error?: string;
};

type SearchResult = {
  videoId: string | null;
  authUser?: string;
};

type ProcessResult = {
  ok: boolean;
  reason?: string;
  authUser?: string;
};

type ImportItem = {
  id: string;
  title: string;
  artist: string;
  status: string;
};

type ImportResponse = {
  import?: { id: string; name: string };
  items?: ImportItem[];
  error?: string;
};

type AccountInfo = {
  name?: string | null;
  email?: string | null;
  handle?: string | null;
};

type AccountInfoResponse = {
  account?: AccountInfo | null;
  authUser?: string;
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
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const isValidVideoId = (value: string | null | undefined) =>
  typeof value === "string" && VIDEO_ID_REGEX.test(value);

// --- Main Component ---

export default function TransferPage() {
  const [step, setStep] = useState(1);
  const searchParams = useSearchParams();

  const [sourceMode, setSourceMode] = useState<"ytm" | "import">("ytm");
  const [importMeta, setImportMeta] = useState<{ id: string; name: string } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Source State
  const [sourceCookies, setSourceCookies] = useState("");
  const [sourceAuthUser, setSourceAuthUser] = useState("0");
  const [sourceStrictAuthUser, setSourceStrictAuthUser] = useState(false);
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
  const [destAccount, setDestAccount] = useState<AccountInfo | null>(null);
  const [destAccountError, setDestAccountError] = useState<string | null>(null);
  const [destPlaylists, setDestPlaylists] = useState<PlaylistItem[]>([]);
  const [destPlaylistId, setDestPlaylistId] = useState<string | null>(null);
  const [destPlaylistsLoading, setDestPlaylistsLoading] = useState(false);
  const [destPlaylistsError, setDestPlaylistsError] = useState<string | null>(null);

  // Settings
  const [allowSearchFallback, setAllowSearchFallback] = useState(false);

  // Transfer State
  const [logs, setLogs] = useState<string[]>([]);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [transferStatus, setTransferStatus] = useState<"idle" | "running" | "stopped" | "done" | "error">("idle");
  const [clearLogs, setClearLogs] = useState<string[]>([]);
  const [clearProgress, setClearProgress] = useState({ current: 0, total: 0, removed: 0, failed: 0 });
  const [clearStatus, setClearStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [clearUseSearchFallback, setClearUseSearchFallback] = useState(false);

  const cancelRef = useRef(false);
  const tracksRequestRef = useRef(0);
  const importIdRef = useRef<string | null>(null);
  const sourceModeRef = useRef<"ytm" | "import">("ytm");
  const selectedPlaylistRef = useRef<string | null>(null);

  const selectedPlaylist = useMemo(
    () => playlists.find((item) => item.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId],
  );

  const selectedDestPlaylist = useMemo(
    () => destPlaylists.find((item) => item.id === destPlaylistId) || null,
    [destPlaylists, destPlaylistId],
  );

  const normalizeCookieForCompare = (value: string) =>
    value
      .trim()
      .replace(/^cookie:\s*/i, "")
      .replace(/[\r\n]+/g, "")
      .replace(/\s+/g, "");

  const formatAccountLabel = (account?: AccountInfo | null) => {
    if (!account) return "Account info unavailable.";
    const parts = [account.name, account.email, account.handle].filter(
      (value): value is string => Boolean(value),
    );
    return parts.length ? parts.join(" - ") : "Account info unavailable.";
  };

  const sourceLabel = useMemo(() => {
    if (sourceMode === "import") {
      return importMeta?.name || "Approved import";
    }
    return selectedPlaylist?.title || "Selected playlist";
  }, [sourceMode, importMeta, selectedPlaylist]);

  const normalizedSourceCookies = useMemo(
    () => normalizeCookieForCompare(sourceCookies),
    [sourceCookies],
  );
  const normalizedDestCookies = useMemo(
    () => normalizeCookieForCompare(destCookies),
    [destCookies],
  );
  const sameCookieJar = Boolean(
    normalizedSourceCookies &&
      normalizedDestCookies &&
      normalizedSourceCookies === normalizedDestCookies,
  );
  const sameAccount = sameCookieJar && sourceAuthUser.trim() === destAuthUser.trim();

  const importId = searchParams.get("import");
  importIdRef.current = importId;
  sourceModeRef.current = sourceMode;
  selectedPlaylistRef.current = selectedPlaylistId;

  // --- Helpers ---

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`${time} ${message}`, ...prev]);
  };

  const addClearLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setClearLogs((prev) => [`${time} ${message}`, ...prev]);
  };

  const resetClearState = () => {
    setClearLogs([]);
    setClearProgress({ current: 0, total: 0, removed: 0, failed: 0 });
    setClearStatus("idle");
    setClearUseSearchFallback(false);
  };

  const isLikedPlaylist = (
    playlistId: string | null,
    playlist?: PlaylistItem | null,
  ) => {
    if (!playlistId) return false;
    if (playlistId === "LM") return true;
    if (playlist?.editId === "LM") return true;
    const title = playlist?.title?.trim().toLowerCase();
    return title === "liked music";
  };

  const resolvePlaylistEditId = (
    playlistId: string | null,
    playlist?: PlaylistItem | null,
  ) => {
    if (!playlistId || isLikedPlaylist(playlistId, playlist)) return null;
    if (playlist?.editId) return playlist.editId;
    return playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
  };

  const resolvePlaylistBrowseId = (
    playlistId: string | null,
    playlist?: PlaylistItem | null,
  ) => {
    if (!playlistId) return null;
    if (playlist?.browseId) return playlist.browseId;
    if (isLikedPlaylist(playlistId, playlist)) return "LM";
    if (playlistId.startsWith("VL")) return playlistId;
    const editId = playlist?.editId ?? playlistId;
    return editId.startsWith("VL") ? editId : `VL${editId}`;
  };

  const handleDestCookiesChange = (value: string) => {
    setDestCookies(value);
    setDestAccount(null);
    setDestAccountError(null);
    if (destVerified || destPlaylists.length > 0 || destPlaylistId) {
      setDestVerified(false);
      setDestPlaylists([]);
      setDestPlaylistId(null);
      setDestPlaylistsError(null);
      resetClearState();
    }
  };

  const handleDestAuthUserChange = (value: string) => {
    setDestAuthUser(value);
    setDestAccount(null);
    setDestAccountError(null);
    if (destVerified || destPlaylists.length > 0 || destPlaylistId) {
      setDestVerified(false);
      setDestPlaylists([]);
      setDestPlaylistId(null);
      setDestPlaylistsError(null);
      resetClearState();
    }
  };

  useEffect(() => {
    if (!importId) return;
    let active = true;

    const loadImport = async () => {
      setImportLoading(true);
      setImportError(null);
      setTracks([]);
      setTracksError(null);
      setSelectedPlaylistId(null);
      setSourceMode("import");
      setSourceCookies("");
      setSourceAuthUser("0");
      setPlaylists([]);
      setImportMeta(null);
      try {
        const res = await fetch(`/api/imports/${importId}?include=items&order=original`);
        const data = (await res.json()) as ImportResponse;
        if (data.error) throw new Error(data.error);
        if (!data.import) throw new Error("Import not found.");

        const approved = (data.items ?? []).filter((item) => item.status === "approved");
        const mapped = approved.map((item) => ({
          title: item.title,
          artist: item.artist,
          videoId: null,
          setVideoId: null,
        }));

        if (!active) return;
        setImportMeta({ id: data.import.id, name: data.import.name });
        setTracks(mapped);
        setSelectedPlaylistId(null);
        setTracksError(null);
        setAllowSearchFallback(true);
        setStep(3);

        if (approved.length === 0) {
          setImportError("No approved tracks found in this import.");
        }
      } catch (error: unknown) {
        if (!active) return;
        setImportError(error instanceof Error ? error.message : "Failed to load import.");
      } finally {
        if (active) setImportLoading(false);
      }
    };

    loadImport();
    return () => {
      active = false;
    };
  }, [importId]);

  const searchVideoId = async (query: string, authUserValue: string): Promise<SearchResult> => {
    const res = await fetch("/api/ytm", {
      method: "POST",
      body: JSON.stringify({
        action: "search",
        cookies: destCookies,
        authUser: authUserValue,
        params: { query, strictAuthUser: true },
      }),
    });
    const data = (await res.json()) as SearchResponse;
    if (data.error) throw new Error(data.error);
    const resolvedAuthUser = data.authUser ?? authUserValue;
    if (data.authUser && data.authUser !== destAuthUser) {
      setDestAuthUser(data.authUser);
    }
    const videoId = isValidVideoId(data.videoId ?? null) ? data.videoId ?? null : null;
    return { videoId, authUser: resolvedAuthUser };
  };

  const findVideoIdForTrack = async (
    track: TrackItem,
    authUserValue: string,
  ): Promise<SearchResult> => {
    const queries = [`${track.title} ${track.artist} audio`, `${track.title} ${track.artist}`, track.title];
    let resolvedAuthUser = authUserValue;
    for (const query of queries) {
      const result = await searchVideoId(query, resolvedAuthUser);
      if (result.authUser && result.authUser !== resolvedAuthUser) {
        resolvedAuthUser = result.authUser;
      }
      if (result.videoId) return { videoId: result.videoId, authUser: resolvedAuthUser };
      await sleep(120);
    }
    return { videoId: null, authUser: resolvedAuthUser };
  };

  const processTrack = async (
    track: TrackItem,
    authUserValue: string,
  ): Promise<ProcessResult> => {
    let resolvedAuthUser = authUserValue;
    try {
      const candidateVideoId = track.videoId ?? null;
      const hasInvalidVideoId = Boolean(candidateVideoId && !isValidVideoId(candidateVideoId));
      let videoId = isValidVideoId(candidateVideoId) ? candidateVideoId : null;
      if (!videoId) {
        if (!allowSearchFallback) {
          return {
            ok: false,
            reason: hasInvalidVideoId ? "Invalid video ID." : "Missing video ID.",
            authUser: resolvedAuthUser,
          };
        }
        const found = await findVideoIdForTrack(track, resolvedAuthUser);
        videoId = found.videoId;
        if (found.authUser) {
          resolvedAuthUser = found.authUser;
        }
      }
      if (!videoId) return { ok: false, reason: "No match found.", authUser: resolvedAuthUser };

      if (!destPlaylistId) {
        return { ok: false, reason: "No destination playlist selected.", authUser: resolvedAuthUser };
      }
      const isLiked = isLikedPlaylist(destPlaylistId, selectedDestPlaylist);
      if (isLiked) {
        const likeRes = await fetch("/api/ytm", {
          method: "POST",
          body: JSON.stringify({
            action: "like",
            cookies: destCookies,
            authUser: resolvedAuthUser,
            params: { videoId, strictAuthUser: true },
          }),
        });
        const likeData = (await likeRes.json()) as ActionResponse;
        if (likeData.error) throw new Error(`Like failed: ${likeData.error}`);
        if (likeData.authUser && likeData.authUser !== resolvedAuthUser) {
          resolvedAuthUser = likeData.authUser;
          setDestAuthUser(likeData.authUser);
        }
      } else {
        const playlistEditId = resolvePlaylistEditId(destPlaylistId, selectedDestPlaylist);
        if (!playlistEditId) {
          return { ok: false, reason: "Missing destination playlist ID.", authUser: resolvedAuthUser };
        }
        const addRes = await fetch("/api/ytm", {
          method: "POST",
          body: JSON.stringify({
            action: "add_to_playlist",
            cookies: destCookies,
            authUser: resolvedAuthUser,
            params: { playlistId: playlistEditId, videoId, strictAuthUser: true },
          }),
        });
        const addData = (await addRes.json()) as ActionResponse;
        if (addData.error) throw new Error(`Add failed: ${addData.error}`);
        if (addData.authUser && addData.authUser !== resolvedAuthUser) {
          resolvedAuthUser = addData.authUser;
          setDestAuthUser(addData.authUser);
        }
      }
      return { ok: true, authUser: resolvedAuthUser };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Transfer error.";
      return { ok: false, reason: message, authUser: resolvedAuthUser };
    }
  };

  // --- API Actions ---

  const fetchPlaylists = async () => {
    setSourceMode("ytm");
    setImportMeta(null);
    setImportError(null);
    setSourceLoading(true);
    setSourceError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "list_playlists",
          cookies: sourceCookies,
          authUser: sourceAuthUser,
          params: sourceStrictAuthUser ? { strictAuthUser: true } : undefined,
        }),
      });
      const data = (await res.json()) as PlaylistResponse;
      if (data.error) throw new Error(data.error);
      if (!sourceStrictAuthUser && data.authUser && data.authUser !== sourceAuthUser) {
        setSourceAuthUser(data.authUser);
      }
      setPlaylists(data.playlists || []);
      setStep(2);
    } catch (error: unknown) {
      setSourceError(error instanceof Error ? error.message : "Failed to load playlists.");
    } finally {
      setSourceLoading(false);
    }
  };

  const fetchTracks = async () => {
    if (importIdRef.current) {
      setTracksError("Import mode is active. Open the transfer page without an import to load a playlist.");
      return;
    }
    if (!selectedPlaylistId) return setTracksError("Pick a playlist.");
    const playlistId = selectedPlaylistId;
    const playlistBrowseId = resolvePlaylistBrowseId(selectedPlaylistId, selectedPlaylist);
    if (!playlistBrowseId) return setTracksError("Missing playlist browse ID.");
    const requestId = ++tracksRequestRef.current;
    setTracksLoading(true);
    setTracksError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "get_playlist_tracks",
          cookies: sourceCookies,
          authUser: sourceAuthUser,
          params: {
            id: playlistBrowseId,
            ...(sourceStrictAuthUser ? { strictAuthUser: true } : {}),
          },
        }),
      });
      const data = (await res.json()) as TracksResponse;
      if (data.error) throw new Error(data.error);
      if (tracksRequestRef.current !== requestId) return;
      if (importIdRef.current || sourceModeRef.current !== "ytm") return;
      if (selectedPlaylistRef.current !== playlistId) return;
      if (!sourceStrictAuthUser && data.authUser && data.authUser !== sourceAuthUser) {
        setSourceAuthUser(data.authUser);
      }
      setTracks(data.tracks || []);
      setStep(3);
    } catch (error: unknown) {
      if (tracksRequestRef.current !== requestId) return;
      setTracksError(error instanceof Error ? error.message : "Failed to load tracks.");
    } finally {
      if (tracksRequestRef.current === requestId) {
        setTracksLoading(false);
      }
    }
  };

  const fetchDestinationPlaylists = async (authUserOverride?: string) => {
    setDestPlaylistsLoading(true);
    setDestPlaylistsError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "list_playlists",
          cookies: destCookies,
          authUser: authUserOverride ?? destAuthUser,
          params: { strictAuthUser: true },
        }),
      });
      const data = (await res.json()) as PlaylistResponse;
      if (data.error) throw new Error(data.error);
      if (data.authUser && data.authUser !== destAuthUser) setDestAuthUser(data.authUser);
      setDestPlaylists(data.playlists || []);
    } catch (error: unknown) {
      setDestPlaylistsError(error instanceof Error ? error.message : "Failed to load destination playlists.");
    } finally {
      setDestPlaylistsLoading(false);
    }
  };

  const fetchDestinationAccountInfo = async (authUserOverride?: string) => {
    setDestAccountError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "account_info",
          cookies: destCookies,
          authUser: authUserOverride ?? destAuthUser,
          params: { strictAuthUser: true },
        }),
      });
      const data = (await res.json()) as AccountInfoResponse;
      if (data.error) throw new Error(data.error);
      if (data.authUser && data.authUser !== destAuthUser) {
        setDestAuthUser(data.authUser);
      }
      setDestAccount(data.account ?? null);
    } catch (error: unknown) {
      setDestAccount(null);
      setDestAccountError(
        error instanceof Error ? error.message : "Failed to load account info.",
      );
    }
  };

  const verifyDestination = async () => {
    if (sameAccount) {
      const proceed = window.confirm(
        "Destination cookies and Auth User ID match the source. This will modify the same account. Continue?",
      );
      if (!proceed) return;
    }
    setDestLoading(true);
    setDestError(null);
    try {
      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          cookies: destCookies,
          authUser: destAuthUser,
          params: { strictAuthUser: true },
        }),
      });
      const data = (await res.json()) as VerifyResponse;
      if (data.error) throw new Error(data.error);
      const resolvedAuthUser = data.authUser ?? destAuthUser;
      if (data.authUser && data.authUser !== destAuthUser) setDestAuthUser(data.authUser);
      setDestVerified(Boolean(data.ok));
      await fetchDestinationAccountInfo(resolvedAuthUser);
      await fetchDestinationPlaylists(resolvedAuthUser);
    } catch (error: unknown) {
      setDestError(error instanceof Error ? error.message : "Verification failed.");
      setDestVerified(false);
      setDestAccount(null);
      setDestAccountError(null);
    } finally {
      setDestLoading(false);
    }
  };

  const clearDestinationPlaylist = async () => {
    if (!destVerified || !destPlaylistId || clearStatus === "running") return;
    const label = selectedDestPlaylist?.title || "the selected playlist";
    const isLiked = isLikedPlaylist(destPlaylistId, selectedDestPlaylist);
    const message = isLiked
      ? "This will remove all likes from Liked Music in the destination account (also affects YouTube Liked Videos). Continue?"
      : `This will remove all tracks from "${label}". Continue?`;
    if (!window.confirm(message)) return;

    setClearStatus("running");
    setClearProgress({ current: 0, total: 0, removed: 0, failed: 0 });
    setClearLogs([]);

    try {
      let resolvedAuthUser = destAuthUser;
      const playlistBrowseId = resolvePlaylistBrowseId(destPlaylistId, selectedDestPlaylist);
      if (!playlistBrowseId) throw new Error("Missing destination playlist.");
      const playlistEditId =
        isLiked
          ? null
          : resolvePlaylistEditId(destPlaylistId, selectedDestPlaylist);
      if (!isLiked && !playlistEditId) {
        throw new Error("Missing destination playlist ID.");
      }

      const res = await fetch("/api/ytm", {
        method: "POST",
        body: JSON.stringify({
          action: "get_playlist_tracks",
          cookies: destCookies,
          authUser: resolvedAuthUser,
          params: { id: playlistBrowseId, dedupe: false, strictAuthUser: true },
        }),
      });
      const data = (await res.json()) as TracksResponse;
      if (data.error) throw new Error(data.error);
      if (data.authUser && data.authUser !== resolvedAuthUser) {
        resolvedAuthUser = data.authUser;
        setDestAuthUser(data.authUser);
      }
      if (data.missingVideoId) {
        addClearLog(`Missing video IDs for ${data.missingVideoId} items.`);
      }

      const playlistTracks = data.tracks || [];
      setClearProgress({ current: 0, total: playlistTracks.length, removed: 0, failed: 0 });

      if (playlistTracks.length === 0) {
        addClearLog("No tracks to clear.");
        setClearStatus("done");
        return;
      }

      addClearLog(`Clearing ${playlistTracks.length} tracks...`);

        for (let i = 0; i < playlistTracks.length; i++) {
          const track = playlistTracks[i];
          setClearProgress((p) => ({ ...p, current: i + 1 }));

          if (isLiked) {
            let videoId = track.videoId ?? null;
            if (!videoId) {
              if (clearUseSearchFallback) {
                const searchResult = await findVideoIdForTrack(
                  { title: track.title, artist: track.artist },
                  resolvedAuthUser,
                );
                if (searchResult.authUser && searchResult.authUser !== resolvedAuthUser) {
                  resolvedAuthUser = searchResult.authUser;
                  setDestAuthUser(searchResult.authUser);
                }
                videoId = searchResult.videoId ?? null;
                if (videoId) {
                  addClearLog(`Resolved video ID for "${track.title}".`);
                }
              }
              if (!videoId) {
                setClearProgress((p) => ({ ...p, failed: p.failed + 1 }));
                addClearLog(`Missing video ID for "${track.title}".`);
                await sleep(BASE_DELAY_MS);
                continue;
              }
            }
            if (!isValidVideoId(videoId)) {
              if (clearUseSearchFallback) {
                const searchResult = await findVideoIdForTrack(
                  { title: track.title, artist: track.artist },
                  resolvedAuthUser,
                );
                if (searchResult.authUser && searchResult.authUser !== resolvedAuthUser) {
                  resolvedAuthUser = searchResult.authUser;
                  setDestAuthUser(searchResult.authUser);
                }
                videoId = searchResult.videoId ?? null;
                if (videoId) {
                  addClearLog(`Resolved video ID for "${track.title}".`);
                }
              }
              if (!videoId || !isValidVideoId(videoId)) {
                setClearProgress((p) => ({ ...p, failed: p.failed + 1 }));
                addClearLog(`Invalid video ID for "${track.title}".`);
                await sleep(BASE_DELAY_MS);
                continue;
              }
            }
            if (track.setVideoId) {
              const removeRes = await fetch("/api/ytm", {
                method: "POST",
                body: JSON.stringify({
                action: "remove_from_playlist",
                cookies: destCookies,
                authUser: resolvedAuthUser,
                params: {
                  playlistId: track.playlistId ?? "LM",
                  videoId,
                  setVideoId: track.setVideoId,
                  strictAuthUser: true,
                },
              }),
            });
            const removeData = (await removeRes.json()) as ActionResponse;
            if (!removeData.error) {
              if (removeData.authUser && removeData.authUser !== resolvedAuthUser) {
                resolvedAuthUser = removeData.authUser;
                setDestAuthUser(removeData.authUser);
              }
              setClearProgress((p) => ({ ...p, removed: p.removed + 1 }));
              await sleep(BASE_DELAY_MS);
              continue;
            }
            addClearLog(`Remove failed for "${track.title}": ${removeData.error}. Trying unlike...`);
          }

          const removeRes = await fetch("/api/ytm", {
            method: "POST",
            body: JSON.stringify({
              action: "remove_like",
              cookies: destCookies,
              authUser: resolvedAuthUser,
              params: { videoId, strictAuthUser: true },
            }),
          });
          const removeData = (await removeRes.json()) as ActionResponse;
          if (removeData.error) {
            addClearLog(`Unlike failed for "${track.title}": ${removeData.error}`);
            setClearProgress((p) => ({ ...p, failed: p.failed + 1 }));
            await sleep(BASE_DELAY_MS);
            continue;
          }
          if (removeData.authUser && removeData.authUser !== resolvedAuthUser) {
            resolvedAuthUser = removeData.authUser;
            setDestAuthUser(removeData.authUser);
          }
          setClearProgress((p) => ({ ...p, removed: p.removed + 1 }));
        } else {
          const videoId = track.videoId ?? null;
          if (!videoId || !track.setVideoId) {
            setClearProgress((p) => ({ ...p, failed: p.failed + 1 }));
            addClearLog(`Missing video ID or setVideoId for "${track.title}".`);
            await sleep(BASE_DELAY_MS);
            continue;
          }
          if (!isValidVideoId(videoId)) {
            setClearProgress((p) => ({ ...p, failed: p.failed + 1 }));
            addClearLog(`Invalid video ID for "${track.title}".`);
            await sleep(BASE_DELAY_MS);
            continue;
          }
          const removeRes = await fetch("/api/ytm", {
            method: "POST",
            body: JSON.stringify({
              action: "remove_from_playlist",
              cookies: destCookies,
              authUser: resolvedAuthUser,
              params: {
                playlistId: playlistEditId,
                videoId,
                setVideoId: track.setVideoId,
                strictAuthUser: true,
              },
            }),
          });
          const removeData = (await removeRes.json()) as ActionResponse;
          if (removeData.error) {
            setClearProgress((p) => ({ ...p, failed: p.failed + 1 }));
            addClearLog(`Remove failed for "${track.title}": ${removeData.error}`);
            await sleep(BASE_DELAY_MS);
            continue;
          }
          if (removeData.authUser && removeData.authUser !== resolvedAuthUser) {
            resolvedAuthUser = removeData.authUser;
            setDestAuthUser(removeData.authUser);
          }
          setClearProgress((p) => ({ ...p, removed: p.removed + 1 }));
        }

        await sleep(BASE_DELAY_MS);
      }

      setClearStatus("done");
      addClearLog("Playlist cleared.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to clear playlist.";
      setClearStatus("error");
      addClearLog(message);
    }
  };

  const runTransfer = async () => {
    if (!destVerified || tracks.length === 0 || !destPlaylistId) return;

    const transferQueue = isLikedPlaylist(destPlaylistId, selectedDestPlaylist)
      ? [...tracks].reverse()
      : tracks;

    cancelRef.current = false;
    setTransferStatus("running");
    setProgress({ current: 0, total: transferQueue.length, success: 0, failed: 0 });
    setLogs([]);
    setFailedEntries([]);

    const failed: FailedEntry[] = [];
    let resolvedAuthUser = destAuthUser;

    for (let i = 0; i < transferQueue.length; i++) {
      if (cancelRef.current) break;
      const track = transferQueue[i];
      setProgress(p => ({ ...p, current: i + 1 }));
      addLog(`Processing: ${track.title}`);

      const result = await processTrack(track, resolvedAuthUser);
      if (result.authUser && result.authUser !== resolvedAuthUser) {
        resolvedAuthUser = result.authUser;
        setDestAuthUser(result.authUser);
      }
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
    setSourceMode("ytm");
    setImportMeta(null);
    setImportError(null);
    setImportLoading(false);
    setSourceCookies("");
    setPlaylists([]);
    setSelectedPlaylistId(null);
    setTracks([]);
    setTracksError(null);
    setSourceError(null);
    setDestCookies("");
    setDestAuthUser("0");
    setDestVerified(false);
    setDestError(null);
    setDestPlaylists([]);
    setDestPlaylistId(null);
    setDestPlaylistsError(null);
    setLogs([]);
    setProgress({ current: 0, total: 0, success: 0, failed: 0 });
    setTransferStatus("idle");
    setFailedEntries([]);
    setAllowSearchFallback(false);
    resetClearState();
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
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Music2 className="w-4 h-4 text-primary" />
            Transfer Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
            Transfer Control Center
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Connect your source, verify the destination, and move tracks with full control at every step.
          </p>
        </div>
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
                  <div className="flex items-center gap-2 pb-1">
                    <input
                      id="source-strict-auth"
                      type="checkbox"
                      checked={sourceStrictAuthUser}
                      onChange={(e) => setSourceStrictAuthUser(e.target.checked)}
                      className="rounded bg-white/10 border-white/20 text-primary focus:ring-primary/30"
                    />
                    <label htmlFor="source-strict-auth" className="text-[11px] text-muted-foreground">
                      Lock Auth User (no auto-switch)
                    </label>
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
                  {sourceMode === "ytm" && (
                    <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Music2 className="w-5 h-5" />
                  </div>
                  <div className="text-sm">
                    Ready to transfer <span className="font-bold text-foreground">{tracks.length}</span> tracks from <span className="font-bold text-foreground">{sourceLabel}</span>
                  </div>
                </div>
                {importLoading && <div className="text-xs text-muted-foreground">Loading import...</div>}
                {importError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {importError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Destination Cookies</label>
                    <textarea
                      value={destCookies}
                      onChange={(e) => handleDestCookiesChange(e.target.value)}
                      className={`${inputClass} h-32 font-mono text-xs`}
                      placeholder="cookie: ..."
                    />
                    {sameCookieJar && (
                      <div className="text-xs text-amber-400 mt-2">
                        {sameAccount
                          ? "Destination cookies and Auth User ID match the source. Actions will hit the same account."
                          : "Source and destination share the same cookie jar. Use Auth User ID to target the destination account."}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Auth User ID</label>
                      <input type="text" value={destAuthUser} onChange={(e) => handleDestAuthUserChange(e.target.value)} className={smallInputClass} />
                      <div className="text-[11px] text-muted-foreground mt-1">
                        If your cookies include multiple accounts, set Auth User ID (0, 1, 2...) for the destination profile.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      {destLoading
                        ? "Requesting approval..."
                        : destVerified
                          ? <span className="text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Approved</span>
                          : "Approval required"}
                    </div>
                    <Button onClick={verifyDestination} isLoading={destLoading} disabled={!destCookies}>
                      Request Approval <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                  {destError && <div className="text-red-400 text-sm">{destError}</div>}
                </div>

                {destVerified && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Destination Account</div>
                      <div className="text-sm text-foreground">{formatAccountLabel(destAccount)}</div>
                      {destAccountError && (
                        <div className="text-xs text-amber-400 mt-1">{destAccountError}</div>
                      )}
                      {!destAccountError && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          If this is not your target account, recopy cookies or change Auth User ID.
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Destination Playlist</h3>
                        <p className="text-xs text-muted-foreground">Choose where the approved tracks should go.</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => fetchDestinationPlaylists()} disabled={destPlaylistsLoading}>
                        Refresh
                      </Button>
                    </div>

                    {destPlaylistsLoading ? (
                      <div className="text-sm text-muted-foreground">Loading playlists...</div>
                    ) : (
                      <div className="grid gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {destPlaylists.length === 0 && (
                          <div className="text-sm text-muted-foreground">No playlists found.</div>
                        )}
                        {destPlaylists.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setDestPlaylistId(p.id);
                              resetClearState();
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4
                              ${destPlaylistId === p.id
                                ? "bg-primary/15 border-primary/40 shadow-lg shadow-primary/10"
                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"}
                            `}
                          >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${destPlaylistId === p.id ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"}`}>
                              <Music2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{p.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{p.subtitle}</div>
                            </div>
                            {destPlaylistId === p.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                    {destPlaylistsError && <div className="text-red-400 text-sm">{destPlaylistsError}</div>}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-muted-foreground">
                        {destPlaylistId ? `Selected: ${selectedDestPlaylist?.title || "Playlist"}` : "No destination selected."}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearDestinationPlaylist}
                          disabled={!destPlaylistId || clearStatus === "running" || destPlaylistsLoading}
                        >
                          {clearStatus === "running" ? "Clearing..." : "Clear Playlist"}
                        </Button>
                        <Button size="sm" onClick={() => setStep(4)} disabled={!destPlaylistId || clearStatus === "running"}>
                          Continue <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {clearStatus !== "idle" && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Clear Progress</span>
                          <span className="font-mono">{Math.round((clearProgress.current / (clearProgress.total || 1)) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(clearProgress.current / (clearProgress.total || 1)) * 100}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-400">{clearProgress.removed} Removed</span>
                          <span className="text-red-400">{clearProgress.failed} Failed</span>
                        </div>
                        <div className="max-h-32 bg-black/30 rounded-lg border border-white/5 p-3 overflow-y-auto font-mono text-xs text-muted-foreground space-y-1 custom-scrollbar">
                          {clearLogs.length === 0 ? <span className="text-muted-foreground/50">Waiting...</span> : clearLogs.map((log, i) => (
                            <div key={i} className="hover:text-foreground transition-colors">{log}</div>
                          ))}
                        </div>
                      </div>
                      )}
                      {isLikedPlaylist(destPlaylistId, selectedDestPlaylist) && (
                        <label className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
                          <input
                            type="checkbox"
                            checked={clearUseSearchFallback}
                            onChange={(e) => setClearUseSearchFallback(e.target.checked)}
                            className="rounded bg-white/10 border-white/20 text-primary focus:ring-primary/30"
                          />
                          Search missing IDs when clearing Liked Music (may remove matches from YouTube Liked Videos).
                        </label>
                      )}
                    </div>
                  )}
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

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm space-y-1">
                  <div>Source: <span className="font-semibold text-foreground">{sourceLabel}</span></div>
                  <div>Destination: <span className="font-semibold text-foreground">{selectedDestPlaylist?.title || "Not selected"}</span></div>
                  <div>Destination account: <span className="font-semibold text-foreground">{formatAccountLabel(destAccount)}</span></div>
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
                    <Button onClick={runTransfer} className="w-full" disabled={!destPlaylistId || !destVerified}>
                      Start Transfer Now
                    </Button>
                    {!destPlaylistId && (
                      <div className="text-xs text-muted-foreground">
                        Select a destination playlist to continue.
                      </div>
                    )}
                  </div>
                )}

                {/* Logs */}
                <div className="h-64 bg-black/30 rounded-xl border border-white/5 p-4 overflow-y-auto font-mono text-xs text-muted-foreground space-y-1 custom-scrollbar">
                  {logs.length === 0 ? <span className="text-muted-foreground/50">Waiting to start...</span> : logs.map((log, i) => (
                    <div key={i} className="hover:text-foreground transition-colors">{log}</div>
                  ))}
                </div>

                {failedEntries.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Failed Tracks</div>
                    <div className="grid gap-3">
                      {failedEntries.map((entry, i) => (
                        <div key={`${entry.track.title}-${i}`} className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                          <div className="text-sm text-white">{entry.track.title}</div>
                          <div className="text-xs text-muted-foreground">{entry.track.artist}</div>
                          <div className="text-xs text-red-300 mt-1">{entry.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {transferStatus === 'done' && (
                  <div className="flex justify-center pt-4">
                    <Button onClick={resetAll} variant="outline">Start New Transfer</Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

        </AnimatePresence>

        <div id="tools" className="space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Transfer Tools
            </div>
            <h2 className="text-3xl font-display font-bold text-white">Keep every run organized</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Import lists, review matches, and track your run history without leaving the transfer suite.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Music2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Import from Text</h3>
                <p className="text-sm text-muted-foreground">
                  Paste playlists in lines, CSV, or JSON to prep quick transfers.
                </p>
              </div>
              <Link href="/import">
                <Button variant="outline" size="sm">
                  Open Import <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary-foreground flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Review Queue</h3>
                <p className="text-sm text-muted-foreground">
                  Approve, reject, and filter imports before they ship.
                </p>
              </div>
              <Link href="/review">
                <Button variant="outline" size="sm">
                  Open Review <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Run History</h3>
                <p className="text-sm text-muted-foreground">
                  Track completed runs, exports, and failures in one place.
                </p>
              </div>
              <Link href="/runs">
                <Button variant="outline" size="sm">
                  Open Runs <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
