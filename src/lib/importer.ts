import { parse as parseCsv } from "csv-parse/sync";
import { NormalizedTrack, RawTrack, normalizeTrack } from "./normalize";

export type ImportFormat = "csv" | "json" | "lines";

export type ImportParseResult = {
  items: NormalizedTrack[];
  invalid: NormalizedTrack[];
  warnings: string[];
};

const pickValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
};

const extractFromRow = (row: Record<string, unknown>): RawTrack => {
  const lowerRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const title = pickValue(lowerRow, [
    "title",
    "track",
    "track_name",
    "name",
    "song",
  ]);
  const artist = pickValue(lowerRow, [
    "artist",
    "artists",
    "artist_name",
    "primary_artist",
    "album_artist",
  ]);
  const album = pickValue(lowerRow, ["album", "album_name"]);
  const duration = pickValue(lowerRow, [
    "duration",
    "duration_ms",
    "length",
    "time",
    "milliseconds",
  ]);
  return { title, artist, album, duration };
};

const parseLines = (content: string): RawTrack[] =>
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(" - ");
      if (parts.length >= 2) {
        return { title: parts[0]?.trim(), artist: parts.slice(1).join(" - ").trim() };
      }
      return { title: line.trim(), artist: "" };
    });

const parseCsvContent = (content: string): RawTrack[] => {
  const records = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, unknown>[];

  return records.map((row) => extractFromRow(row));
};

const parseJsonContent = (content: string): RawTrack[] => {
  const parsed = JSON.parse(content) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.map((entry) =>
      typeof entry === "object" && entry !== null
        ? extractFromRow(entry as Record<string, unknown>)
        : {},
    );
  }
  if (parsed && typeof parsed === "object") {
    const container =
      (parsed as Record<string, unknown>).tracks ??
      (parsed as Record<string, unknown>).items;
    if (Array.isArray(container)) {
      return container.map((entry) =>
        typeof entry === "object" && entry !== null
          ? extractFromRow(entry as Record<string, unknown>)
          : {},
      );
    }
  }
  return [];
};

export const parseImportContent = (
  format: ImportFormat,
  content: string,
): ImportParseResult => {
  const warnings: string[] = [];
  let rawTracks: RawTrack[] = [];

  try {
    if (format === "lines") {
      rawTracks = parseLines(content);
    } else if (format === "csv") {
      rawTracks = parseCsvContent(content);
    } else if (format === "json") {
      rawTracks = parseJsonContent(content);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parse failed.";
    warnings.push(message);
  }

  const items: NormalizedTrack[] = [];
  const invalid: NormalizedTrack[] = [];

  for (const raw of rawTracks) {
    const normalized = normalizeTrack(raw);
    if (normalized.valid) {
      items.push(normalized);
    } else {
      invalid.push(normalized);
    }
  }

  if (rawTracks.length === 0) {
    warnings.push("No rows detected. Check format or delimiter.");
  }

  return { items, invalid, warnings };
};
