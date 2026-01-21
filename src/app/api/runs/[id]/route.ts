import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const db = getDb();
  const run = db
    .prepare(
      `SELECT id, kind, status, started_at, ended_at, total, success, failed
       FROM runs WHERE id = ?`,
    )
    .get(params.id);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const events = db
    .prepare(
      `SELECT id, level, message, created_at
       FROM run_events WHERE run_id = ? ORDER BY created_at ASC`,
    )
    .all(params.id);

  return NextResponse.json({ run, events });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  try {
    const body = (await req.json()) as {
      status?: string;
      total?: number;
      success?: number;
      failed?: number;
    };

    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM runs WHERE id = ?")
      .get(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    db.prepare(
      `UPDATE runs
       SET status = COALESCE(?, status),
           total = COALESCE(?, total),
           success = COALESCE(?, success),
           failed = COALESCE(?, failed),
           ended_at = COALESCE(?, ended_at)
       WHERE id = ?`,
    ).run(
      body.status ?? null,
      Number.isFinite(body.total) ? Number(body.total) : null,
      Number.isFinite(body.success) ? Number(body.success) : null,
      Number.isFinite(body.failed) ? Number(body.failed) : null,
      body.status && body.status !== "running" ? nowIso() : null,
      params.id,
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Run update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
