import React from "react";
import { GitCompare, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { QueryResponseData } from "../types";

interface QueryCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardA: QueryResponseData | null;
  cardB: QueryResponseData | null;
}

export const QueryCompareModal: React.FC<QueryCompareModalProps> = ({
  isOpen,
  onClose,
  cardA,
  cardB,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                <GitCompare className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Side-by-Side Query Compare & Diff</h2>
                <p className="text-xs text-slate-400">
                  Compare SQL execution plans, latencies, and row count metrics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Comparison View */}
          <div className="flex-1 overflow-y-auto p-6">
            {!cardA || !cardB ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-2 text-slate-400">
                <GitCompare className="h-10 w-10 text-slate-600" />
                <p className="text-sm">Select 2 queries from history or chat to compare diffs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Query A */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      Query A (Primary)
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                      <Zap className="h-3 w-3" /> {cardA.execution_time_ms || 0}ms
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{cardA.question}</h3>
                  <div className="rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-400 border border-slate-800 overflow-x-auto">
                    {cardA.sql_query}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
                    <span>Result Rows: {cardA.query_result?.length || 0}</span>
                    <span>Chart: {cardA.chart_type?.toUpperCase()}</span>
                  </div>
                </div>

                {/* Query B */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Query B (Comparison)
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                      <Zap className="h-3 w-3" /> {cardB.execution_time_ms || 0}ms
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{cardB.question}</h3>
                  <div className="rounded-lg bg-slate-900 p-3 font-mono text-xs text-amber-300 border border-slate-800 overflow-x-auto">
                    {cardB.sql_query}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
                    <span>Result Rows: {cardB.query_result?.length || 0}</span>
                    <span>Chart: {cardB.chart_type?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
