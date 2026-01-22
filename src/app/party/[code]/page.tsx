
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    Copy,
    Crown,
    MessageCircle,
    Music2,
    Pause,
    Play,
    Plus,
    Radio,
    SkipForward,
    ThumbsDown,
    ThumbsUp,
    Users,
} from "lucide-react";

import { toDataURL } from "qrcode";
import type { RealtimeChannel } from "@supabase/supabase-js";

import PageLayout from "@/components/PageLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
    PartyMessage,
    PartyRoom,
    QueueItem,
    computePlaybackPosition,
    createEmptyNowPlaying,
    generateClientId,
    parseYouTubeVideoId,
} from "@/lib/party";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type YouTubePlayer = {
    loadVideoById: (videoId: string, startSeconds?: number) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
    getCurrentTime: () => number;
    getPlayerState: () => number;
};

type YouTubePlayerEvent = {
    data: number;
    target: YouTubePlayer;
};

type ReactionBurst = {
    id: string;
    emoji: string;
    left: number;
    top: number;
    createdAt: number;
};

const REACTION_OPTIONS = ["\u{1F525}", "\u2728", "\u{1F4A5}", "\u{1F44F}", "\u{1F389}", "\u2764\uFE0F"];

const VOTE_MIN_COUNT = 3;
const VOTE_DOWN_RATIO = 0.6;

const summarizeVotes = (votes?: Record<string, number>) => {
    let up = 0;
    let down = 0;
    if (votes) {
        Object.values(votes).forEach((value) => {
            if (value > 0) up += 1;
            if (value < 0) down += 1;
        });
    }
    return { up, down, total: up + down };
};

const getUserVote = (votes: Record<string, number> | undefined, voterId: string) => {
    if (!voterId || !votes) return 0;
    return votes[voterId] ?? 0;
};

const shouldAutoSkip = (votes?: Record<string, number>) => {
    const summary = summarizeVotes(votes);
    if (summary.total < VOTE_MIN_COUNT) return false;
    return summary.down / summary.total >= VOTE_DOWN_RATIO;
};

const applyVoteMap = (votes: Record<string, number> | undefined, voterId: string, value: number) => {
    const nextVotes = { ...(votes ?? {}) };
    if (!voterId) return nextVotes;
    if (value === 0) {
        delete nextVotes[voterId];
    } else {
        nextVotes[voterId] = value;
    }
    return nextVotes;
};

let youtubeApiPromise: Promise<void> | null = null;

const loadYouTubeApi = () => {
    if (typeof window === "undefined") return Promise.reject(new Error("Missing window."));
    const existing = (window as typeof window & { YT?: { Player: unknown } }).YT;
    if (existing?.Player) return Promise.resolve();
    if (youtubeApiPromise) return youtubeApiPromise;

    youtubeApiPromise = new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onload = () => {
            if ((window as typeof window & { YT?: { Player: unknown } }).YT?.Player) {
                resolve();
                return;
            }
            (window as typeof window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => resolve();
        };
        script.onerror = () => reject(new Error("Failed to load YouTube API."));
        document.body.appendChild(script);
    });

    return youtubeApiPromise;
};

const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const shortId = (value: string) => {
    if (value.length <= 10) return value;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

export default function PartyRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomCode = typeof params.code === "string" ? params.code.toUpperCase() : "";

    const [room, setRoom] = useState<PartyRoom | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [nowPlaying, setNowPlaying] = useState(createEmptyNowPlaying());
    const [messages, setMessages] = useState<PartyMessage[]>([]);
    const [displayName, setDisplayName] = useState("Guest");
    const [userId, setUserId] = useState<string | null>(null);
    const [roomError, setRoomError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messageInput, setMessageInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [trackUrl, setTrackUrl] = useState("");
    const [trackTitle, setTrackTitle] = useState("");
    const [trackArtist, setTrackArtist] = useState("");
    const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
    const [copyState, setCopyState] = useState("");
    const [copyLinkState, setCopyLinkState] = useState("");
    const [joinUrl, setJoinUrl] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [qrError, setQrError] = useState("");
    const [reactionBursts, setReactionBursts] = useState<ReactionBurst[]>([]);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const [clockOffsetMs, setClockOffsetMs] = useState(0);
    const [syncState, setSyncState] = useState("idle");
    const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
    const [djRequests, setDjRequests] = useState<Array<{ userId: string; displayName: string }>>([]);
    const [coDjNames, setCoDjNames] = useState<Record<string, string>>({});
    const [djRequestStatus, setDjRequestStatus] = useState("");

    const playerRef = useRef<YouTubePlayer | null>(null);
    const playerContainerRef = useRef<HTMLDivElement | null>(null);
    const roomRef = useRef<PartyRoom | null>(null);
    const reactionChannelRef = useRef<RealtimeChannel | null>(null);
    const voteChannelRef = useRef<RealtimeChannel | null>(null);
    const djChannelRef = useRef<RealtimeChannel | null>(null);
    const syncChannelRef = useRef<RealtimeChannel | null>(null);
    const latencySamplesRef = useRef<number[]>([]);
    const clientIdRef = useRef(generateClientId());
    const latencyRef = useRef<number | null>(null);
    const isHostRef = useRef(false);
    const autoSkipRef = useRef<string | null>(null);
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    const isHost = useMemo(() => Boolean(room && userId && room.host_id === userId), [room, userId]);
    const isCoDj = useMemo(
        () => Boolean(room && userId && room.co_dj_ids?.includes(userId)),
        [room, userId],
    );
    const canControl = isHost || isCoDj;
    const coDjIds = useMemo(() => room?.co_dj_ids ?? [], [room]);
    const canRequestDj = Boolean(userId) && !isHost && !isCoDj;
    const voterId = userId ?? "";
    const canVote = Boolean(userId);
    const nowPositionMs = useMemo(
        () => computePlaybackPosition(nowPlaying, Date.now() - clockOffsetMs),
        [nowPlaying, clockOffsetMs],
    );
    const fallbackDurationMs = 4 * 60 * 1000;
    const latencyLabel = latencyMs !== null ? `${latencyMs} ms` : "Measuring...";
    const offsetLabel = `${Math.round(clockOffsetMs)} ms`;
    const syncLabel = syncState === "synced"
        ? "Synced"
        : syncState === "requesting"
            ? "Requesting..."
            : syncState === "sent"
                ? "Pulse sent"
                : "Idle";
    const roleLabel = isHost ? "Host" : isCoDj ? "Co-DJ" : "Guest";
    const roleStatus = isHost ? "Host control enabled" : isCoDj ? "Co-DJ control enabled" : "Guest synced";
    const nowVoteSummary = useMemo(() => summarizeVotes(nowPlaying.item?.votes), [nowPlaying]);
    const nowUserVote = useMemo(() => getUserVote(nowPlaying.item?.votes, voterId), [nowPlaying, voterId]);

    const pushBurst = useCallback(
        (emoji: string) => {
            const id = generateClientId();
            const left = 10 + Math.random() * 80;
            const top = 10 + Math.random() * 60;
            setReactionBursts((prev) => [
                ...prev.slice(-20),
                { id, emoji, left, top, createdAt: Date.now() },
            ]);
            setTimeout(() => {
                setReactionBursts((prev) => prev.filter((burst) => burst.id !== id));
            }, 2200);
        },
        [],
    );

    const recordLatencySample = useCallback((rttMs: number) => {
        const samples = [...latencySamplesRef.current, rttMs].slice(-6);
        latencySamplesRef.current = samples;
        const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        setLatencyMs(Math.round(avg));
    }, []);

    const sendPing = useCallback(async () => {
        const channel = syncChannelRef.current;
        if (!channel) return;
        await channel.send({
            type: "broadcast",
            event: "ping",
            payload: { clientId: clientIdRef.current, sentAt: Date.now() },
        });
    }, []);

    const sendSyncPulse = useCallback(async () => {
        const channel = syncChannelRef.current;
        if (!channel || !isHostRef.current) return;
        await channel.send({
            type: "broadcast",
            event: "sync",
            payload: { hostTime: Date.now() },
        });
        setSyncState("sent");
        setLastSyncAt(new Date().toISOString());
    }, []);

    const requestSync = useCallback(async () => {
        const channel = syncChannelRef.current;
        if (!channel) return;
        await channel.send({
            type: "broadcast",
            event: "sync_request",
            payload: { requesterId: clientIdRef.current },
        });
        setSyncState("requesting");
    }, []);

    const applyVoteToQueue = useCallback(async (itemId: string, value: number, voter: string) => {
        if (!isHostRef.current) return;
        let nextQueue: QueueItem[] | null = null;
        setQueue((prev) => {
            nextQueue = prev.map((item) => {
                if (item.id !== itemId) return item;
                return { ...item, votes: applyVoteMap(item.votes, voter, value) };
            });
            return nextQueue;
        });
        if (!nextQueue) return;
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.from("party_rooms").update({ queue: nextQueue }).eq("code", roomCode);
        if (error) {
            setRoomError(error.message);
        }
    }, [roomCode]);

    const applyVoteToNowPlaying = useCallback(async (value: number, voter: string) => {
        if (!isHostRef.current) return;
        let nextNowPlaying: PartyRoom["now_playing"] | null = null;
        setNowPlaying((prev) => {
            if (!prev.item) return prev;
            const nextItem = { ...prev.item, votes: applyVoteMap(prev.item.votes, voter, value) };
            nextNowPlaying = {
                ...prev,
                item: nextItem,
                updatedAt: new Date().toISOString(),
            };
            return nextNowPlaying;
        });
        if (!nextNowPlaying) return;
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.from("party_rooms").update({ now_playing: nextNowPlaying }).eq("code", roomCode);
        if (error) {
            setRoomError(error.message);
        }
    }, [roomCode]);

    const sendVote = useCallback(async (target: "queue" | "now", itemId: string | null, value: number) => {
        const channel = voteChannelRef.current;
        if (!channel || !voterId) return;
        await channel.send({
            type: "broadcast",
            event: "vote",
            payload: { target, itemId, value, voterId },
        });
    }, [voterId]);

    const handleVote = async (target: "queue" | "now", itemId: string | null, value: number) => {
        if (!canVote) return;
        if (isHost) {
            if (target === "queue" && itemId) {
                await applyVoteToQueue(itemId, value, voterId);
                return;
            }
            if (target === "now") {
                await applyVoteToNowPlaying(value, voterId);
            }
            return;
        }
        await sendVote(target, itemId, value);
    };

    const formatCoDjLabel = useCallback(
        (id: string) => {
            if (id === userId && displayName) return displayName;
            const label = coDjNames[id];
            if (label) return label;
            return `DJ ${shortId(id)}`;
        },
        [coDjNames, displayName, userId],
    );

    const updateCoDjList = useCallback(async (nextCoDjs: string[]) => {
        if (!room || !isHost) return;
        const supabase = getSupabaseBrowserClient();
        setIsUpdatingRoom(true);
        const { error } = await supabase
            .from("party_rooms")
            .update({ co_dj_ids: nextCoDjs })
            .eq("code", roomCode);
        if (error) {
            setRoomError(error.message);
        }
        setIsUpdatingRoom(false);
    }, [room, isHost, roomCode]);

    const approveDjRequest = useCallback(async (requestId: string) => {
        if (!room || !isHost) return;
        const nextCoDjs = Array.from(new Set([...(room.co_dj_ids ?? []), requestId]));
        await updateCoDjList(nextCoDjs);
        setDjRequests((prev) => prev.filter((request) => request.userId !== requestId));
    }, [room, isHost, updateCoDjList]);

    const revokeCoDj = useCallback(async (targetId: string) => {
        if (!room || !isHost) return;
        const nextCoDjs = (room.co_dj_ids ?? []).filter((id) => id !== targetId);
        await updateCoDjList(nextCoDjs);
    }, [room, isHost, updateCoDjList]);

    const dismissDjRequest = useCallback((requestId: string) => {
        setDjRequests((prev) => prev.filter((request) => request.userId !== requestId));
    }, []);

    const handoffHost = useCallback(async (nextHostId: string) => {
        if (!room || !isHost) return;
        if (nextHostId === room.host_id) return;
        const previousHostId = room.host_id;
        const nextCoDjs = new Set(room.co_dj_ids ?? []);
        nextCoDjs.delete(nextHostId);
        if (previousHostId) {
            nextCoDjs.add(previousHostId);
        }
        const supabase = getSupabaseBrowserClient();
        setIsUpdatingRoom(true);
        const { error } = await supabase
            .from("party_rooms")
            .update({ host_id: nextHostId, co_dj_ids: Array.from(nextCoDjs) })
            .eq("code", roomCode);
        if (error) {
            setRoomError(error.message);
        }
        setIsUpdatingRoom(false);
        setDjRequests((prev) => prev.filter((request) => request.userId !== nextHostId));
    }, [room, isHost, roomCode]);

    const sendDjRequest = useCallback(async () => {
        if (!userId || !canRequestDj) return;
        const channel = djChannelRef.current;
        if (!channel) return;
        await channel.send({
            type: "broadcast",
            event: "dj_request",
            payload: { userId, displayName: displayName || "Guest" },
        });
        setDjRequestStatus("Request sent");
        setTimeout(() => setDjRequestStatus(""), 2500);
    }, [userId, canRequestDj, displayName]);

    useEffect(() => {
        latencyRef.current = latencyMs;
    }, [latencyMs]);

    useEffect(() => {
        roomRef.current = room;
    }, [room]);

    useEffect(() => {
        if (!userId || !displayName) return;
        setCoDjNames((prev) => ({ ...prev, [userId]: displayName }));
    }, [userId, displayName]);

    useEffect(() => {
        isHostRef.current = isHost;
        if (isHost) {
            setClockOffsetMs(0);
        }
    }, [isHost]);

    useEffect(() => {
        const storedName = localStorage.getItem("party:displayName");
        if (storedName) setDisplayName(storedName);
    }, []);

    useEffect(() => {
        if (!roomCode || typeof window === "undefined") return;
        setJoinUrl(`${window.location.origin}/party/${roomCode}`);
    }, [roomCode]);

    useEffect(() => {
        if (!joinUrl) return;
        let isActive = true;
        setQrError("");
        const generateQr = async () => {
            try {
                const url = await toDataURL(joinUrl, {
                    width: 220,
                    margin: 1,
                    color: { dark: "#0b0b0b", light: "#ffffff" },
                });
                if (isActive) setQrDataUrl(url);
            } catch {
                if (isActive) {
                    setQrDataUrl("");
                    setQrError("QR unavailable");
                }
            }
        };
        generateQr();
        return () => {
            isActive = false;
        };
    }, [joinUrl]);

    useEffect(() => {
        if (!isSupabaseConfigured) return;
        const supabase = getSupabaseBrowserClient();
        const init = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (data.session?.user) {
                    setUserId(data.session.user.id);
                    return;
                }
                const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
                if (anonError || !anonData.user) throw anonError ?? new Error("Anonymous sign-in failed.");
                setUserId(anonData.user.id);
            } catch (error: unknown) {
                setRoomError(error instanceof Error ? error.message : "Failed to start session.");
                setIsLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!roomCode || !userId || !isSupabaseConfigured) return;
        const supabase = getSupabaseBrowserClient();
        let isActive = true;

        const fetchRoom = async () => {
            setIsLoading(true);
            setRoomError(null);
            try {
                const { data, error } = await supabase
                    .from("party_rooms")
                    .select("*")
                    .eq("code", roomCode)
                    .maybeSingle();
                if (error) throw error;
                if (!data) throw new Error("Room not found.");
                if (!isActive) return;
                setRoom(data as PartyRoom);
                setQueue((data as PartyRoom).queue || []);
                setNowPlaying((data as PartyRoom).now_playing || createEmptyNowPlaying());

                const { data: messageRows } = await supabase
                    .from("party_messages")
                    .select("*")
                    .eq("room_code", roomCode)
                    .order("created_at", { ascending: true })
                    .limit(200);
                if (isActive && messageRows) {
                    setMessages(messageRows as PartyMessage[]);
                }
            } catch (error: unknown) {
                if (!isActive) return;
                setRoomError(error instanceof Error ? error.message : "Failed to load room.");
            } finally {
                if (isActive) setIsLoading(false);
            }
        };

        fetchRoom();

        const roomChannel = supabase
            .channel(`party_rooms:${roomCode}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "party_rooms", filter: `code=eq.${roomCode}` },
                (payload) => {
                    if (!payload.new) return;
                    const updated = payload.new as PartyRoom;
                    setRoom(updated);
                    setQueue(updated.queue || []);
                    setNowPlaying(updated.now_playing || createEmptyNowPlaying());
                },
            )
            .subscribe();

        const messageChannel = supabase
            .channel(`party_messages:${roomCode}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "party_messages", filter: `room_code=eq.${roomCode}` },
                (payload) => {
                    if (!payload.new) return;
                    setMessages((prev) => [...prev, payload.new as PartyMessage]);
                },
            )
            .subscribe();

        const reactionChannel = supabase
            .channel(`party_reactions:${roomCode}`)
            .on("broadcast", { event: "reaction" }, (payload) => {
                const emoji = (payload.payload as { emoji?: string })?.emoji;
                if (emoji) pushBurst(emoji);
            })
            .subscribe();

        const syncChannel = supabase
            .channel(`party_sync:${roomCode}`)
            .on("broadcast", { event: "ping" }, (payload) => {
                const data = payload.payload as { clientId?: string; sentAt?: number };
                if (data.clientId === clientIdRef.current && typeof data.sentAt === "number") {
                    recordLatencySample(Date.now() - data.sentAt);
                }
            })
            .on("broadcast", { event: "sync" }, (payload) => {
                const data = payload.payload as { hostTime?: number };
                if (typeof data.hostTime !== "number") return;
                const oneWay = (latencyRef.current ?? 0) / 2;
                const hostTimeAtReceive = data.hostTime + oneWay;
                const offset = Date.now() - hostTimeAtReceive;
                if (!isHostRef.current) {
                    setClockOffsetMs((prev) => (prev === 0 ? Math.round(offset) : Math.round(prev * 0.7 + offset * 0.3)));
                } else {
                    setClockOffsetMs(0);
                }
                setSyncState("synced");
                setLastSyncAt(new Date().toISOString());
            })
            .on("broadcast", { event: "sync_request" }, () => {
                if (isHostRef.current) {
                    sendSyncPulse();
                }
            })
            .subscribe();

        const voteChannel = supabase
            .channel(`party_votes:${roomCode}`)
            .on("broadcast", { event: "vote" }, (payload) => {
                const data = payload.payload as { target?: "queue" | "now"; itemId?: string | null; value?: number; voterId?: string };
                if (!data?.voterId) return;
                if (data.target === "queue" && data.itemId) {
                    void applyVoteToQueue(data.itemId, data.value ?? 0, data.voterId);
                    return;
                }
                if (data.target === "now") {
                    void applyVoteToNowPlaying(data.value ?? 0, data.voterId);
                }
            })
            .subscribe();

        const djChannel = supabase
            .channel(`party_dj:${roomCode}`)
            .on("broadcast", { event: "dj_request" }, (payload) => {
                if (!isHostRef.current) return;
                const data = payload.payload as { userId?: string; displayName?: string };
                const requestUserId = data?.userId;
                if (!requestUserId) return;
                const currentRoom = roomRef.current;
                if (currentRoom?.host_id === requestUserId) return;
                if (currentRoom?.co_dj_ids?.includes(requestUserId)) return;
                const name = (data.displayName ?? "").trim() || "Guest";
                setDjRequests((prev) => {
                    if (prev.some((request) => request.userId === requestUserId)) return prev;
                    return [...prev, { userId: requestUserId, displayName: name }];
                });
                setCoDjNames((prev) => ({ ...prev, [requestUserId]: name }));
            })
            .subscribe();

        reactionChannelRef.current = reactionChannel;
        voteChannelRef.current = voteChannel;
        djChannelRef.current = djChannel;
        syncChannelRef.current = syncChannel;
        if (!isHostRef.current) {
            requestSync();
        }

        return () => {
            isActive = false;
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(reactionChannel);
            supabase.removeChannel(voteChannel);
            supabase.removeChannel(djChannel);
            supabase.removeChannel(syncChannel);
            reactionChannelRef.current = null;
            voteChannelRef.current = null;
            djChannelRef.current = null;
            syncChannelRef.current = null;
        };
    }, [roomCode, userId, pushBurst, recordLatencySample, sendSyncPulse, requestSync, applyVoteToQueue, applyVoteToNowPlaying]);

    useEffect(() => {
        if (!roomCode) return;
        const interval = setInterval(() => {
            sendPing();
        }, 5000);
        sendPing();
        return () => {
            clearInterval(interval);
        };
    }, [roomCode, sendPing]);

    useEffect(() => {
        if (!isHost) return;
        const interval = setInterval(() => {
            sendSyncPulse();
        }, 8000);
        sendSyncPulse();
        return () => {
            clearInterval(interval);
        };
    }, [isHost, sendSyncPulse]);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (nowPlaying.isPlaying) {
            timer = setInterval(() => {
                setNowPlaying((prev) => ({ ...prev }));
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [nowPlaying.isPlaying]);

    useEffect(() => {
        const syncPlayer = async () => {
            if (!nowPlaying.item?.videoId || !playerContainerRef.current) return;
            try {
                await loadYouTubeApi();
                const YT = (window as typeof window & { YT?: { Player: new (el: HTMLElement, options: Record<string, unknown>) => YouTubePlayer } }).YT;
                if (!YT?.Player) return;

                if (!playerRef.current) {
                    playerRef.current = new YT.Player(playerContainerRef.current, {
                        videoId: nowPlaying.item.videoId,
                        playerVars: {
                            autoplay: 0,
                            modestbranding: 1,
                            rel: 0,
                            controls: isHost ? 1 : 0,
                        },
                        events: {
                            onStateChange: (event: YouTubePlayerEvent) => {
                                if (!isHost || !room) return;
                                if (!nowPlaying.item) return;
                                if (event.data === 1) {
                                    const currentMs = event.target.getCurrentTime() * 1000;
                                    updateNowPlaying({
                                        ...nowPlaying,
                                        positionMs: currentMs,
                                        isPlaying: true,
                                        startedAt: new Date().toISOString(),
                                    });
                                } else if (event.data === 2) {
                                    const currentMs = event.target.getCurrentTime() * 1000;
                                    updateNowPlaying({
                                        ...nowPlaying,
                                        positionMs: currentMs,
                                        isPlaying: false,
                                        startedAt: null,
                                    });
                                } else if (event.data === 0) {
                                    handleSkip();
                                }
                            },
                        },
                    });
                    setActiveVideoId(nowPlaying.item.videoId);
                } else if (activeVideoId !== nowPlaying.item.videoId) {
                    playerRef.current.loadVideoById(
                        nowPlaying.item.videoId,
                        Math.floor(computePlaybackPosition(nowPlaying, Date.now() - clockOffsetMs) / 1000),
                    );
                    setActiveVideoId(nowPlaying.item.videoId);
                }

                if (playerRef.current) {
                    const targetSeconds = Math.floor(computePlaybackPosition(nowPlaying, Date.now() - clockOffsetMs) / 1000);
                    const currentSeconds = Math.floor(playerRef.current.getCurrentTime());
                    const drift = Math.abs(targetSeconds - currentSeconds);
                    if (drift > 2) {
                        playerRef.current.seekTo(targetSeconds, true);
                    }
                    if (nowPlaying.isPlaying) {
                        playerRef.current.playVideo();
                    } else {
                        playerRef.current.pauseVideo();
                    }
                }
            } catch {
                return;
            }
        };

        syncPlayer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nowPlaying, isHost, room, activeVideoId, clockOffsetMs]);

    const updateNowPlaying = useCallback(async (nextNowPlaying: PartyRoom["now_playing"]) => {
        if (!room || !canControl) return;
        const supabase = getSupabaseBrowserClient();
        setIsUpdatingRoom(true);
        const updated = {
            now_playing: {
                ...nextNowPlaying,
                item: nextNowPlaying?.item ?? null,
                updatedAt: new Date().toISOString(),
            },
        };
        setNowPlaying((updated.now_playing as NowPlaying) || createEmptyNowPlaying());
        const { error } = await supabase.from("party_rooms").update(updated).eq("code", roomCode);
        if (error) {
            setRoomError(error.message);
        }
        setIsUpdatingRoom(false);
    }, [room, canControl, roomCode]);

    const updateQueue = useCallback(async (nextQueue: QueueItem[]) => {
        if (!room || !canControl) return;
        const supabase = getSupabaseBrowserClient();
        setIsUpdatingRoom(true);
        setQueue(nextQueue);
        const { error } = await supabase.from("party_rooms").update({ queue: nextQueue }).eq("code", roomCode);
        if (error) {
            setRoomError(error.message);
        }
        setIsUpdatingRoom(false);
    }, [room, canControl, roomCode]);

    const handleAddTrack = async () => {
        if (!canControl) return;
        if (!trackUrl.trim()) return;
        const videoId = parseYouTubeVideoId(trackUrl);
        if (!videoId) {
            setRoomError("Invalid YouTube link.");
            return;
        }
        const nextItem: QueueItem = {
            id: generateClientId(),
            title: trackTitle.trim() || `Track ${videoId}`,
            artist: trackArtist.trim() || null,
            videoId,
            sourceUrl: trackUrl.trim(),
        };
        await updateQueue([...queue, nextItem]);
        setTrackUrl("");
        setTrackTitle("");
        setTrackArtist("");
    };

    const handleStartNext = useCallback(async () => {
        if (!canControl) return;
        if (!queue.length) return;
        const [next, ...rest] = queue;
        const nextNowPlaying = {
            item: next,
            positionMs: 0,
            isPlaying: true,
            startedAt: new Date(Date.now() - clockOffsetMs).toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await updateQueue(rest);
        await updateNowPlaying(nextNowPlaying);
    }, [canControl, queue, clockOffsetMs, updateQueue, updateNowPlaying]);

    const handleTogglePlay = async () => {
        if (!canControl) return;
        if (!nowPlaying.item) return;
        if (nowPlaying.isPlaying) {
            const currentSeconds = playerRef.current?.getCurrentTime?.();
            const currentMs = Number.isFinite(currentSeconds) ? currentSeconds * 1000 : nowPositionMs;
            await updateNowPlaying({
                ...nowPlaying,
                positionMs: currentMs,
                isPlaying: false,
                startedAt: null,
            });
            playerRef.current?.pauseVideo();
        } else {
            await updateNowPlaying({
                ...nowPlaying,
                positionMs: nowPositionMs,
                isPlaying: true,
                startedAt: new Date(Date.now() - clockOffsetMs).toISOString(),
            });
            playerRef.current?.playVideo();
        }
    };

    const handleSkip = useCallback(async () => {
        if (!canControl) return;
        if (!queue.length) {
            await updateNowPlaying({
                ...nowPlaying,
                isPlaying: false,
                positionMs: 0,
                startedAt: null,
                item: null,
            });
            return;
        }
        await handleStartNext();
    }, [canControl, queue.length, nowPlaying, updateNowPlaying, handleStartNext]);

    useEffect(() => {
        autoSkipRef.current = null;
    }, [nowPlaying.item?.id]);

    useEffect(() => {
        if (!isHost || !nowPlaying.item) return;
        if (autoSkipRef.current === nowPlaying.item.id) return;
        if (!shouldAutoSkip(nowPlaying.item.votes)) return;
        autoSkipRef.current = nowPlaying.item.id;
        void handleSkip();
    }, [isHost, nowPlaying.item, handleSkip]);

    const handleRemoveFromQueue = async (id: string) => {
        if (!canControl) return;
        const nextQueue = queue.filter((item) => item.id !== id);
        await updateQueue(nextQueue);
    };

    const sendReaction = async (emoji: string) => {
        pushBurst(emoji);
        const channel = reactionChannelRef.current;
        if (!channel) return;
        await channel.send({
            type: "broadcast",
            event: "reaction",
            payload: { emoji },
        });
    };

    const sendMessage = async () => {
        const content = messageInput.trim();
        if (!content || !userId) return;
        setIsSending(true);
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.from("party_messages").insert({
            room_code: roomCode,
            user_id: userId,
            display_name: displayName,
            message: content,
        });
        if (error) {
            setRoomError(error.message);
        } else {
            setMessageInput("");
        }
        setIsSending(false);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopyState("Copied!");
        } catch {
            setCopyState("Copy failed");
        }
        setTimeout(() => setCopyState(""), 2000);
    };

    const handleCopyLink = async () => {
        if (!joinUrl) return;
        try {
            await navigator.clipboard.writeText(joinUrl);
            setCopyLinkState("Copied!");
        } catch {
            setCopyLinkState("Copy failed");
        }
        setTimeout(() => setCopyLinkState(""), 2000);
    };

    if (!isSupabaseConfigured) {
        return (
            <PageLayout>
                <Card variant="elevated" className="p-8 max-w-2xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span>Supabase is not configured. See `docs/party-mode.md`.</span>
                    </div>
                </Card>
            </PageLayout>
        );
    }

    if (isLoading) {
        return (
            <PageLayout>
                <Card variant="elevated" className="p-10 text-center max-w-xl mx-auto">
                    <div className="text-muted-foreground text-sm">Loading room...</div>
                </Card>
            </PageLayout>
        );
    }

    if (roomError) {
        return (
            <PageLayout>
                <Card variant="elevated" className="p-8 max-w-2xl mx-auto space-y-4 text-center">
                    <div className="flex items-center justify-center gap-3 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span>{roomError}</span>
                    </div>
                    <Button variant="outline" onClick={() => router.push("/party")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Party
                    </Button>
                </Card>
            </PageLayout>
        );
    }

    if (!room) return null;

    return (
        <PageLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Room</div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white">{room.name || `Room ${roomCode}`}</h1>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-mono">{roomCode}</span>
                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                            >
                                <Copy className="w-3 h-3" />
                                {copyState || "Copy code"}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-muted-foreground">
                            {isHost ? (
                                <Crown className="w-4 h-4 text-amber-400" />
                            ) : isCoDj ? (
                                <Music2 className="w-4 h-4 text-primary" />
                            ) : (
                                <Users className="w-4 h-4" />
                            )}
                            <span>{roleLabel}</span>
                        </div>
                        <Button variant="outline" onClick={() => router.push("/party")}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Leave
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
                    <Card variant="elevated" className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                                    <Radio className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-display font-semibold">Now Playing</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {nowPlaying.item ? "Synced from host" : "Add a track to start the party"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {isUpdatingRoom ? "Syncing..." : "Live"}
                            </div>
                        </div>

                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video">
                            {nowPlaying.item?.videoId ? (
                                <div ref={playerContainerRef} className="w-full h-full" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                                    <Music2 className="w-10 h-10" />
                                    <span className="text-sm">Waiting for the first track...</span>
                                </div>
                            )}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {reactionBursts.map((burst) => (
                                    <span
                                        key={burst.id}
                                        className="reaction-burst"
                                        style={{ left: `${burst.left}%`, top: `${burst.top}%` }}
                                        aria-hidden="true"
                                    >
                                        {burst.emoji}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-lg font-medium text-white">
                                        {nowPlaying.item?.title || "No track selected"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {nowPlaying.item?.artist || "Add artist or channel info"}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">{formatTime(nowPositionMs)}</div>
                            </div>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-orange-500"
                                    style={{ width: nowPlaying.item ? `${Math.min(100, (nowPositionMs / fallbackDurationMs) * 100)}%` : "0%" }}
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTogglePlay}
                                    disabled={!canControl || !nowPlaying.item}
                                >
                                    {nowPlaying.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    <span className="ml-2">{nowPlaying.isPlaying ? "Pause" : "Play"}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSkip}
                                    disabled={!canControl || (!queue.length && !nowPlaying.item)}
                                >
                                    <SkipForward className="w-4 h-4" /> <span className="ml-2">Skip</span>
                                </Button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => handleVote("now", null, nowUserVote === 1 ? 0 : 1)}
                                        disabled={!canVote || !nowPlaying.item}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${nowUserVote === 1 ? "bg-primary/20 border-primary/40 text-white" : "text-muted-foreground border-white/10 hover:text-white hover:border-white/20"} ${!canVote || !nowPlaying.item ? "opacity-40 cursor-not-allowed" : ""}`}
                                    >
                                        <ThumbsUp className="w-3 h-3" /> {nowVoteSummary.up}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleVote("now", null, nowUserVote === -1 ? 0 : -1)}
                                        disabled={!canVote || !nowPlaying.item}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${nowUserVote === -1 ? "bg-red-500/20 border-red-500/40 text-white" : "text-muted-foreground border-white/10 hover:text-white hover:border-white/20"} ${!canVote || !nowPlaying.item ? "opacity-40 cursor-not-allowed" : ""}`}
                                    >
                                        <ThumbsDown className="w-3 h-3" /> {nowVoteSummary.down}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {canControl && (
                            <div className="space-y-4 border-t border-white/10 pt-5">
                                <div className="text-sm uppercase tracking-wider text-muted-foreground">
                                    {isHost ? "Host Controls" : "Co-DJ Controls"}
                                </div>
                                <div className="grid gap-3">
                                    <input
                                        value={trackUrl}
                                        onChange={(event) => setTrackUrl(event.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-all outline-none"
                                        placeholder="Paste YouTube link or ID"
                                    />
                                    <div className="grid md:grid-cols-2 gap-3">
                                        <input
                                            value={trackTitle}
                                            onChange={(event) => setTrackTitle(event.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-all outline-none"
                                            placeholder="Track title"
                                        />
                                        <input
                                            value={trackArtist}
                                            onChange={(event) => setTrackArtist(event.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-all outline-none"
                                            placeholder="Artist or channel"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button onClick={handleAddTrack} size="sm">
                                            <Plus className="w-4 h-4 mr-2" /> Add to queue
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={handleStartNext} disabled={!queue.length}>
                                            <Play className="w-4 h-4 mr-2" /> Start next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card variant="elevated" className="p-6 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary-foreground flex items-center justify-center">
                                <Music2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-display font-semibold">Up Next</h2>
                                <p className="text-sm text-muted-foreground">{queue.length ? `${queue.length} tracks queued` : "Queue is empty"}</p>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                            {queue.length === 0 && (
                                <div className="text-sm text-muted-foreground">Drop in links to build the vibe.</div>
                            )}
                            {queue.map((item, index) => {
                                const summary = summarizeVotes(item.votes);
                                const userVote = getUserVote(item.votes, voterId);
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xs text-muted-foreground">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-white truncate">{item.title}</div>
                                            <div className="text-xs text-muted-foreground truncate">{item.artist || "YouTube"}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleVote("queue", item.id, userVote === 1 ? 0 : 1)}
                                                disabled={!canVote}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${userVote === 1 ? "bg-primary/20 border-primary/40 text-white" : "text-muted-foreground border-white/10 hover:text-white hover:border-white/20"} ${!canVote ? "opacity-40 cursor-not-allowed" : ""}`}
                                            >
                                                <ThumbsUp className="w-3 h-3" /> {summary.up}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleVote("queue", item.id, userVote === -1 ? 0 : -1)}
                                                disabled={!canVote}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${userVote === -1 ? "bg-red-500/20 border-red-500/40 text-white" : "text-muted-foreground border-white/10 hover:text-white hover:border-white/20"} ${!canVote ? "opacity-40 cursor-not-allowed" : ""}`}
                                            >
                                                <ThumbsDown className="w-3 h-3" /> {summary.down}
                                            </button>
                                        </div>
                                        {canControl && (
                                            <button
                                                onClick={() => handleRemoveFromQueue(item.id)}
                                                className="text-xs text-muted-foreground hover:text-white transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
                    <Card variant="elevated" className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-display font-semibold">Chat</h2>
                                <p className="text-sm text-muted-foreground">Reactions, votes, and callouts.</p>
                            </div>
                        </div>

                        <div className="h-64 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {messages.length === 0 && (
                                <div className="text-sm text-muted-foreground">No messages yet. Start the convo.</div>
                            )}
                            {messages.map((msg) => (
                                <div key={msg.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-xs text-muted-foreground mb-1">{msg.display_name}</div>
                                    <div className="text-sm text-white">{msg.message}</div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Reactions</div>
                            <div className="flex flex-wrap items-center gap-2">
                                {REACTION_OPTIONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => sendReaction(emoji)}
                                        className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-lg hover:bg-white/10 hover:scale-110 transition-all"
                                        aria-label={`React with ${emoji}`}
                                    >
                                        <span>{emoji}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                value={messageInput}
                                onChange={(event) => setMessageInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") sendMessage();
                                }}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-all outline-none"
                                placeholder="Type a message"
                            />
                            <Button variant="secondary" size="sm" onClick={sendMessage} isLoading={isSending}>
                                Send
                            </Button>
                        </div>
                    </Card>

                    <Card variant="elevated" className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-secondary-foreground" />
                            </div>
                            <div>
                                <h2 className="text-xl font-display font-semibold">Room Vibe</h2>
                                <p className="text-sm text-muted-foreground">Party stats update in realtime.</p>
                            </div>
                        </div>

                        <div className="grid gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <span>Now playing</span>
                                <span className="text-white truncate max-w-[160px]">{nowPlaying.item?.title || "Idle"}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <span>Queue length</span>
                                <span className="text-white">{queue.length}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <span>Role</span>
                                <span className="text-white">{roleStatus}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <span>Latency</span>
                                <span className="text-white">{latencyLabel}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                <span>Sync offset</span>
                                <span className="text-white">{offsetLabel}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <Button variant="outline" size="sm" onClick={isHost ? sendSyncPulse : requestSync}>
                                {isHost ? "Broadcast sync" : "Request sync"}
                            </Button>
                            <span className="uppercase tracking-[0.3em]">{syncLabel}</span>
                            {lastSyncAt && (
                                <span>Last sync {new Date(lastSyncAt).toLocaleTimeString()}</span>
                            )}
                        </div>

                        <div className="border-t border-white/10 pt-4 space-y-3">
                            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">DJ Handoff</div>
                            {isHost ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">Co-DJs</div>
                                        {coDjIds.length === 0 ? (
                                            <div className="text-xs text-muted-foreground">No co-DJs yet.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {coDjIds.map((id) => (
                                                    <div
                                                        key={id}
                                                        className="flex items-center justify-between gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs"
                                                    >
                                                        <span className="text-white truncate">{formatCoDjLabel(id)}</span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handoffHost(id)}
                                                                className="px-2 py-1 rounded-md border border-amber-400/30 text-amber-300 hover:text-amber-200 hover:border-amber-400/60 transition-colors"
                                                            >
                                                                Make host
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => revokeCoDj(id)}
                                                                className="px-2 py-1 rounded-md border border-white/10 text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
                                                            >
                                                                Revoke
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">Requests</div>
                                        {djRequests.length === 0 ? (
                                            <div className="text-xs text-muted-foreground">No requests yet.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {djRequests.map((request) => (
                                                    <div
                                                        key={request.userId}
                                                        className="flex items-center justify-between gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs"
                                                    >
                                                        <span className="text-white truncate">
                                                            {request.displayName || formatCoDjLabel(request.userId)}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => approveDjRequest(request.userId)}
                                                                className="px-2 py-1 rounded-md border border-primary/40 text-primary-foreground hover:border-primary/70 transition-colors"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => dismissDjRequest(request.userId)}
                                                                className="px-2 py-1 rounded-md border border-white/10 text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
                                                            >
                                                                Dismiss
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground">
                                        {isCoDj ? "Co-DJ access enabled." : "Request DJ access to control playback."}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={sendDjRequest}
                                            disabled={!canRequestDj || Boolean(djRequestStatus)}
                                        >
                                            Request DJ Access
                                        </Button>
                                        {djRequestStatus && (
                                            <span className="text-xs text-muted-foreground">{djRequestStatus}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-white/10 pt-4 space-y-3">
                            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">QR Join</div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="rounded-xl bg-white p-2 w-fit">
                                    {qrDataUrl ? (
                                        <Image
                                            src={qrDataUrl}
                                            alt="Room QR code"
                                            width={128}
                                            height={128}
                                            className="w-32 h-32"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-32 h-32 flex items-center justify-center text-xs text-black/60">
                                            {qrError || "Generating..."}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2 text-xs text-muted-foreground">
                                    <div className="text-white break-all">{joinUrl || "Loading link..."}</div>
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                                    >
                                        <Copy className="w-3 h-3" />
                                        {copyLinkState || "Copy link"}
                                    </button>
                                    <div className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                                        Scan to join
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
}
