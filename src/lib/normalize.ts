export type RawTrack = {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  duration?: string | number | null;
};

export type NormalizedTrack = {
  title: string;
  artist: string;
  album: string | null;
  durationMs: number | null;
  normalizedTitle: string;
  normalizedArtist: string;
  normalizedKey: string;
  score: number;
  valid: boolean;
};

const clean = (value: string) =>
  value
    .replace(/[\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeText = (value: string) =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const parseDurationMs = (value: RawTrack["duration"]) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 100000) return Math.floor(value);
    return Math.floor(value * 1000);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const asNumber = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(asNumber)) return null;
    if (asNumber > 100000) return asNumber;
    return asNumber * 1000;
  }
  const parts = trimmed.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return null;
};

const scoreTrack = (title: string, artist: string, album: string | null, durationMs: number | null) => {
  let score = 0;
  if (title) score += 50;
  if (artist) score += 35;
  if (album) score += 10;
  if (durationMs) score += 5;
  if (title.length < 3) score -= 10;
  if (artist.length < 2) score -= 10;
  return Math.max(0, Math.min(100, score));
};

export const normalizeTrack = (raw: RawTrack): NormalizedTrack => {
  const title = clean(raw.title ?? "");
  const artist = clean(raw.artist ?? "");
  const album = raw.album ? clean(raw.album) : null;
  const durationMs = parseDurationMs(raw.duration ?? null);

  const normalizedTitle = normalizeText(title);
  const normalizedArtist = normalizeText(artist);
  const normalizedKey = `${normalizedTitle}::${normalizedArtist}`;
  const valid = Boolean(normalizedTitle && normalizedArtist);

  return {
    title,
    artist,
    album,
    durationMs,
    normalizedTitle,
    normalizedArtist,
    normalizedKey,
    score: scoreTrack(title, artist, album, durationMs),
    valid,
  };
};
