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
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-2xl text-[#0F172A]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-[#FEF3C7] p-2 text-[#D97706] border border-[#D97706]/30">
                <GitCompare className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Side-by-Side Query Compare & Diff</h2>
                <p className="text-xs text-[#047857]">
                  Compare SQL execution plans, latencies, and row count metrics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Comparison View */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#FFFFFF] custom-scrollbar">
            {!cardA || !cardB ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-2 text-[#047857]">
                <GitCompare className="h-10 w-10 text-[#94A3B8]" />
                <p className="text-sm">Select 2 queries from history or chat to compare diffs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Query A */}
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <span className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">
                      Query A (Primary)
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-[#047857] font-mono">
                      <Zap className="h-3 w-3 text-[#10B981]" /> {cardA.execution_time_ms || 0}ms
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">{cardA.question}</h3>
                  <div className="rounded-lg bg-[#0F172A] p-3 font-mono text-xs text-[#10B981] border border-[#1E293B] overflow-x-auto shadow-inner">
                    {cardA.sql_query}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#047857] font-mono pt-2 border-t border-[#E2E8F0]">
                    <span>Result Rows: {cardA.query_result?.length || 0}</span>
                    <span>Chart: {cardA.chart_type?.toUpperCase()}</span>
                  </div>
                </div>

                {/* Query B */}
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                    <span className="text-xs font-bold text-[#D97706] uppercase tracking-wider">
                      Query B (Comparison)
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-[#047857] font-mono">
                      <Zap className="h-3 w-3 text-[#10B981]" /> {cardB.execution_time_ms || 0}ms
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">{cardB.question}</h3>
                  <div className="rounded-lg bg-[#0F172A] p-3 font-mono text-xs text-[#F59E0B] border border-[#1E293B] overflow-x-auto shadow-inner">
                    {cardB.sql_query}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#047857] font-mono pt-2 border-t border-[#E2E8F0]">
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
