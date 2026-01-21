import { getDb } from "@/lib/db";
import RunsClient, { RunSummary } from "./RunsClient";

export const runtime = "nodejs";

export default function RunsPage() {
  const db = getDb();
  const runs = db
    .prepare(
      `SELECT id, kind, status, started_at, ended_at, total, success, failed
       FROM runs ORDER BY started_at DESC LIMIT 50`,
    )
    .all() as RunSummary[];

  return <RunsClient initialRuns={runs} />;
}
