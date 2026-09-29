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
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-2xl text-[#0F172A]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-[#ECFDF5] p-2 text-[#10B981] border border-[#10B981]/30">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">System Health & Observability Metrics</h2>
                <p className="text-xs text-[#047857]">
                  Real-time CPU, RAM, Latency SLA targets, LRU Cache & OWASP Enforcement
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadMetrics}
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#047857] hover:bg-[#F1F5F9] font-medium shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#10B981] ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Metrics</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Metrics Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {!metrics ? (
              <div className="flex h-48 items-center justify-center text-sm text-[#047857]">
                Loading system observability metrics...
              </div>
            ) : (
              <>
                {/* Metric Gauges */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* CPU Gauge */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#047857] mb-2">
                      <span className="font-semibold">CPU Utilization</span>
                      <Cpu className="h-4 w-4 text-[#10B981]" />
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A] font-mono">
                      {metrics.cpu_usage_percent}%
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded-full"
                        style={{ width: `${Math.min(100, metrics.cpu_usage_percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Gauge */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#047857] mb-2">
                      <span className="font-semibold">Memory Usage</span>
                      <Server className="h-4 w-4 text-[#0284C7]" />
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A] font-mono">
                      {metrics.memory_usage_percent}%
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full bg-[#0284C7] rounded-full"
                        style={{ width: `${Math.min(100, metrics.memory_usage_percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* LRU Cache Hit Ratio */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#047857] mb-2">
                      <span className="font-semibold">Query Cache Hit Ratio</span>
                      <Zap className="h-4 w-4 text-[#D97706]" />
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A] font-mono">
                      {metrics.cache_hit_ratio_percent}%
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#047857]">
                      <span>Hits: {metrics.cache_hits}</span>
                      <span>Misses: {metrics.cache_misses}</span>
                    </div>
                  </div>

                  {/* Latency P95 SLA */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-[#047857] mb-2">
                      <span className="font-semibold">P95 SLA Target</span>
                      <Activity className="h-4 w-4 text-[#10B981]" />
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A] font-mono">
                      &lt;{metrics.latency_target_p95_ms}ms
                    </div>
                    <div className="mt-2 text-[11px] text-[#047857]">
                      Saved {metrics.estimated_saved_latency_ms}ms total
                    </div>
                  </div>
                </div>

                {/* Security & OWASP Policy Card */}
                <div className="rounded-xl border border-[#10B981]/30 bg-[#ECFDF5] p-5 space-y-3">
                  <div className="flex items-center space-x-2 text-sm font-bold text-[#047857]">
                    <ShieldCheck className="h-5 w-5 text-[#10B981]" />
                    <span>OWASP Security Protocols & RBAC Active Status</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-[#047857] font-mono">
                    <div>
                      • Security Policy: <strong className="text-[#0F172A]">{metrics.owasp_security_status}</strong>
                    </div>
                    <div>
                      • Active Security Roles:{" "}
                      <span className="text-[#047857] font-bold">
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
