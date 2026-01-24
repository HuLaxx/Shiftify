import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const INNER_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const YTM_API_BASE = "https://music.youtube.com/youtubei/v1";
const ORIGIN = "https://music.youtube.com";
const CLIENT_NAME = "67";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const CLIENT_VERSIONS = [
  "1.20240207.01.00",
  "1.20240130.01.00",
  "1.20231120.00.00",
];
const MAX_TRACKS_HARD = 20000;
const MAX_PAGES = 250;
const AUTH_USER_FALLBACK = Array.from({ length: 10 }, (_, index) => String(index));

type Json = Record<string, unknown>;

type PlaylistItem = {
  id: string;
  title: string;
  subtitle: string | null;
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

type AccountInfo = {
  name: string | null;
  email: string | null;
  handle: string | null;
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

type TabInfo = {
  title: string | null;
  tabIdentifier: string | null;
  browseId: string | null;
  params: string | null;
  content: unknown;
  selected: boolean;
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
  const parts = label
    .split(/\s+(?:\u2022|\u00b7|\u2013|\u2014|-|\|)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [label];
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

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const isValidVideoId = (value: string | null | undefined) =>
  typeof value === "string" && VIDEO_ID_REGEX.test(value);

const firstValidVideoId = (...candidates: Array<string | null | undefined>) => {
  for (const candidate of candidates) {
    if (isValidVideoId(candidate)) return candidate;
  }
  return null;
};

const extractVideoId = (renderer: unknown) =>
  firstValidVideoId(
    asString(getPath(renderer, ["playlistItemData", "videoId"])),
    asString(getPath(renderer, ["videoId"])),
    asString(getPath(renderer, ["navigationEndpoint", "watchEndpoint", "videoId"])),
  );

const normalizePlaylistTitle = (value: string | null) =>
  value?.trim().toLowerCase() ?? "";

const isLikedMusicTitle = (title: string | null) =>
  normalizePlaylistTitle(title) === "liked music";

const normalizeLikedPlaylist = (item: PlaylistItem): PlaylistItem => {
  if (item.id === "LM" || item.editId === "LM" || isLikedMusicTitle(item.title)) {
    const browseId =
      item.browseId ??
      (item.id !== "LM" ? item.id : null) ??
      "LM";
    return {
      ...item,
      id: "LM",
      title: "Liked Music",
      subtitle: item.subtitle ?? "Auto-generated",
      editId: null,
      browseId,
    };
  }
  return item;
};

const dedupePlaylists = (items: PlaylistItem[]) => {
  const seen = new Set<string>();
  const result: PlaylistItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
};

const moveLikedFirst = (items: PlaylistItem[]) => {
  const likedIndex = items.findIndex((item) => item.id === "LM");
  if (likedIndex <= 0) return items;
  const liked = items[likedIndex];
  return [liked, ...items.slice(0, likedIndex), ...items.slice(likedIndex + 1)];
};

const normalizeBrowseId = (id: string) =>
  id === "LM" ? "LM" : id.startsWith("VL") ? id : `VL${id}`;

const extractTabs = (source: unknown) => {
  const tabs = asArray(
    getPath(source, [
      "contents",
      "singleColumnBrowseResultsRenderer",
      "tabs",
    ]),
  );
  const results: TabInfo[] = [];

  for (const tab of tabs) {
    const tabRenderer = getPath(tab, ["tabRenderer"]);
    if (!isRecord(tabRenderer)) continue;
    const title = getTextFromNode(getPath(tabRenderer, ["title"]));
    const tabIdentifier = asString(getPath(tabRenderer, ["tabIdentifier"]));
    const browseEndpoint = getPath(tabRenderer, ["endpoint", "browseEndpoint"]);
    const browseId = asString(getPath(browseEndpoint, ["browseId"]));
    const params = asString(getPath(browseEndpoint, ["params"]));
    const content = getPath(tabRenderer, ["content"]);
    const selected = Boolean(getPath(tabRenderer, ["selected"]));

    results.push({
      title,
      tabIdentifier,
      browseId,
      params,
      content,
      selected,
    });
  }

  return results;
};

const isSongsTab = (tab: TabInfo) => {
  const title = normalizePlaylistTitle(tab.title);
  if (title.includes("song") || title.includes("track")) return true;
  const identifier = tab.tabIdentifier?.toLowerCase() ?? "";
  return identifier.includes("song") || identifier.includes("track");
};

const pickPreferredTab = (tabs: TabInfo[]) =>
  tabs.find(isSongsTab) || tabs.find((tab) => tab.selected) || tabs[0] || null;

const derivePlaylistEditId = (browseId: string, renderer: unknown) => {
  if (browseId === "LM") return null;
  const playlistId =
    asString(
      getPath(renderer, ["navigationEndpoint", "watchPlaylistEndpoint", "playlistId"]),
    ) ||
    asString(getPath(renderer, ["navigationEndpoint", "watchEndpoint", "playlistId"])) ||
    asString(getPath(renderer, ["navigationEndpoint", "playlistEndpoint", "playlistId"])) ||
    asString(getPath(renderer, ["playlistId"]));
  if (playlistId) return playlistId;
  return browseId.startsWith("VL") ? browseId.slice(2) : browseId;
};

const findFirstStringByKey = (source: unknown, key: string) => {
  const stack: unknown[] = [source];
  while (stack.length > 0) {
    const current = stack.pop();
    if (isRecord(current)) {
      const value = current[key];
      if (typeof value === "string") return value;
      for (const entry of Object.values(current)) {
        if (typeof entry === "object" && entry !== null) {
          stack.push(entry);
        }
      }
      continue;
    }
    if (Array.isArray(current)) {
      for (const entry of current) {
        if (typeof entry === "object" && entry !== null) {
          stack.push(entry);
        }
      }
    }
  }
  return null;
};

const extractAccountInfo = (source: unknown): AccountInfo => {
  const header =
    getPath(source, [
      "actions",
      0,
      "openPopupAction",
      "popup",
      "multiPageMenuRenderer",
      "header",
      "activeAccountHeaderRenderer",
    ]) ||
    getPath(source, [
      "actions",
      0,
      "openPopupAction",
      "popup",
      "multiPageMenuRenderer",
      "header",
      "accountHeaderRenderer",
    ]);

  const name =
    getTextFromNode(getPath(header, ["accountName"])) ||
    getTextFromNode(getPath(header, ["name"])) ||
    getTextFromNode(getPath(header, ["channelName"])) ||
    null;

  const email =
    getTextFromNode(getPath(header, ["email"])) ||
    findFirstStringByKey(source, "email") ||
    null;

  const handle =
    getTextFromNode(getPath(header, ["channelHandle"])) ||
    getTextFromNode(getPath(header, ["handle"])) ||
    null;

  return { name, email, handle };
};

const findPlaylistEditEndpoint = (source: unknown) => {
  const stack: unknown[] = [source];
  while (stack.length > 0) {
    const current = stack.pop();
    if (isRecord(current)) {
      if (isRecord(current.playlistEditEndpoint)) {
        return current.playlistEditEndpoint;
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

const getPlaylistEditEndpoint = (renderer: unknown) => {
  const menuItems = asArray(getPath(renderer, ["menu", "menuRenderer", "items"]));
  for (const item of menuItems) {
    const endpoint =
      getPath(item, ["menuServiceItemRenderer", "serviceEndpoint", "playlistEditEndpoint"]) ||
      getPath(item, ["menuServiceItemRenderer", "playlistEditEndpoint"]);
    if (isRecord(endpoint)) {
      return endpoint;
    }
  }
  return findPlaylistEditEndpoint(renderer);
};

const extractSetVideoId = (renderer: unknown) => {
  const directSet =
    asString(getPath(renderer, ["playlistItemData", "setVideoId"])) ||
    asString(getPath(renderer, ["playlistItemData", "playlistSetVideoId"])) ||
    asString(getPath(renderer, ["setVideoId"])) ||
    asString(getPath(renderer, ["playlistSetVideoId"]));
  const directRemoved =
    asString(getPath(renderer, ["playlistItemData", "removedVideoId"])) ||
    asString(getPath(renderer, ["removedVideoId"]));
  if (directSet || directRemoved) {
    return { setVideoId: directSet ?? null, removedVideoId: directRemoved ?? null };
  }

  const endpoint = getPlaylistEditEndpoint(renderer);
  if (endpoint) {
    const actions = asArray(getPath(endpoint, ["actions"]));
    for (const action of actions) {
      const setVideoId = asString(getPath(action, ["setVideoId"]));
      const removedVideoId = asString(getPath(action, ["removedVideoId"]));
      if (setVideoId || removedVideoId) {
        return { setVideoId: setVideoId ?? null, removedVideoId: removedVideoId ?? null };
      }
    }
  }
  const fallbackSet = findFirstStringByKey(renderer, "setVideoId");
  const fallbackRemoved = findFirstStringByKey(renderer, "removedVideoId");
  return { setVideoId: fallbackSet ?? null, removedVideoId: fallbackRemoved ?? null };
};

const extractPlaylistId = (renderer: unknown) => {
  const direct =
    asString(getPath(renderer, ["playlistItemData", "playlistId"])) ||
    asString(getPath(renderer, ["playlistId"]));
  if (direct) return direct;
  const endpoint = getPlaylistEditEndpoint(renderer);
  const fromEndpoint = endpoint ? asString(getPath(endpoint, ["playlistId"])) : null;
  return fromEndpoint ?? null;
};

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

const stripQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const extractCookieHeader = (value: string) => {
  const headerMatch = value.match(/(?:^|\r?\n)\s*cookie:\s*([^\r\n]+)/i);
  if (headerMatch?.[1]) return stripQuotes(headerMatch[1]);
  const curlMatch = value.match(/-H\s+['"]?cookie:\s*([^'"]+)['"]?/i);
  if (curlMatch?.[1]) return stripQuotes(curlMatch[1]);
  return null;
};

const parseNetscapeCookies = (value: string) => {
  const lines = value.split(/\r?\n/);
  const pairs: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 7) continue;
    const name = parts[5];
    const cookieValue = parts[6];
    if (name && cookieValue) {
      pairs.push(`${name}=${cookieValue}`);
    }
  }
  return pairs.length ? pairs.join("; ") : null;
};

const parseJsonCookies = (value: string) => {
  try {
    const parsed = JSON.parse(value) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.cookies)
        ? parsed.cookies
        : null;
    if (!list) return null;
    const pairs = list
      .map((entry) => {
        if (!isRecord(entry)) return null;
        const name = asString(entry.name) ?? asString(entry.Name);
        const cookieValue = asString(entry.value) ?? asString(entry.Value);
        if (!name || !cookieValue) return null;
        return `${name}=${cookieValue}`;
      })
      .filter((pair): pair is string => Boolean(pair));
    return pairs.length ? pairs.join("; ") : null;
  } catch {
    return null;
  }
};

const normalizeCookies = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const header = extractCookieHeader(trimmed);
  if (header) return header;
  const netscape = parseNetscapeCookies(trimmed);
  if (netscape) return netscape;
  const json = parseJsonCookies(trimmed);
  if (json) return json;
  return trimmed.replace(/^cookie:\s*/i, "").replace(/[\r\n]+/g, "").trim();
};

const sanitizeCookies = (value: string) => normalizeCookies(value);

const buildAuthUserCandidates = (authUser: string) => {
  const primary = String(authUser ?? "").trim();
  const candidates: string[] = [];
  if (primary) candidates.push(primary);
  for (const fallback of AUTH_USER_FALLBACK) {
    if (!candidates.includes(fallback)) candidates.push(fallback);
  }
  return candidates.length ? candidates : ["0"];
};

const getHeaders = (cookies: string, authUser: string) => {
  const headers: Record<string, string> = {
    Cookie: cookies,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "X-Goog-AuthUser": authUser,
    Origin: ORIGIN,
    Referer: `${ORIGIN}/`,
    "X-Origin": ORIGIN,
    "X-Youtube-Client-Name": CLIENT_NAME,
  };
  const sapisid = getSapisid(cookies);
  if (sapisid) {
    headers.Authorization = generateSidAuth(sapisid, ORIGIN);
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
      const versionedHeaders = {
        ...headers,
        "X-Youtube-Client-Version": version,
      };
      return await ytmRequest(endpoint, bodyFactory(context), versionedHeaders);
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

  const tried = uniqueUsers.length ? ` (authUser tried: ${uniqueUsers.join(", ")})` : "";
  if (lastError) {
    throw new Error(`${lastError.message}${tried}`);
  }
  throw new Error(`YouTube Music request failed.${tried}`);
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
    const hasSapisid = Boolean(getSapisid(cleanedCookies));
    if (!hasSapisid) {
      return NextResponse.json(
        {
          error:
            "Missing SAPISID / __Secure-3PAPISID in cookies. Paste the full cookie header from music.youtube.com.",
        },
        { status: 400 },
      );
    }
    const authUserValue = String(authUser ?? "0").trim() || "0";
    const strictAuthUser =
      params?.strictAuthUser === true || params?.strictAuthUser === "true";
    const authCandidates = strictAuthUser
      ? [authUserValue]
      : buildAuthUserCandidates(authUserValue);

    switch (action) {
      case "verify": {
        const { authUser } = await withAuthUserFallback(
          authCandidates,
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

      case "account_info": {
        const { data, authUser } = await withAuthUserFallback(
          authCandidates,
          (headers) =>
            ytmRequestWithFallback(
              "account/account_menu",
              (context) => ({ context }),
              headers,
            ),
          cleanedCookies,
        );
        const account = extractAccountInfo(data);
        return NextResponse.json({ account, authUser });
      }

      case "list_playlists": {
        const { data, authUser } = await withAuthUserFallback(
          authCandidates,
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
            const editId = derivePlaylistEditId(id, renderer);
            return { id, title, subtitle, editId, browseId: id } satisfies PlaylistItem;
          })
          .filter((item): item is PlaylistItem => Boolean(item));

        let normalizedPlaylists = dedupePlaylists(
          playlists.map((item) => normalizeLikedPlaylist(item)),
        );

        if (!normalizedPlaylists.find((item) => item.id === "LM")) {
          normalizedPlaylists.unshift({
            id: "LM",
            title: "Liked Music",
            subtitle: "Auto-generated",
            editId: null,
            browseId: "LM",
          });
        } else {
          normalizedPlaylists = moveLikedFirst(normalizedPlaylists);
        }

        return NextResponse.json({ playlists: normalizedPlaylists, authUser });
      }

      case "get_playlist_tracks": {
        const requestedId = (params?.id as string | undefined) || "LM";
        const browseId = normalizeBrowseId(requestedId);
        const { data, authUser } = await withAuthUserFallback(
          authCandidates,
          (headers) =>
            ytmRequestWithFallback(
              "browse",
              (context) => ({ context, browseId }),
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
        const shouldDedupe = params?.dedupe !== false;

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

            let videoId = extractVideoId(row);
            if (!videoId) {
              const fallback = findFirstStringByKey(row, "videoId");
              if (isValidVideoId(fallback)) {
                videoId = fallback;
              }
            }
            const { setVideoId, removedVideoId } = extractSetVideoId(row);
            const playlistId = extractPlaylistId(row);
            const fallbackVideoId = isValidVideoId(removedVideoId) ? removedVideoId : null;
            if (!videoId && fallbackVideoId) {
              videoId = fallbackVideoId;
            }
            if (!videoId) {
              missingVideoId += 1;
              bumpCount(diagnostics.missingVideoIdByType, candidate.type);
            }

            bumpCount(diagnostics.parsedCounts, candidate.type);
            tracks.push({
              title,
              artist,
              videoId: videoId ?? null,
              setVideoId,
              playlistId,
            } satisfies TrackItem);
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

          const applyDedupe = (items: TrackItem[]) => (shouldDedupe ? dedupeTracks(items) : items);
          let tracks = applyDedupe(initialParse.tracks);
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
            tracks = applyDedupe([...tracks, ...parsedNext.tracks]);
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
            browseId,
          );

        if (tracks.length === 0 && browseId === "LM") {
          const tabs = extractTabs(data);
          const preferredTab = pickPreferredTab(tabs);
          if (preferredTab) {
            const tabBrowseId = preferredTab.browseId ?? browseId;
            let fallbackResult: Awaited<ReturnType<typeof collectAllTracks>> | null = null;

            if (preferredTab.content) {
              const contentResult = await collectAllTracks(
                preferredTab.content,
                tabBrowseId,
              );
              if (contentResult.tracks.length > 0) {
                fallbackResult = contentResult;
              }
            }

            if (!fallbackResult && (preferredTab.params || preferredTab.browseId)) {
              const tabData = await ytmRequestWithFallback(
                "browse",
                (context) => ({
                  context,
                  browseId: tabBrowseId,
                  ...(preferredTab.params ? { params: preferredTab.params } : {}),
                }),
                headers,
              );
              const tabResult = await collectAllTracks(tabData, tabBrowseId);
              if (tabResult.tracks.length > 0) {
                fallbackResult = tabResult;
              }
            }

            if (fallbackResult) {
              tracks = fallbackResult.tracks;
              pages = fallbackResult.pages;
              continuation = fallbackResult.continuation;
              missingTitle = fallbackResult.missingTitle;
              missingVideoId = fallbackResult.missingVideoId;
              diagnostics = fallbackResult.diagnostics;
            }
          }
        }

        if (tracks.length === 0 && requestedId !== "LM") {
          const alternateId = browseId.startsWith("VL")
            ? browseId.slice(2)
            : `VL${browseId}`;
          if (alternateId === browseId) {
            return NextResponse.json({
              tracks: tracks.slice(0, maxTracks),
              count: tracks.length,
              authUser,
              pages,
              truncated: Boolean(continuation) && tracks.length >= maxTracks,
              missingTitle,
              missingVideoId,
              diagnostics,
            });
          }
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
        const { data, authUser } = await withAuthUserFallback(
          authCandidates,
          (headers) =>
            ytmRequestWithFallback(
              "search",
              (context) => ({ context, query }),
              headers,
            ),
          cleanedCookies,
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
        let videoId: string | null = null;
        for (const item of items) {
          const renderer =
            getPath(item, ["musicResponsiveListItemRenderer"]) ||
            getPath(item, ["musicTwoRowItemRenderer"]) ||
            item;
          videoId = extractVideoId(renderer);
          if (videoId) break;
        }
        return NextResponse.json({ videoId: videoId || null, authUser });
      }

      case "like": {
        const videoId = params?.videoId as string | undefined;
        if (!videoId) {
          return NextResponse.json(
            { error: "Missing videoId." },
            { status: 400 },
          );
        }
        if (!isValidVideoId(videoId)) {
          return NextResponse.json(
            { error: "Invalid videoId." },
            { status: 400 },
          );
        }
        const { authUser } = await withAuthUserFallback(
          authCandidates,
          (headers) =>
            ytmRequestWithFallback(
              "like/like",
              (context) => ({ context, target: { videoId } }),
              headers,
            ),
          cleanedCookies,
        );
        return NextResponse.json({ success: true, authUser });
      }

      case "remove_like": {
        const videoId = params?.videoId as string | undefined;
        if (!videoId) {
          return NextResponse.json(
            { error: "Missing videoId." },
            { status: 400 },
          );
        }
        if (!isValidVideoId(videoId)) {
          return NextResponse.json(
            { error: "Invalid videoId." },
            { status: 400 },
          );
        }
        const { authUser } = await withAuthUserFallback(
          authCandidates,
          (headers) =>
            ytmRequestWithFallback(
              "like/removelike",
              (context) => ({ context, target: { videoId } }),
              headers,
            ),
          cleanedCookies,
        );
        return NextResponse.json({ success: true, authUser });
      }

      case "add_to_playlist": {
        const playlistId = params?.playlistId as string | undefined;
        const videoId = params?.videoId as string | undefined;
        if (!playlistId) {
          return NextResponse.json(
            { error: "Missing playlistId." },
            { status: 400 },
          );
        }
        if (!videoId) {
          return NextResponse.json(
            { error: "Missing videoId." },
            { status: 400 },
          );
        }
        if (!isValidVideoId(videoId)) {
          return NextResponse.json(
            { error: "Invalid videoId." },
            { status: 400 },
          );
        }
        const normalizedPlaylistId = playlistId.startsWith("VL")
          ? playlistId.slice(2)
          : playlistId;
        const dedupe = params?.dedupe !== false;
        const { authUser } = await withAuthUserFallback(
          authCandidates,
          (headers) =>
            ytmRequestWithFallback(
              "browse/edit_playlist",
              (context) => ({
                context,
                playlistId: normalizedPlaylistId,
                actions: [
                  {
                    action: "ACTION_ADD_VIDEO",
                    addedVideoId: videoId,
                    ...(dedupe ? { dedupeOption: "DEDUPE_OPTION_SKIP" } : {}),
                  },
                ],
              }),
              headers,
            ),
          cleanedCookies,
        );
        return NextResponse.json({ success: true, authUser });
      }

      case "remove_from_playlist": {
        const playlistId = params?.playlistId as string | undefined;
        const setVideoId = params?.setVideoId as string | undefined;
        const videoId = params?.videoId as string | undefined;
        if (!playlistId) {
          return NextResponse.json(
            { error: "Missing playlistId." },
            { status: 400 },
          );
        }
        if (!setVideoId || !videoId) {
          return NextResponse.json(
            { error: "Missing setVideoId or videoId." },
            { status: 400 },
          );
        }
        if (!isValidVideoId(videoId)) {
          return NextResponse.json(
            { error: "Invalid videoId." },
            { status: 400 },
          );
        }
        const normalizedPlaylistId = playlistId.startsWith("VL")
          ? playlistId.slice(2)
          : playlistId;
        const { authUser } = await withAuthUserFallback(
          authCandidates,
          (headers) =>
            ytmRequestWithFallback(
              "browse/edit_playlist",
              (context) => ({
                context,
                playlistId: normalizedPlaylistId,
                actions: [
                  {
                    action: "ACTION_REMOVE_VIDEO",
                    setVideoId,
                    removedVideoId: videoId,
                  },
                ],
              }),
              headers,
            ),
          cleanedCookies,
        );
        return NextResponse.json({ success: true, authUser });
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

