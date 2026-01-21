import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";
import { newId } from "@/lib/ids";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  try {
    const body = (await req.json()) as {
      level?: string;
      message?: string;
    };

    const level = body.level?.trim() || "info";
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      `INSERT INTO run_events (id, run_id, level, message, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(newId(), params.id, level, message, nowIso());

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Event write failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
