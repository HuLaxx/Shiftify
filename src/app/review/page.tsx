"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Filter, RefreshCw, XCircle, Search, AlertCircle, Check } from "lucide-react";
import TopNav from "@/components/TopNav";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";

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

export default function ReviewPage() {
  const searchParams = useSearchParams();
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
    let filtered = items;
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    return filtered;
  }, [items, statusFilter]);

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
    <div className="min-h-screen pt-8 pb-12 px-4 max-w-7xl mx-auto">
      <TopNav />

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Imports</h2>
            <button onClick={loadImports} className="text-zinc-500 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
            {imports.map((imp) => (
              <button
                key={imp.id}
                onClick={() => setSelectedImport(imp.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedImport === imp.id
                    ? "bg-primary/20 border-primary/50"
                    : "bg-white/5 border-white/5 hover:bg-white/10"
                  }`}
              >
                <div className="font-medium text-sm text-zinc-200 truncate">{imp.name}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{imp.item_count} items</div>
              </button>
            ))}
            {imports.length === 0 && <div className="p-4 text-zinc-500 text-sm italic">No imports found</div>}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
            {/* Toolbar */}
            <div className="p-6 border-b border-white/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-display font-semibold">Review Queue</h1>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => updateStatus(filteredItems.map(i => i.id), "approved")} disabled={filteredItems.length === 0}>
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
                        ? "bg-white text-black border-white"
                        : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500"
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
                <div className="flex items-center justify-center h-40 text-zinc-500">Loading items...</div>
              ) : !selectedImport ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                  <Filter className="w-12 h-12 opacity-20" />
                  <p>Select an import from the sidebar to review.</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
                  <Check className="w-8 h-8 mb-2 opacity-50" />
                  <p>No items in this filter.</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={item.id}
                    className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-zinc-200 truncate">{item.title}</div>
                        <div className={`text-[10px] px-1.5 py-0.5 rounded border ${item.score > 80 ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"
                          }`}>
                          {Math.round(item.score)}% Match
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">{item.artist} • {item.album || "Unknown Album"}</div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => updateStatus([item.id], "approved")} className="p-2 hover:bg-green-500/20 rounded-full text-zinc-500 hover:text-green-400 transition-colors" title="Approve">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => updateStatus([item.id], "rejected")} className="p-2 hover:bg-red-500/20 rounded-full text-zinc-500 hover:text-red-400 transition-colors" title="Reject">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
