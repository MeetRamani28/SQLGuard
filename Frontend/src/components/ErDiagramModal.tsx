import React, { useState, useEffect } from "react";
import {
  Network,
  X,
  RefreshCw,
  Table as TableIcon,
  Database,
  Layers,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Key,
  Link as LinkIcon,
  ArrowRight,
  Sparkles,
  GitCommit,
  Grid,
  List,
} from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "matrix">("graph");
  const [zoomLevel, setZoomLevel] = useState<number>(1);

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
      setZoomLevel(1);
      setSelectedTable(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredNodes = nodes.filter(
    (node) =>
      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.columns.some((col) => col.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalColumns = nodes.reduce((sum, n) => sum + n.columns.length, 0);

  // Table header color themes based on table name
  const getTableHeaderColor = (tableName: string) => {
    const name = tableName.toLowerCase();
    if (name.includes("user") || name.includes("account") || name.includes("auth")) {
      return {
        headerBg: "bg-emerald-500",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        accent: "text-emerald-600",
        border: "border-emerald-500",
      };
    }
    if (name.includes("session") || name.includes("chat") || name.includes("message")) {
      return {
        headerBg: "bg-sky-500",
        badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
        accent: "text-sky-600",
        border: "border-sky-500",
      };
    }
    if (name.includes("order") || name.includes("sale") || name.includes("product") || name.includes("revenue")) {
      return {
        headerBg: "bg-indigo-500",
        badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        accent: "text-indigo-600",
        border: "border-indigo-500",
      };
    }
    return {
      headerBg: "bg-teal-600",
      badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
      accent: "text-teal-600",
      border: "border-teal-500",
    };
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0F172A]/50 p-2 sm:p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative flex h-[90vh] sm:h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-2xl text-[#0F172A]"
        >
          {/* Modal Header Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 sm:px-6 py-3.5 gap-3 shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="rounded-xl bg-[#ECFDF5] p-2.5 text-[#10B981] border border-[#10B981]/30 shrink-0">
                <Network className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-[#0F172A] truncate">
                    Interactive ER Schema Diagram
                  </h2>
                  <span className="text-[10px] bg-[#ECFDF5] text-[#047857] border border-[#10B981]/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase shrink-0">
                    Live Entity Graph
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#047857] font-medium truncate hidden xs:block">
                  Visual Entity-Relationship graph, foreign keys & structural dependencies
                </p>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="hidden lg:flex items-center space-x-2 text-xs font-mono font-semibold">
              <span className="bg-[#FFFFFF] border border-[#E2E8F0] px-2.5 py-1 rounded-lg text-[#0F172A] shadow-2xs flex items-center gap-1">
                <TableIcon className="w-3.5 h-3.5 text-[#10B981]" />
                <strong className="text-[#10B981]">{nodes.length}</strong> Tables
              </span>
              <span className="bg-[#FFFFFF] border border-[#E2E8F0] px-2.5 py-1 rounded-lg text-[#0F172A] shadow-2xs flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#0284C7]" />
                <strong className="text-[#0284C7]">{totalColumns}</strong> Fields
              </span>
              <span className="bg-[#FFFFFF] border border-[#E2E8F0] px-2.5 py-1 rounded-lg text-[#0F172A] shadow-2xs flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <strong className="text-[#8B5CF6]">{edges.length}</strong> Foreign Keys
              </span>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={loadErData}
                disabled={loading}
                className="flex items-center space-x-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#047857] hover:bg-[#F1F5F9] font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh ER Diagram Schema"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#10B981]" />
                <span className="hidden sm:inline">{loading ? "Refreshing..." : "Refresh"}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sub Control Toolbar: Search, View Mode, Zoom Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 gap-2.5 shrink-0">
            {/* Search Filter */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search tables or column names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] py-1.5 pl-8 pr-3 text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#10B981] focus:outline-none shadow-2xs"
              />
            </div>

            {/* View Mode Toggle & Zoom Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              {/* View Mode Tabs */}
              <div className="flex items-center bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
                <button
                  onClick={() => setViewMode("graph")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "graph"
                      ? "bg-[#FFFFFF] text-[#047857] shadow-2xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <Grid className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Graph View</span>
                </button>
                <button
                  onClick={() => setViewMode("matrix")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "matrix"
                      ? "bg-[#FFFFFF] text-[#047857] shadow-2xs border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>FK Relationships</span>
                </button>
              </div>

              {/* Zoom Controls (For Graph View) */}
              {viewMode === "graph" && (
                <div className="flex items-center bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] text-xs font-mono">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                    className="p-1 hover:bg-[#FFFFFF] text-[#047857] rounded cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-bold text-[#0F172A]">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                    className="p-1 hover:bg-[#FFFFFF] text-[#047857] rounded cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:bg-[#FFFFFF] text-[#64748B] rounded cursor-pointer ml-1"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Diagram Body Container */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#F8FAFC] custom-scrollbar relative">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-3 text-[#047857]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#10B981]" />
                <span className="text-xs font-semibold">Generating Entity-Relationship Schema Map...</span>
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-3 text-center text-[#047857]">
                <Database className="h-10 w-10 text-[#94A3B8]" />
                <p className="text-xs font-bold text-[#0F172A]">No tables or schema detected</p>
                <p className="text-[11px] text-[#64748B]">Connect a database to visualize table foreign key relationships.</p>
              </div>
            ) : viewMode === "graph" ? (
              /* VISUAL GRAPH NODES VIEW */
              <div
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
                className="transition-transform duration-200 space-y-6"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredNodes.map((node) => {
                    const isSelected = selectedTable === node.id;
                    const theme = getTableHeaderColor(node.label);

                    // Find connected edges for this table node
                    const connectedEdges = edges.filter(
                      (e) => e.source === node.id || e.target === node.id
                    );

                    return (
                      <motion.div
                        key={node.id}
                        layout
                        onClick={() => setSelectedTable(isSelected ? null : node.id)}
                        className={`group relative rounded-2xl border-2 bg-[#FFFFFF] shadow-sm transition-all cursor-pointer overflow-hidden ${
                          isSelected
                            ? "border-[#10B981] ring-4 ring-[#10B981]/20 shadow-xl"
                            : "border-[#E2E8F0] hover:border-[#10B981]/50 hover:shadow-md"
                        }`}
                      >
                        {/* Table Node Header */}
                        <div className={`flex items-center justify-between px-4 py-3 text-white ${theme.headerBg}`}>
                          <div className="flex items-center space-x-2 font-mono min-w-0">
                            <TableIcon className="h-4 w-4 shrink-0 text-white" />
                            <h3 className="font-bold text-sm truncate">{node.label}</h3>
                          </div>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
                            {node.columns.length} fields
                          </span>
                        </div>

                        {/* Column Fields List */}
                        <div className="p-3.5 space-y-1.5 font-mono text-xs divide-y divide-[#F1F5F9]">
                          {node.columns.map((col, idx) => {
                            const isPk = col === "id" || col === "user_id";
                            const isFk = col.endsWith("_id") && col !== "id";

                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between pt-1.5 pb-1 px-2 rounded-lg transition-colors ${
                                  isPk
                                    ? "bg-amber-50/80 text-amber-900 font-bold border border-amber-200/60"
                                    : isFk
                                    ? "bg-emerald-50/80 text-emerald-900 font-bold border border-emerald-200/60"
                                    : "text-[#0F172A] hover:bg-[#F8FAFC]"
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  {isPk ? (
                                    <Key className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                  ) : isFk ? (
                                    <LinkIcon className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                  )}
                                  <span className="truncate">{col}</span>
                                </div>

                                {isPk && (
                                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-300 shrink-0">
                                    PK
                                  </span>
                                )}
                                {isFk && (
                                  <span className="text-[9px] bg-[#ECFDF5] text-[#047857] px-1.5 py-0.2 rounded font-bold border border-[#10B981]/30 shrink-0">
                                    FK
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Node Relationships Badge */}
                        {connectedEdges.length > 0 && (
                          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2 flex items-center justify-between text-[11px] text-[#047857]">
                            <span className="flex items-center gap-1 font-semibold">
                              <GitCommit className="w-3.5 h-3.5 text-[#10B981]" />
                              <span>{connectedEdges.length} Relations</span>
                            </span>
                            <span className="text-[10px] text-[#64748B] font-mono">
                              Click to focus
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* RELATIONSHIP FLOW MATRIX VIEW */
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-2xs">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3 flex items-center space-x-2">
                    <Layers className="h-4 w-4 text-[#10B981]" />
                    <span>Schema Relationship Mapping ({edges.length} Active Foreign Keys)</span>
                  </h4>

                  {edges.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#64748B]">
                      No foreign key constraints defined between tables in database catalog.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {edges.map((e, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 hover:border-[#10B981]/50 transition-all shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded border border-[#0284C7]/30">
                              {e.source}
                            </span>
                            <div className="flex items-center space-x-1 text-[#10B981] font-bold">
                              <span>━━</span>
                              <ArrowRight className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#10B981]/30">
                              {e.target}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                            <span className="font-mono text-[#047857] font-medium">
                              Constraint: {e.label}
                            </span>
                            <span className="text-[10px] bg-[#FFFFFF] border border-[#E2E8F0] px-2 py-0.5 rounded text-[#0F172A] font-bold">
                              1 : Many
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[11px] text-[#64748B] shrink-0">
            <span className="flex items-center gap-1.5 font-medium text-[#047857]">
              <Sparkles className="h-3.5 w-3.5 text-[#10B981]" /> SQLGuard Schema Entity Visualizer
            </span>
            <span className="hidden sm:inline">Zoom, search or click table nodes to inspect keys</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
