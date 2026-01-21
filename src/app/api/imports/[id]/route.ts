import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const allowedStatuses = new Set(["pending", "approved", "rejected", "invalid"]);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const db = getDb();
  const importRow = db
    .prepare(
      "SELECT id, name, source_type, created_at, item_count, valid_count, invalid_count FROM imports WHERE id = ?",
    )
    .get(params.id);

  if (!importRow) {
    return NextResponse.json({ error: "Import not found." }, { status: 404 });
  }

  const includeItems = req.nextUrl.searchParams.get("include") === "items";
  if (!includeItems) {
    return NextResponse.json({ import: importRow });
  }

  const items = db
    .prepare(
      `SELECT id, title, artist, album, duration_ms, score, status
       FROM import_items WHERE import_id = ? ORDER BY score DESC`,
    )
    .all(params.id);

  return NextResponse.json({ import: importRow, items });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  try {
    const body = (await req.json()) as {
      itemId?: string;
      itemIds?: string[];
      status?: string;
    };

    if (!body.status || !allowedStatuses.has(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const targetIds = Array.isArray(body.itemIds)
      ? body.itemIds
      : body.itemId
        ? [body.itemId]
        : [];

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No item IDs provided." }, { status: 400 });
    }

    const db = getDb();
    const updateItem = db.prepare(
      "UPDATE import_items SET status = ? WHERE id = ? AND import_id = ?",
    );

    const update = db.transaction(() => {
      for (const id of targetIds) {
        updateItem.run(body.status, id, params.id);
      }
    });
    update();

    const counts = db
      .prepare(
        "SELECT status, COUNT(*) as count FROM import_items WHERE import_id = ? GROUP BY status",
      )
      .all(params.id);

    return NextResponse.json({ ok: true, counts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
