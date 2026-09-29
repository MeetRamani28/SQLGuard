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
              <div className="rounded-xl bg-[#E0F2FE] p-2 text-[#0284C7] border border-[#0284C7]/30">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Interactive ER Schema Diagram</h2>
                <p className="text-xs text-[#047857]">
                  Visual Entity-Relationship graph & foreign key dependencies
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadErData}
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#047857] hover:bg-[#F1F5F9] font-medium shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#10B981] ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Graph</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Diagram Canvas */}
          <div className="flex-1 overflow-auto p-6 bg-[#F8FAFC] custom-scrollbar">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-[#047857]">
                Generating Entity-Relationship Diagram...
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-2 text-[#047857]">
                <Database className="h-10 w-10 text-[#94A3B8]" />
                <p>No table relationships detected in schema.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm transition-all hover:border-[#0284C7]/50"
                  >
                    <div className="flex items-center space-x-2 border-b border-[#E2E8F0] pb-2.5">
                      <Table className="h-4 w-4 text-[#0284C7]" />
                      <h3 className="font-bold text-[#0F172A] text-sm font-mono">{node.label}</h3>
                    </div>
                    <div className="mt-3 space-y-1 font-mono text-xs">
                      {node.columns.map((col, idx) => {
                        const isPk = col === "id" || col.endsWith("_id");
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between rounded px-2 py-1 ${
                              isPk ? "bg-[#E0F2FE] text-[#0369A1] font-semibold" : "text-[#0F172A]"
                            }`}
                          >
                            <span>{col}</span>
                            {isPk && (
                              <span className="text-[10px] text-[#0284C7] bg-[#FFFFFF] px-1.5 py-0.2 rounded border border-[#0284C7]/30">
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
              <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-xs">
                <h4 className="text-xs font-bold text-[#047857] uppercase tracking-wider mb-2 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-[#0284C7]" />
                  <span>Detected Table Foreign Key Relationships ({edges.length})</span>
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {edges.map((e, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 rounded-lg bg-[#F8FAFC] p-2 text-xs font-mono text-[#0F172A] border border-[#E2E8F0]"
                    >
                      <span className="text-[#0284C7] font-bold">{e.source}</span>
                      <span className="text-[#94A3B8]">→</span>
                      <span className="text-[#047857] font-bold">{e.target}</span>
                      <span className="text-[10px] text-[#64748B]">({e.label})</span>
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
