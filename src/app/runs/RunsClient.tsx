"use client";

import { useState } from "react";
import { Activity, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import TopNav from "@/components/TopNav";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";

type RunSummary = {
  id: string;
  kind: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  total: number | null;
  success: number | null;
  failed: number | null;
};

type RunEvent = {
  id: string;
  level: string;
  message: string;
  created_at: string;
};

export default function RunsClient({ initialRuns }: { initialRuns: RunSummary[] }) {
  const [runs, setRuns] = useState<RunSummary[]>(initialRuns);
  const [selectedRun, setSelectedRun] = useState<RunSummary | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/runs");
      const data = (await res.json()) as { runs?: RunSummary[] };
      setRuns(data.runs ?? []);
    } finally {
      setLoading(false);
    }
  };

  const loadRunDetails = async (runId: string) => {
    try {
      const res = await fetch(`/api/runs/${runId}`);
      const data = (await res.json()) as { run?: RunSummary; events?: RunEvent[] };
      setSelectedRun(data.run ?? null);
      setEvents(data.events ?? []);
    } catch { }
  };

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 max-w-7xl mx-auto">
      <TopNav />

      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Runs List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">History</h2>
            <Button variant="ghost" size="sm" onClick={loadRuns} isLoading={loading}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
            {runs.length === 0 ? (
              <div className="p-4 text-zinc-500 text-sm italic">No runs recorded</div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => loadRunDetails(run.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedRun?.id === run.id
                      ? "bg-primary/20 border-primary/50"
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm text-zinc-200 capitalize">{run.kind}</div>
                    <div className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${run.status === 'done' ? 'bg-green-500/20 text-green-400' :
                        run.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                      }`}>
                      {run.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {new Date(run.started_at).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-6">
          <Card className="min-h-[500px] flex flex-col p-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h1 className="text-xl font-display font-semibold flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                Telemetry & Logs
              </h1>
              {selectedRun && (
                <div className="text-xs text-zinc-500 font-mono">{selectedRun.id}</div>
              )}
            </div>

            {!selectedRun ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <Activity className="w-12 h-12 opacity-20" />
                <p>Select a run from the history to view details.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5 bg-white/[0.02]">
                  <div className="p-4 text-center">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total</div>
                    <div className="text-2xl font-bold font-display text-white">{selectedRun.total ?? 0}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Success</div>
                    <div className="text-2xl font-bold font-display text-green-400">{selectedRun.success ?? 0}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Failed</div>
                    <div className="text-2xl font-bold font-display text-red-400">{selectedRun.failed ?? 0}</div>
                  </div>
                </div>

                {/* Consoles */}
                <div className="flex-1 p-0 overflow-hidden flex flex-col">
                  <div className="px-4 py-2 bg-black/40 border-b border-white/5 text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    Event Stream
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs custom-scrollbar bg-black/20">
                    {events.length === 0 ? (
                      <span className="text-zinc-600 italic">No events recorded.</span>
                    ) : (
                      events.map((ev) => (
                        <div key={ev.id} className="flex gap-3 hover:bg-white/5 p-1 rounded -ml-1 pl-1 transition-colors">
                          <span className="text-zinc-600 shrink-0 w-20">
                            {new Date(ev.created_at).toLocaleTimeString()}
                          </span>
                          <span className={`shrink-0 w-16 font-bold ${ev.level === 'error' ? 'text-red-400' :
                              ev.level === 'warn' ? 'text-yellow-400' :
                                'text-blue-400'
                            }`}>
                            {ev.level.toUpperCase()}
                          </span>
                          <span className="text-zinc-300 break-all">{ev.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
