import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "shiftify.db");

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
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

export const getDb = () => {
  if (!db) {
    ensureDb();
    db = new Database(DB_FILE);
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA);
  }
  return db;
};

export const nowIso = () => new Date().toISOString();
