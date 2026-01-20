import { NextRequest, NextResponse } from "next/server";
import { getDb, nowIso } from "@/lib/db";
import { newId } from "@/lib/ids";
import { ImportFormat, parseImportContent } from "@/lib/importer";

export const runtime = "nodejs";

const isFormat = (value: string): value is ImportFormat =>
  value === "csv" || value === "json" || value === "lines";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, source_type, created_at, item_count, valid_count, invalid_count FROM imports ORDER BY created_at DESC LIMIT 50",
    )
    .all();
  return NextResponse.json({ imports: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      format?: string;
      content?: string;
    };

    const name = body.name?.trim() || "Untitled import";
    const format = body.format?.toLowerCase() ?? "";
    const content = body.content?.trim() ?? "";

    if (!isFormat(format)) {
      return NextResponse.json({ error: "Invalid format." }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: "Content is empty." }, { status: 400 });
    }

    const { items, invalid, warnings } = parseImportContent(format, content);
    const importId = newId();
    const createdAt = nowIso();

    const db = getDb();
    const insertImport = db.transaction(() => {
      db.prepare(
        `INSERT INTO imports (id, name, source_type, created_at, item_count, valid_count, invalid_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        importId,
        name,
        format,
        createdAt,
        items.length + invalid.length,
        items.length,
        invalid.length,
      );

      const insertItem = db.prepare(
        `INSERT INTO import_items (
          id, import_id, raw_title, raw_artist, raw_album, raw_duration,
          title, artist, album, duration_ms,
          normalized_title, normalized_artist, normalized_key,
          score, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      const writeItem = (
        normalized: (typeof items)[number],
        status: "pending" | "invalid",
      ) => {
        insertItem.run(
          newId(),
          importId,
          normalized.title,
          normalized.artist,
          normalized.album,
          normalized.durationMs,
          normalized.title,
          normalized.artist,
          normalized.album,
          normalized.durationMs,
          normalized.normalizedTitle,
          normalized.normalizedArtist,
          normalized.normalizedKey,
          normalized.score,
          status,
          createdAt,
        );
      };

      for (const entry of items) writeItem(entry, "pending");
      for (const entry of invalid) writeItem(entry, "invalid");
    });

    insertImport();

    return NextResponse.json({
      id: importId,
      counts: {
        total: items.length + invalid.length,
        valid: items.length,
        invalid: invalid.length,
      },
      warnings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
