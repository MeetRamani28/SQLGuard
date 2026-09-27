import React, { useState, useEffect } from "react";
import { Search, X, History, Trash2, Database, Code, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { QueryResponseData } from "../types";

interface QueryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: QueryResponseData[];
  onSelectHistoryItem: (item: QueryResponseData) => void;
  onClearHistory: () => void;
}

export const QueryHistoryModal: React.FC<QueryHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  const [query, setQuery] = useState("");

  const filteredHistory = history.filter(
    (item) =>
      item.question.toLowerCase().includes(query.toLowerCase()) ||
      (item.sql_query && item.sql_query.toLowerCase().includes(query.toLowerCase())) ||
      (item.explanation && item.explanation.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Search Header */}
          <div className="flex items-center border-b border-slate-800 px-4 py-3.5 bg-slate-950">
            <Search className="h-5 w-5 text-[#548CA8] mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search query history & SQL logs... (Type to filter)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />

            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="mr-3 flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                title="Clear all query history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Log</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* History Item List */}
          <div className="max-h-96 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Database className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  {history.length === 0
                    ? "No query history recorded yet. Execute queries in chat to build your log!"
                    : `No query history items matching "${query}"`}
                </p>
              </div>
            ) : (
              filteredHistory.map((item, idx) => {
                const hasError = Boolean(item.error_trace);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectHistoryItem(item);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/90 transition-all group cursor-pointer text-left border border-slate-800/80 hover:border-slate-700"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                      <div className={`p-2 rounded-lg shrink-0 transition-colors border ${
                        hasError 
                          ? "bg-rose-950/40 text-rose-400 border-rose-800/40" 
                          : "bg-slate-800 group-hover:bg-[#548CA8]/20 text-[#548CA8] border-slate-700"
                      }`}>
                        {hasError ? <AlertTriangle className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-[#548CA8] transition-colors truncate">
                          {item.question}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-md mt-0.5">
                          {item.sql_query || item.explanation || "Natural Language Analysis"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.execution_time_ms !== undefined && (
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {item.execution_time_ms}ms
                        </span>
                      )}
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border shrink-0 ${
                        hasError
                          ? "bg-rose-950/60 text-rose-300 border-rose-800/50"
                          : "bg-slate-800 text-sky-300 border-slate-700"
                      }`}>
                        {hasError ? "ERROR" : item.chart_type?.toUpperCase() || "SQL"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Bar matching screenshot style */}
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-2.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <History className="h-3.5 w-3.5 text-[#548CA8]" /> SQLGuard Query History Log
            </span>
            <span>Click item to load into workspace • ESC to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
