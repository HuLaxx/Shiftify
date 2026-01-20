import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const escapeCsv = (value: string | number | null) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT title, artist, album, duration_ms, score, status
       FROM import_items WHERE import_id = ? ORDER BY score DESC`,
    )
    .all(params.id);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "No items found." }, { status: 404 });
  }

  const header = ["title", "artist", "album", "duration_ms", "score", "status"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.title),
        escapeCsv(row.artist),
        escapeCsv(row.album),
        escapeCsv(row.duration_ms),
        escapeCsv(row.score),
        escapeCsv(row.status),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="shiftify-import-${params.id}.csv"`,
    },
  });
}
