import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");
const TMP_DATA_DIR = path.join(os.tmpdir(), "shiftify");

let resolvedDataDir: string | null = null;

const resolveDataDir = () => {
  if (resolvedDataDir) return resolvedDataDir;
  const candidates = [
    process.env.SHIFTIFY_DATA_DIR?.trim(),
    DEFAULT_DATA_DIR,
    TMP_DATA_DIR,
  ].filter(Boolean) as string[];
  let lastError: unknown = null;
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      resolvedDataDir = dir;
      return dir;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("Failed to create data directory.");
};

const getDbFile = () => path.join(resolveDataDir(), "shiftify.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  item_count INTEGER NOT NULL,
  valid_count INTEGER NOT NULL,
  invalid_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS import_items (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  raw_title TEXT,
  raw_artist TEXT,
  raw_album TEXT,
  raw_duration TEXT,
  title TEXT,
  artist TEXT,
  album TEXT,
  duration_ms INTEGER,
  normalized_title TEXT,
  normalized_artist TEXT,
  normalized_key TEXT,
  score REAL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(import_id) REFERENCES imports(id)
);

CREATE INDEX IF NOT EXISTS idx_import_items_import_id
  ON import_items(import_id);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  total INTEGER,
  success INTEGER,
  failed INTEGER
);

CREATE TABLE IF NOT EXISTS run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_id
  ON run_events(run_id);
`;

let db: Database.Database | null = null;

const ensureDb = () => {
  resolveDataDir();
};

export const getDb = () => {
  if (!db) {
    ensureDb();
    db = new Database(getDbFile());
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA);
  }
  return db;
};

export const nowIso = () => new Date().toISOString();
