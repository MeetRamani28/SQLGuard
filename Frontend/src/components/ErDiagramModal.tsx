import React, { useState, useEffect } from "react";
import { Network, X, RefreshCw, Table, Database, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchErDiagramData } from "../services/api";
import { useChat } from "../context/ChatContext";
import { toast } from "sonner";

interface ErNode {
  id: string;
  label: string;
  columns: string[];
}

interface ErEdge {
  source: string;
  target: string;
  label: string;
}

interface ErDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ErDiagramModal: React.FC<ErDiagramModalProps> = ({ isOpen, onClose }) => {
  const { dbConfig } = useChat();
  const [nodes, setNodes] = useState<ErNode[]>([]);
  const [edges, setEdges] = useState<ErEdge[]>([]);
  const [loading, setLoading] = useState(false);

  const loadErData = async () => {
    setLoading(true);
    try {
      const data = await fetchErDiagramData(dbConfig);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch {
      toast.error("Failed to load schema ER diagram data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadErData();
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
          className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Interactive ER Schema Diagram</h2>
                <p className="text-xs text-slate-400">
                  Visual Entity-Relationship graph & foreign key dependencies
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadErData}
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Graph</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Diagram Canvas */}
          <div className="flex-1 overflow-auto p-6 bg-slate-950/90">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                Generating Entity-Relationship Diagram...
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-2 text-slate-400">
                <Database className="h-10 w-10 text-slate-600" />
                <p>No table relationships detected in schema.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl transition-all hover:border-cyan-500/40"
                  >
                    <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
                      <Table className="h-4 w-4 text-cyan-400" />
                      <h3 className="font-bold text-white text-sm font-mono">{node.label}</h3>
                    </div>
                    <div className="mt-3 space-y-1 font-mono text-xs">
                      {node.columns.map((col, idx) => {
                        const isPk = col === "id" || col.endsWith("_id");
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between rounded px-2 py-1 ${
                              isPk ? "bg-cyan-950/40 text-cyan-300 font-semibold" : "text-slate-400"
                            }`}
                          >
                            <span>{col}</span>
                            {isPk && (
                              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                                {col === "id" ? "PK" : "FK"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Relationship Edges Summary */}
            {edges.length > 0 && (
              <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span>Detected Table Foreign Key Relationships ({edges.length})</span>
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {edges.map((e, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 rounded-lg bg-slate-950 p-2 text-xs font-mono text-slate-300 border border-slate-800"
                    >
                      <span className="text-cyan-400 font-bold">{e.source}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-emerald-400 font-bold">{e.target}</span>
                      <span className="text-[10px] text-slate-400">({e.label})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
