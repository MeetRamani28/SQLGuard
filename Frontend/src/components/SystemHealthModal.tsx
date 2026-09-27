import React, { useState, useEffect } from "react";
import { Activity, X, RefreshCw, Cpu, ShieldCheck, Zap, Server } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchSystemMetrics } from "../services/api";
import { toast } from "sonner";

interface SystemMetricsData {
  status: string;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  cache_hit_ratio_percent: number;
  cache_hits: number;
  cache_misses: number;
  estimated_saved_latency_ms: number;
  latency_target_p95_ms: number;
  owasp_security_status: string;
  security_roles_active: string[];
}

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<SystemMetricsData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemMetrics();
      setMetrics(data);
    } catch {
      toast.error("Failed to fetch system health metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">System Health & Observability Metrics</h2>
                <p className="text-xs text-slate-400">
                  Real-time CPU, RAM, Latency SLA targets, LRU Cache & OWASP Enforcement
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadMetrics}
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Metrics</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Metrics Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!metrics ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Loading system observability metrics...
              </div>
            ) : (
              <>
                {/* Metric Gauges */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* CPU Gauge */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold">CPU Utilization</span>
                      <Cpu className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {metrics.cpu_usage_percent}%
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, metrics.cpu_usage_percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Gauge */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold">Memory Usage</span>
                      <Server className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {metrics.memory_usage_percent}%
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, metrics.memory_usage_percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* LRU Cache Hit Ratio */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold">Query Cache Hit Ratio</span>
                      <Zap className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {metrics.cache_hit_ratio_percent}%
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Hits: {metrics.cache_hits}</span>
                      <span>Misses: {metrics.cache_misses}</span>
                    </div>
                  </div>

                  {/* Latency P95 SLA */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold">P95 SLA Target</span>
                      <Activity className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-bold text-white font-mono">
                      &lt;{metrics.latency_target_p95_ms}ms
                    </div>
                    <div className="mt-2 text-[11px] text-emerald-400">
                      Saved {metrics.estimated_saved_latency_ms}ms total
                    </div>
                  </div>
                </div>

                {/* Security & OWASP Policy Card */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-sm font-bold text-emerald-400">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <span>OWASP Security Protocols & RBAC Active Status</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-slate-300 font-mono">
                    <div>
                      • Security Policy: <strong className="text-white">{metrics.owasp_security_status}</strong>
                    </div>
                    <div>
                      • Active Security Roles:{" "}
                      <span className="text-emerald-300">
                        {metrics.security_roles_active?.join(", ").toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
