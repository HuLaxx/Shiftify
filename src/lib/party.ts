const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type QueueItem = {
    id: string;
    title: string;
    artist?: string | null;
    durationMs?: number | null;
    videoId?: string | null;
    sourceUrl?: string | null;
    votes?: Record<string, number>;
};

export type NowPlaying = {
    item: QueueItem | null;
    positionMs: number;
    isPlaying: boolean;
    startedAt: string | null;
    updatedAt: string;
};

export type PartyRoom = {
    code: string;
    name: string | null;
    host_id: string;
    co_dj_ids?: string[];
    now_playing: NowPlaying | null;
    queue: QueueItem[];
    created_at: string;
    updated_at: string;
};

export type PartyMessage = {
    id: string;
    room_code: string;
    user_id: string;
    display_name: string;
    message: string;
    created_at: string;
};

export const generateRoomCode = (length = 6) => {
    const values = new Uint32Array(length);
    const alphabetLength = ROOM_ALPHABET.length;
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(values);
    } else {
        for (let i = 0; i < length; i += 1) {
            values[i] = Math.floor(Math.random() * alphabetLength);
        }
    }

    let result = "";
    for (let i = 0; i < length; i += 1) {
        result += ROOM_ALPHABET[values[i] % alphabetLength];
    }
    return result;
};

export const generateClientId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const createEmptyNowPlaying = (): NowPlaying => ({
    item: null,
    positionMs: 0,
    isPlaying: false,
    startedAt: null,
    updatedAt: new Date().toISOString(),
});

export const parseYouTubeVideoId = (input: string) => {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    try {
        const url = new URL(trimmed);
        if (url.hostname.includes("youtu.be")) {
            return url.pathname.replace("/", "") || null;
        }
        if (url.hostname.includes("youtube.com")) {
            const v = url.searchParams.get("v");
            if (v) return v;
            const pathMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
            if (pathMatch) return pathMatch[1];
        }
    } catch {
        return trimmed.length >= 8 ? trimmed : null;
    }

    return trimmed.length >= 8 ? trimmed : null;
};

export const computePlaybackPosition = (nowPlaying: NowPlaying | null, nowMs: number = Date.now()) => {
    if (!nowPlaying) return 0;
    if (!nowPlaying.isPlaying || !nowPlaying.startedAt) {
        return nowPlaying.positionMs;
    }
    const startedAtMs = Date.parse(nowPlaying.startedAt);
    if (Number.isNaN(startedAtMs)) return nowPlaying.positionMs;
    return nowPlaying.positionMs + Math.max(0, nowMs - startedAtMs);
};
