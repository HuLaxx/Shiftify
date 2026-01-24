"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UploadCloud, FileText, FileJson, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageLayout from "@/components/PageLayout";

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
Sunset Ritual,Coastline,Horizon,3:51`;

const sampleJson = `[
  { "title": "Wildfire", "artist": "Amber Gray" },
  { "title": "Night Drive", "artist": "Odessa Lane" },
  { "title": "Sunset Ritual", "artist": "Coastline" }
]`;

export default function ImportPage() {
  const [format, setFormat] = useState<Format>("lines");
  const [name, setName] = useState("New import");
  const [content, setContent] = useState(sampleLines);
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [counts, setCounts] = useState<ImportResponse["counts"] | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    } catch { }
  };

  useEffect(() => {
    loadImports();
  }, []);

  const handleFormatChange = (next: Format) => {
    setFormat(next);
    setContent(sampleByFormat[next]);
  };

  const detectFormatFromFile = (fileName: string): Format => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".csv")) return "csv";
    if (lower.endsWith(".json")) return "json";
    return "lines";
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const nextFormat = detectFormatFromFile(file.name);
      setFormat(nextFormat);
      setContent(text);
      setCounts(null);
      setStatus(`Loaded ${file.name}`);
      const nextName = file.name.replace(/\.[^/.]+$/, "").trim();
      if (nextName) setName(nextName);
    } catch {
      setStatus("Failed to read file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setStatus(null);
    setCounts(null);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, format, content }),
      });
      const data = (await res.json()) as ImportResponse;
      if (data.error) throw new Error(data.error);
      setCounts(data.counts ?? null);
      setStatus("Import created successfully.");
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
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 transition-all outline-none";

  return (
    <PageLayout
      orbConfig={[
        { color: "accent", position: "top-[-15%] left-[-10%]", size: "lg" },
        { color: "secondary", position: "bottom-[5%] right-[-10%]", size: "md" },
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Main Import Form */}
        <div className="space-y-6">
          <Card variant="elevated" className="p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-display font-semibold mb-2">Import Playlist</h2>
              <p className="text-muted-foreground">Paste your tracks to prepare them for transfer.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Import Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-foreground focus:border-primary/50 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Format</label>
                <div className="flex flex-wrap gap-2">
                  {formats.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleFormatChange(f)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${format === f
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-white/10"
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

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import From File
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  CSV, JSON, or TXT lines supported.
                </span>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`${inputClass} h-64 font-mono text-xs`}
                placeholder="Paste content here..."
              />

              <div className="flex justify-between items-center pt-2">
                <Link href="/review">
                  <Button variant="ghost">Skip to Review</Button>
                </Link>
                <Button onClick={handleImport} isLoading={loading} disabled={content.trim().length < 5}>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Create Import
                </Button>
              </div>

              {status && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.includes("failed") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
                  {status.includes("failed") ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  {status}
                </div>
              )}
            </div>
          </Card>

          {counts && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total", value: counts.total, color: "text-foreground" },
                { label: "Valid", value: counts.valid, color: "text-green-400" },
                { label: "Invalid", value: counts.invalid, color: "text-red-400" },
              ].map((s) => (
                <Card key={s.label} className="p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</div>
                  <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-muted-foreground">Recent Imports</h3>
            <div className="space-y-3">
              {imports.length === 0 ? (
                <div className="text-sm text-muted-foreground/60 italic">No history found.</div>
              ) : (
                imports.slice(0, 5).map((imp) => (
                  <div key={imp.id} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm truncate">{imp.name}</div>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-muted-foreground">{imp.item_count}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{imp.source_type.toUpperCase()} - {new Date(imp.created_at).toLocaleDateString()}</div>
                    <Link href={`/review?import=${imp.id}`} className="text-[10px] text-primary hover:text-primary/80 transition-colors">
                      Review -&gt;
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-muted-foreground">Format Guide</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">Lines:</strong> &quot;Title - Artist&quot; per line</span>
              </li>
              <li className="flex gap-3">
                <FileSpreadsheet className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">CSV:</strong> Headers: title, artist, album, duration</span>
              </li>
              <li className="flex gap-3">
                <FileJson className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong className="text-foreground">JSON:</strong> Array of objects with title/artist keys</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
