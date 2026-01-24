"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Filter, RefreshCw, XCircle, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageLayout from "@/components/PageLayout";

type ImportSummary = {
  id: string;
  name: string;
  source_type: string;
  created_at: string;
  item_count: number;
};

type ImportItem = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration_ms: number | null;
  score: number;
  status: string;
};

const statusTabs = ["all", "pending", "approved", "rejected", "invalid"] as const;
type StatusTab = (typeof statusTabs)[number];

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [selectedImport, setSelectedImport] = useState<string | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("pending");
  const [loading, setLoading] = useState(false);

  const loadImports = async () => {
    try {
      const res = await fetch("/api/imports");
      const data = (await res.json()) as { imports?: ImportSummary[] };
      setImports(data.imports ?? []);
    } catch { }
  };

  const loadItems = async (importId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/imports/${importId}?include=items`);
      const data = (await res.json()) as { items?: ImportItem[] };
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImports();
  }, []);

  useEffect(() => {
    const preset = searchParams.get("import");
    if (preset) setSelectedImport(preset);
  }, [searchParams]);

  useEffect(() => {
    if (selectedImport) loadItems(selectedImport);
  }, [selectedImport]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const approvedCount = useMemo(
    () => items.filter((item) => item.status === "approved").length,
    [items],
  );

  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: items.length };
    for (const tab of statusTabs) {
      if (tab === "all") continue;
      tally[tab] = items.filter((item) => item.status === tab).length;
    }
    return tally;
  }, [items]);

  const updateStatus = async (ids: string[], status: string) => {
    if (!selectedImport || ids.length === 0) return;
    await fetch(`/api/imports/${selectedImport}`, {
      method: "PATCH",
      body: JSON.stringify({ itemIds: ids, status }),
    });
    setItems((prev) =>
      prev.map((item) => (ids.includes(item.id) ? { ...item, status } : item)),
    );
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8">
      {/* Sidebar List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Imports</h2>
          <button onClick={loadImports} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
          {imports.map((imp) => (
            <button
              key={imp.id}
              onClick={() => setSelectedImport(imp.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selectedImport === imp.id
                ? "bg-primary/15 border-primary/40"
                : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
            >
              <div className="font-medium text-sm truncate">{imp.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{imp.item_count} items</div>
            </button>
          ))}
          {imports.length === 0 && <div className="p-4 text-muted-foreground text-sm italic">No imports found</div>}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <Card variant="elevated" className="p-0 overflow-hidden flex flex-col min-h-[500px]">
          {/* Toolbar */}
          <div className="p-6 border-b border-white/5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-2xl font-display font-semibold">Review Queue</h1>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => selectedImport && router.push(`/transfer?import=${selectedImport}`)}
                  disabled={!selectedImport || approvedCount === 0}
                >
                  Transfer Approved
                </Button>
                <Button size="sm" onClick={() => updateStatus(filteredItems.map(i => i.id), "approved")} disabled={filteredItems.length === 0}>
                  Approve All
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(filteredItems.map(i => i.id), "rejected")} disabled={filteredItems.length === 0}>
                  Reject All
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === tab
                    ? "bg-white/10 text-foreground border-white/20"
                    : "bg-transparent border-white/10 text-muted-foreground hover:border-white/20"
                    }`}
                >
                  {tab.toUpperCase()} <span className="opacity-60 ml-1">{counts[tab] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">Loading items...</div>
            ) : !selectedImport ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-20">
                <Filter className="w-12 h-12 opacity-20" />
                <p>Select an import from the sidebar to review.</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Check className="w-8 h-8 mb-2 opacity-50" />
                <p>No items in this filter.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className={`text-[10px] px-1.5 py-0.5 rounded border ${item.score > 80 ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"
                        }`}>
                        {Math.round(item.score)}%
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{item.artist} - {item.album || "Unknown Album"}</div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateStatus([item.id], "approved")} className="p-2 hover:bg-green-500/15 rounded-lg text-muted-foreground hover:text-green-400 transition-colors" title="Approve">
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => updateStatus([item.id], "rejected")} className="p-2 hover:bg-red-500/15 rounded-lg text-muted-foreground hover:text-red-400 transition-colors" title="Reject">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <PageLayout
      orbConfig={[
        { color: "secondary", position: "top-[-20%] right-[-15%]", size: "lg" },
        { color: "primary", position: "bottom-[10%] left-[-10%]", size: "md" },
      ]}
    >
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>}>
        <ReviewContent />
      </Suspense>
    </PageLayout>
  );
}
