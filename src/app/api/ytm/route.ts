import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const INNER_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const YTM_API_BASE = "https://music.youtube.com/youtubei/v1";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const CLIENT_VERSIONS = [
  "1.20240207.01.00",
  "1.20240130.01.00",
  "1.20231120.00.00",
];
const MAX_TRACKS_HARD = 20000;
const MAX_PAGES = 250;

type Json = Record<string, unknown>;

type PlaylistItem = {
  id: string;
  title: string;
  subtitle: string | null;
};

type TrackItem = {
  title: string;
  artist: string;
  videoId?: string | null;
};

const KNOWN_RENDERER_KEYS = [
  "musicResponsiveListItemRenderer",
  "playlistVideoRenderer",
  "playlistPanelVideoRenderer",
  "videoRenderer",
] as const;

type KnownRendererKey = (typeof KNOWN_RENDERER_KEYS)[number];

type RendererCandidate = {
  type: KnownRendererKey;
  renderer: Json;
};

type Diagnostics = {
  rendererCounts: Record<string, number>;
  parsedCounts: Record<string, number>;
  missingTitleByType: Record<string, number>;
  missingVideoIdByType: Record<string, number>;
  reportedTotal?: number | null;
  metadataCounts?: Record<string, number>;
  stopReason?: string;
};

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getPath = (value: unknown, path: (string | number)[]): unknown => {
  let current: unknown = value;
  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(current)) return null;
      current = current[key];
      continue;
    }
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return current ?? null;
};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const bumpCount = (bucket: Record<string, number>, key: string, amount = 1) => {
  bucket[key] = (bucket[key] ?? 0) + amount;
};

const getTextFromRuns = (value: unknown) => {
  if (!isRecord(value)) return null;
  if (typeof value.simpleText === "string") return value.simpleText;
  const runs = asArray(value.runs)
    .map((run) => (isRecord(run) ? asString(run.text) : null))
    .filter((text): text is string => Boolean(text))
    .join("");
  return runs || null;
};

const getTextFromNode = (node: unknown) => {
  if (!isRecord(node)) return null;
  const label = asString(getPath(node, ["accessibility", "accessibilityData", "label"]));
  return label || getTextFromRuns(node);
};

const getTitleText = (node: unknown) =>
  getTextFromNode(getPath(node, ["title"])) ||
  getTextFromNode(getPath(node, ["headline"]));

const getBylineText = (node: unknown) =>
  getTextFromNode(getPath(node, ["shortBylineText"])) ||
  getTextFromNode(getPath(node, ["longBylineText"])) ||
  getTextFromNode(getPath(node, ["ownerText"])) ||
  getTextFromNode(getPath(node, ["subtitle"]));

const getColumnText = (renderer: unknown, index: number) => {
  const flexText = getTextFromNode(
    getPath(renderer, [
      "flexColumns",
      index,
      "musicResponsiveListItemFlexColumnRenderer",
      "text",
    ]),
  );
  if (flexText) return flexText;
  const fixedText = getTextFromNode(
    getPath(renderer, [
      "fixedColumns",
      index,
      "musicResponsiveListItemFixedColumnRenderer",
      "text",
    ]),
  );
  return fixedText;
};

const getFlexText = (renderer: unknown, index: number) =>
  getColumnText(renderer, index);

const getTitleFallback = (renderer: unknown) => {
  const titleNode = getPath(renderer, ["title"]);
  return getTextFromNode(titleNode);
};

const getLabelFallback = (renderer: unknown) =>
  asString(getPath(renderer, ["accessibility", "accessibilityData", "label"]));

const parseLabelParts = (label: string) => {
  const separators = [" • ", " · ", " - "];
  for (const separator of separators) {
    if (label.includes(separator)) {
      const parts = label.split(separator).map((part) => part.trim());
      return parts;
    }
  }
  return [label];
};

const collectRendererCandidates = (root: unknown) => {
  const results: RendererCandidate[] = [];
  const stack: unknown[] = [root];
  const captured = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (isRecord(current)) {
      for (const key of KNOWN_RENDERER_KEYS) {
        if (key in current) {
          const renderer = getPath(current, [key]);
          if (isRecord(renderer) && !captured.has(renderer)) {
            results.push({ type: key, renderer });
            captured.add(renderer);
          }
        }
      }

      if (
        "flexColumns" in current &&
        ("playlistItemData" in current || "navigationEndpoint" in current) &&
        !captured.has(current)
      ) {
        results.push({
          type: "musicResponsiveListItemRenderer",
          renderer: current,
        });
        captured.add(current);
      }

      for (const value of Object.values(current)) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
      continue;
    }

    if (Array.isArray(current)) {
      for (const value of current) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
    }
  }

  return results;
};

const getContinuationFromList = (continuations: unknown) => {
  for (const entry of asArray(continuations)) {
    const token =
      asString(getPath(entry, ["nextContinuationData", "continuation"])) ||
      asString(getPath(entry, ["reloadContinuationData", "continuation"])) ||
      asString(
        getPath(entry, [
          "continuationItemRenderer",
          "continuationEndpoint",
          "continuationCommand",
          "token",
        ]),
      ) ||
      asString(
        getPath(entry, [
          "continuationItemRenderer",
          "command",
          "continuationCommand",
          "token",
        ]),
      ) ||
      asString(
        getPath(entry, ["continuationEndpoint", "continuationCommand", "token"]),
      );
    if (token) return token;
  }
  return null;
};

const findContinuationItemToken = (source: unknown) => {
  const stack: unknown[] = [source];
  while (stack.length > 0) {
    const current = stack.pop();
    if (isRecord(current)) {
      if ("continuationItemRenderer" in current) {
        const token =
          asString(
            getPath(current, [
              "continuationItemRenderer",
              "continuationEndpoint",
              "continuationCommand",
              "token",
            ]),
          ) ||
          asString(
            getPath(current, [
              "continuationItemRenderer",
              "command",
              "continuationCommand",
              "token",
            ]),
          );
        if (token) return token;
      }
      for (const value of Object.values(current)) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
      continue;
    }
    if (Array.isArray(current)) {
      for (const value of current) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
    }
  }
  return null;
};

const findAnyContinuationToken = (source: unknown) => {
  const stack: unknown[] = [source];
  while (stack.length > 0) {
    const current = stack.pop();
    if (isRecord(current)) {
      const token =
        asString(getPath(current, ["continuationCommand", "token"])) ||
        asString(getPath(current, ["nextContinuationData", "continuation"])) ||
        asString(getPath(current, ["reloadContinuationData", "continuation"]));
      if (token) return token;
      for (const value of Object.values(current)) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
      continue;
    }
    if (Array.isArray(current)) {
      for (const value of current) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
    }
  }
  return null;
};

const extractContinuationToken = (source: unknown) => {
  const itemToken = findContinuationItemToken(source);
  if (itemToken) return itemToken;

  const directToken =
    getContinuationFromList(
      getPath(source, [
        "continuationContents",
        "musicPlaylistShelfContinuation",
        "continuations",
      ]),
    ) ||
    getContinuationFromList(
      getPath(source, [
        "continuationContents",
        "musicShelfContinuation",
        "continuations",
      ]),
    );
  if (directToken) return directToken;

  const sections = asArray(
    getPath(source, [
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
      0,
      "tabRenderer",
      "content",
      "sectionListRenderer",
      "contents",
    ]),
  );

  const shelf = sections.find((section) => {
    return (
      isRecord(getPath(section, ["musicPlaylistShelfRenderer"])) ||
      isRecord(getPath(section, ["musicShelfRenderer"]))
    );
  });

  const renderer =
    getPath(shelf, ["musicPlaylistShelfRenderer"]) ||
    getPath(shelf, ["musicShelfRenderer"]);
  const rendererToken = getContinuationFromList(getPath(renderer, ["continuations"]));
  if (rendererToken) return rendererToken;
  return findAnyContinuationToken(source);
};

const extractVideoId = (renderer: unknown) =>
  asString(getPath(renderer, ["playlistItemData", "videoId"])) ||
  asString(getPath(renderer, ["videoId"])) ||
  asString(getPath(renderer, ["navigationEndpoint", "watchEndpoint", "videoId"])) ||
  null;

const parseCountFromText = (text: string) => {
  const match = text.match(/([\d,]+)\s+(?:songs?|tracks?|items?|videos?)/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractReportedCount = (source: unknown) => {
  const header =
    getPath(source, ["header", "musicDetailHeaderRenderer"]) ||
    getPath(source, ["header", "musicEditablePlaylistDetailHeaderRenderer"]) ||
    getPath(source, ["header", "musicPlaylistHeaderRenderer"]);
  const candidates = [
    getTextFromNode(getPath(header, ["subtitle"])),
    getTextFromNode(getPath(header, ["secondSubtitle"])),
    getTextFromNode(getPath(header, ["description"])),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const count = parseCountFromText(candidate);
    if (count !== null) return count;
  }
  return null;
};

const parseCountValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/[\d,]+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0].replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractMetadataCounts = (source: unknown) => {
  const keys = [
    "totalItems",
    "totalItemCount",
    "numItems",
    "numSongs",
    "songCount",
    "trackCount",
    "videoCount",
  ];
  const counts: Record<string, number> = {};
  const stack: unknown[] = [source];

  while (stack.length > 0) {
    const current = stack.pop();
    if (isRecord(current)) {
      for (const key of keys) {
        if (key in current) {
          const value = parseCountValue(current[key]);
          if (value !== null) {
            counts[key] = Math.max(counts[key] ?? 0, value);
          }
        }
      }
      for (const value of Object.values(current)) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
      continue;
    }
    if (Array.isArray(current)) {
      for (const value of current) {
        if (typeof value === "object" && value !== null) {
          stack.push(value);
        }
      }
    }
  }

  return counts;
};

const dedupeTracks = (items: TrackItem[]) => {
  const seenVideoIds = new Set<string>();
  const results: TrackItem[] = [];
  for (const item of items) {
    if (item.videoId) {
      if (seenVideoIds.has(item.videoId)) continue;
      seenVideoIds.add(item.videoId);
    }
    results.push(item);
  }
  return results;
};

const mergeCountMaps = (
  target: Record<string, number>,
  source: Record<string, number>,
) => {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
};

const mergeDiagnostics = (base: Diagnostics, incoming: Diagnostics) => {
  mergeCountMaps(base.rendererCounts, incoming.rendererCounts);
  mergeCountMaps(base.parsedCounts, incoming.parsedCounts);
  mergeCountMaps(base.missingTitleByType, incoming.missingTitleByType);
  mergeCountMaps(base.missingVideoIdByType, incoming.missingVideoIdByType);
};

const getCookieValue = (cookies: string, name: string) => {
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
};

const getSapisid = (cookies: string) =>
  getCookieValue(cookies, "SAPISID") ||
  getCookieValue(cookies, "__Secure-3PAPISID") ||
  getCookieValue(cookies, "__Secure-1PAPISID") ||
  getCookieValue(cookies, "APISID");

const generateSidAuth = (sapisid: string, origin: string) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${timestamp} ${sapisid} ${origin}`;
  const hash = crypto.createHash("sha1").update(payload).digest("hex");
  return `SAPISIDHASH ${timestamp}_${hash}`;
};

const sanitizeCookies = (value: string) =>
  value.replace(/^cookie:\s*/i, "").replace(/[\r\n]+/g, "").trim();

const getHeaders = (cookies: string, authUser: string) => {
  const headers: Record<string, string> = {
    Cookie: cookies,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "X-Goog-AuthUser": authUser,
    Origin: "https://music.youtube.com",
    Referer: "https://music.youtube.com/",
  };
  const sapisid = getSapisid(cookies);
  if (sapisid) {
    headers.Authorization = generateSidAuth(sapisid, "https://music.youtube.com");
  }
  const visitorId = getCookieValue(cookies, "VISITOR_INFO1_LIVE");
  if (visitorId) {
    headers["X-Goog-Visitor-Id"] = visitorId;
  }
  return headers;
};

const getContext = (clientVersion: string) => ({
  client: {
    clientName: "WEB_REMIX",
    clientVersion,
    hl: "en",
    gl: "US",
    utcOffsetMinutes: 0,
  },
  user: {
    lockedSafetyMode: false,
  },
});

const isInvalidArgumentError = (error: Error) => {
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid_argument") ||
    message.includes("invalid argument")
  );
};

async function ytmRequest(
  endpoint: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
) {
  const res = await fetch(`${YTM_API_BASE}/${endpoint}?key=${INNER_API_KEY}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `YouTube Music error (${res.status}): ${errorText || res.statusText}`,
    );
  }

  return (await res.json()) as unknown;
}

async function ytmRequestWithFallback(
  endpoint: string,
  bodyFactory: (context: ReturnType<typeof getContext>) => Record<string, unknown>,
  headers: Record<string, string>,
) {
  let lastError: Error | null = null;
  for (const version of CLIENT_VERSIONS) {
    try {
      const context = getContext(version);
      return await ytmRequest(endpoint, bodyFactory(context), headers);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error("Unknown error.");
      if (!isInvalidArgumentError(lastError)) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error("YouTube Music request failed.");
}

async function withAuthUserFallback<T>(
  authUsers: string[],
  request: (headers: Record<string, string>) => Promise<T>,
  cookies: string,
) {
  const uniqueUsers = Array.from(
    new Set(authUsers.map((value) => value.trim()).filter(Boolean)),
  );
  let lastError: Error | null = null;

  for (const authUser of uniqueUsers) {
    try {
      const headers = getHeaders(cookies, authUser);
      const data = await request(headers);
      return { data, authUser };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error("Unknown error.");
      if (!isInvalidArgumentError(err)) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError ?? new Error("YouTube Music request failed.");
}

export async function POST(req: NextRequest) {
  try {
    const { action, cookies, authUser = "0", params } = (await req.json()) as {
      action?: string;
      cookies?: string;
      authUser?: string;
      params?: Record<string, unknown>;
    };

    if (!cookies) {
      return NextResponse.json(
        { error: "Missing cookies in request." },
        { status: 400 },
      );
    }

    const cleanedCookies = sanitizeCookies(cookies);
    if (!cleanedCookies) {
      return NextResponse.json(
        { error: "Cookie value is empty after cleanup." },
        { status: 400 },
      );
    }
    const authUserValue = String(authUser ?? "0").trim() || "0";

    switch (action) {
      case "verify": {
        const { authUser } = await withAuthUserFallback(
          [authUserValue, "0", "1", "2"],
          (headers) =>
            ytmRequestWithFallback(
              "browse",
              (context) => ({ context, browseId: "FEmusic_liked_playlists" }),
              headers,
            ),
          cleanedCookies,
        );
        return NextResponse.json({ ok: true, authUser });
      }

      case "list_playlists": {
        const { data, authUser } = await withAuthUserFallback(
          [authUserValue, "0", "1", "2"],
          (headers) =>
            ytmRequestWithFallback(
              "browse",
              (context) => ({ context, browseId: "FEmusic_liked_playlists" }),
              headers,
            ),
          cleanedCookies,
        );

        const gridItems = asArray(
          getPath(data, [
            "contents",
            "singleColumnBrowseResultsRenderer",
            "tabs",
            0,
            "tabRenderer",
            "content",
            "sectionListRenderer",
            "contents",
            0,
            "gridRenderer",
            "items",
          ]),
        );

        const playlists = gridItems
          .map((item) => {
            const renderer = getPath(item, ["musicTwoRowItemRenderer"]);
            const id = asString(
              getPath(renderer, ["navigationEndpoint", "browseEndpoint", "browseId"]),
            );
            if (!id) return null;
            const title =
              asString(getPath(renderer, ["title", "runs", 0, "text"])) || "Playlist";
            const subtitle = asString(
              getPath(renderer, ["subtitle", "runs", 0, "text"]),
            );
            return { id, title, subtitle } satisfies PlaylistItem;
          })
          .filter((item): item is PlaylistItem => Boolean(item));

        if (!playlists.find((item) => item.id === "LM")) {
          playlists.unshift({
            id: "LM",
            title: "Liked Music",
            subtitle: "Auto-generated",
          });
        }

        return NextResponse.json({ playlists, authUser });
      }

      case "get_playlist_tracks": {
        const initialBrowseId = (params?.id as string | undefined) || "LM";
        const { data, authUser } = await withAuthUserFallback(
          [authUserValue, "0", "1", "2"],
          (headers) =>
            ytmRequestWithFallback(
              "browse",
              (context) => ({ context, browseId: initialBrowseId }),
              headers,
            ),
          cleanedCookies,
        );
        const headers = getHeaders(cleanedCookies, authUser);
        const rawLimit = params?.limit;
        const parsedLimit =
          typeof rawLimit === "number"
            ? rawLimit
            : typeof rawLimit === "string"
              ? Number.parseInt(rawLimit, 10)
              : NaN;
        const maxTracks = Number.isFinite(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, MAX_TRACKS_HARD)
          : MAX_TRACKS_HARD;

        const parseTracks = (source: unknown) => {
          const candidates = collectRendererCandidates(source);
          const diagnostics: Diagnostics = {
            rendererCounts: {},
            parsedCounts: {},
            missingTitleByType: {},
            missingVideoIdByType: {},
          };
          const tracks: TrackItem[] = [];
          let missingTitle = 0;
          let missingVideoId = 0;

          for (const candidate of candidates) {
            const row = candidate.renderer;
            bumpCount(diagnostics.rendererCounts, candidate.type);

            let title: string | null = null;
            let artist: string | null = null;

            if (candidate.type === "musicResponsiveListItemRenderer") {
              title = getFlexText(row, 0) || getTitleFallback(row) || getTitleText(row);
              artist =
                getFlexText(row, 1) ||
                getFlexText(row, 2) ||
                getBylineText(row) ||
                "";
            } else {
              title = getTitleText(row);
              artist = getBylineText(row) || "";
            }

            if (!title || !artist) {
              const label = getLabelFallback(row);
              if (label) {
                const parts = parseLabelParts(label);
                if (!title && parts[0]) title = parts[0];
                if (!artist && parts[1]) artist = parts[1];
              }
            }

            if (!title) {
              missingTitle += 1;
              bumpCount(diagnostics.missingTitleByType, candidate.type);
              continue;
            }

            if (!artist) {
              artist = "Unknown Artist";
            }

            const videoId = extractVideoId(row);
            if (!videoId) {
              missingVideoId += 1;
              bumpCount(diagnostics.missingVideoIdByType, candidate.type);
            }

            bumpCount(diagnostics.parsedCounts, candidate.type);
            tracks.push({ title, artist, videoId } satisfies TrackItem);
          }

          return { tracks, missingTitle, missingVideoId, diagnostics };
        };

        const fetchContinuationPage = async (
          continuation: string,
          browseId?: string,
        ) => {
          try {
            return await ytmRequestWithFallback(
              "browse",
              (context) => ({ context, continuation }),
              headers,
            );
          } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error("Unknown error.");
            if (!browseId || !isInvalidArgumentError(err)) {
              throw err;
            }
            return await ytmRequestWithFallback(
              "browse",
              (context) => ({ context, continuation, browseId }),
              headers,
            );
          }
        };

        const collectAllTracks = async (seedData: unknown, browseId: string) => {
          const initialParse = parseTracks(seedData);
          const diagnostics: Diagnostics = {
            rendererCounts: {},
            parsedCounts: {},
            missingTitleByType: {},
            missingVideoIdByType: {},
            reportedTotal: extractReportedCount(seedData),
            metadataCounts: extractMetadataCounts(seedData),
          };
          mergeDiagnostics(diagnostics, initialParse.diagnostics);

          let tracks = dedupeTracks(initialParse.tracks);
          let missingTitle = initialParse.missingTitle;
          let missingVideoId = initialParse.missingVideoId;
          let continuation = extractContinuationToken(seedData);
          let pages = 1;
          let pageGuard = 0;
          let emptyPages = 0;
          let stopReason = "no-continuation";

          while (
            continuation &&
            tracks.length < maxTracks &&
            pageGuard < MAX_PAGES
          ) {
            const nextData = await fetchContinuationPage(continuation, browseId);
            const parsedNext = parseTracks(nextData);
            mergeDiagnostics(diagnostics, parsedNext.diagnostics);
            tracks = dedupeTracks([...tracks, ...parsedNext.tracks]);
            missingTitle += parsedNext.missingTitle;
            missingVideoId += parsedNext.missingVideoId;
            continuation = extractContinuationToken(nextData);
            pages += 1;
            pageGuard += 1;

            if (parsedNext.tracks.length === 0) {
              emptyPages += 1;
            } else {
              emptyPages = 0;
            }
            if (emptyPages >= 2) {
              stopReason = "empty-pages";
              break;
            }
          }

          if (stopReason !== "empty-pages") {
            if (tracks.length >= maxTracks) {
              stopReason = "max-tracks";
            } else if (pageGuard >= MAX_PAGES) {
              stopReason = "max-pages";
            } else if (!continuation) {
              stopReason = "no-continuation";
            }
          }
          diagnostics.stopReason = stopReason;

          return { tracks, pages, continuation, missingTitle, missingVideoId, diagnostics };
        };

        let { tracks, pages, continuation, missingTitle, missingVideoId, diagnostics } =
          await collectAllTracks(
            data,
            initialBrowseId,
          );

        if (tracks.length === 0 && initialBrowseId !== "LM") {
          const alternateId = initialBrowseId.startsWith("VL")
            ? initialBrowseId.slice(2)
            : `VL${initialBrowseId}`;
          const retryData = await ytmRequestWithFallback(
            "browse",
            (context) => ({ context, browseId: alternateId }),
            headers,
          );
          const retryResult = await collectAllTracks(retryData, alternateId);
          tracks = retryResult.tracks;
          pages = retryResult.pages;
          continuation = retryResult.continuation;
          missingTitle = retryResult.missingTitle;
          missingVideoId = retryResult.missingVideoId;
          diagnostics = retryResult.diagnostics;
        }

        const truncated = Boolean(continuation) && tracks.length >= maxTracks;

        return NextResponse.json({
          tracks: tracks.slice(0, maxTracks),
          count: tracks.length,
          authUser,
          pages,
          truncated,
          missingTitle,
          missingVideoId,
          diagnostics,
        });
      }

      case "search": {
        const query = params?.query as string | undefined;
        if (!query) {
          return NextResponse.json(
            { error: "Missing search query." },
            { status: 400 },
          );
        }
        const data = await ytmRequestWithFallback(
          "search",
          (context) => ({ context, query, params: null }),
          getHeaders(cleanedCookies, authUserValue),
        );

        const sections = asArray(
          getPath(data, [
            "contents",
            "tabbedSearchResultsRenderer",
            "tabs",
            0,
            "tabRenderer",
            "content",
            "sectionListRenderer",
            "contents",
          ]),
        );
        const shelf = sections.find((section) =>
          isRecord(getPath(section, ["musicShelfRenderer"])),
        );
        const items = asArray(getPath(shelf, ["musicShelfRenderer", "contents"]));
        const top = items[0];
        const videoId = asString(
          getPath(top, ["musicResponsiveListItemRenderer", "playlistItemData", "videoId"]),
        );
        return NextResponse.json({ videoId: videoId || null });
      }

      case "like": {
        const videoId = params?.videoId as string | undefined;
        if (!videoId) {
          return NextResponse.json(
            { error: "Missing videoId." },
            { status: 400 },
          );
        }
        await ytmRequestWithFallback(
          "like/like",
          (context) => ({ context, target: { videoId } }),
          getHeaders(cleanedCookies, authUserValue),
        );
        return NextResponse.json({ success: true });
      }

      case "remove_like": {
        const videoId = params?.videoId as string | undefined;
        if (!videoId) {
          return NextResponse.json(
            { error: "Missing videoId." },
            { status: 400 },
          );
        }
        await ytmRequestWithFallback(
          "like/removelike",
          (context) => ({ context, target: { videoId } }),
          getHeaders(cleanedCookies, authUserValue),
        );
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action." },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
