"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UploadCloud, FileText, FileJson, FileSpreadsheet, ArrowRight, AlertTriangle } from "lucide-react";
import TopNav from "@/components/TopNav";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type ImportSummary = {
  id: string;
  name: string;
  source_type: string;
  created_at: string;
  item_count: number;
  valid_count: number;
  invalid_count: number;
};

type ImportResponse = {
  id?: string;
  counts?: { total: number; valid: number; invalid: number };
  warnings?: string[];
  error?: string;
};

const formats = ["lines", "csv", "json"] as const;
type Format = (typeof formats)[number];

const sampleLines = `Wildfire - Amber Gray
Night Drive - Odessa Lane
Sunset Ritual - Coastline
Stillness - Northward`;

const sampleCsv = `title,artist,album,duration
Wildfire,Amber Gray,Daylight,3:42
Night Drive,Odessa Lane,Midnight,4:05
Sunset Ritual,Coastline,Horizon,3:51
Stillness,Northward,Quiet Hours,2:58`;

const sampleJson = `[
  { "title": "Wildfire", "artist": "Amber Gray", "album": "Daylight", "duration": "3:42" },
  { "title": "Night Drive", "artist": "Odessa Lane", "album": "Midnight", "duration": "4:05" },
  { "title": "Sunset Ritual", "artist": "Coastline", "album": "Horizon", "duration": "3:51" },
  { "title": "Stillness", "artist": "Northward", "album": "Quiet Hours", "duration": "2:58" }
]`;

export default function ImportPage() {
  const [format, setFormat] = useState<Format>("lines");
  const [name, setName] = useState("New import");
  const [content, setContent] = useState(sampleLines);
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [counts, setCounts] = useState<ImportResponse["counts"] | null>(null);
  const [loading, setLoading] = useState(false);

  const sampleByFormat = useMemo(
    () => ({
      lines: sampleLines,
      csv: sampleCsv,
      json: sampleJson,
    }),
    [],
  );

  const loadImports = async () => {
    try {
      const res = await fetch("/api/imports");
      const data = (await res.json()) as { imports?: ImportSummary[] };
      setImports(data.imports ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadImports();
  }, []);

  const handleFormatChange = (next: Format) => {
    setFormat(next);
    setContent(sampleByFormat[next]);
  };

  const handleImport = async () => {
    setLoading(true);
    setStatus(null);
    setWarnings([]);
    setCounts(null);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        body: JSON.stringify({
          name,
          format,
          content,
        }),
      });
      const data = (await res.json()) as ImportResponse;
      if (data.error) throw new Error(data.error);
      setCounts(data.counts ?? null);
      setWarnings(data.warnings ?? []);
      setStatus("Import created.");
      await loadImports();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Import failed.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  const FormatIcon = ({ fmt }: { fmt: Format }) => {
    switch (fmt) {
      case "lines": return <FileText className="w-4 h-4" />;
      case "csv": return <FileSpreadsheet className="w-4 h-4" />;
      case "json": return <FileJson className="w-4 h-4" />;
    }
  }

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 max-w-6xl mx-auto">
      <TopNav />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Main Import Form */}
        <div className="space-y-6">
          <Card className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-display font-semibold mb-2">Import Playlist</h2>
              <p className="text-zinc-400">Paste your tracks to prepare them for transfer.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Import Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-primary/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Format</label>
                <div className="flex flex-wrap gap-2">
                  {formats.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleFormatChange(f)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${format === f
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10"
                        }`}
                    >
                      <FormatIcon fmt={f} />
                      {f.toUpperCase()}
                    </button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setContent(sampleByFormat[format])} className="ml-auto text-xs">
                    Reset Sample
                  </Button>
                </div>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono focus:border-primary/50 outline-none transition-all placeholder:text-zinc-700"
                placeholder="Paste content here..."
              />

              <div className="flex justify-between items-center pt-2">
                <Link href="/review">
                  <Button variant="ghost">Skip directly to Review</Button>
                </Link>
                <Button
                  onClick={handleImport}
                  isLoading={loading}
                  disabled={content.trim().length < 5}
                  className="w-40"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Create Import
                </Button>
              </div>

              {status && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.includes("failed") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                  {status.includes("failed") ? <AlertTriangle className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-green-400" />}
                  {status}
                </div>
              )}
            </div>
          </Card>

          {counts && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4">
              {[
                { label: "Total", value: counts.total, color: "text-white" },
                { label: "Valid", value: counts.valid, color: "text-green-400" },
                { label: "Invalid", value: counts.invalid, color: "text-red-400" },
              ].map((s) => (
                <Card key={s.label} className="p-4 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</div>
                  <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                </Card>
              ))}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Recent Imports</h3>
            <div className="space-y-3">
              {imports.length === 0 ? (
                <div className="text-sm text-zinc-500">No history found.</div>
              ) : (
                imports.map((imp) => (
                  <div key={imp.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm text-zinc-200">{imp.name}</div>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-400">{imp.item_count}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mb-3">{imp.source_type.toUpperCase()} · {new Date(imp.created_at).toLocaleDateString()}</div>
                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Link href={`/review?import=${imp.id}`} className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors">
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 opacity-80">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Guide</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2">
                <FileText className="w-4 h-4 text-zinc-600" />
                <span><strong>Lines:</strong> "Title - Artist" per line</span>
              </li>
              <li className="flex gap-2">
                <FileSpreadsheet className="w-4 h-4 text-zinc-600" />
                <span><strong>CSV:</strong> headers: title, artist, album, duration</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
