import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";
import { newId } from "@/lib/ids";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const runs = db
    .prepare(
      `SELECT id, kind, status, started_at, ended_at, total, success, failed
       FROM runs ORDER BY started_at DESC LIMIT 50`,
    )
    .all();
  return NextResponse.json({ runs });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      kind?: string;
      total?: number;
    };
    const id = newId();
    const kind = body.kind?.trim() || "transfer";
    const startedAt = nowIso();
    const total = Number.isFinite(body.total) ? Number(body.total) : null;

    const db = getDb();
    db.prepare(
      `INSERT INTO runs (id, kind, status, started_at, total, success, failed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, kind, "running", startedAt, total, 0, 0);

    return NextResponse.json({ id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Run create failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
