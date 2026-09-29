import React, { useState, useEffect } from "react";
import {
  Database,
  X,
  Search,
  Table as TableIcon,
  RefreshCw,
  Cpu,
  ChevronLeft,
} from "lucide-react";
import { fetchDatabaseSchema, syncSchemaVectorEmbeddings } from "../services/api";
import type { DbConfig, SchemaResponseData, TableSchemaInfo } from "../types";
import { toast } from "sonner";

interface SchemaExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbConfig: DbConfig | null;
}

export const SchemaExplorerModal: React.FC<SchemaExplorerModalProps> = ({
  isOpen,
  onClose,
  dbConfig,
}) => {
  const [schemaData, setSchemaData] = useState<SchemaResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<TableSchemaInfo | null>(null);
  const [isSyncingEmbeddings, setIsSyncingEmbeddings] = useState(false);
  const [mobileTab, setMobileTab] = useState<"tables" | "details">("tables");

  const loadSchema = async () => {
    setLoading(true);
    try {
      const data = await fetchDatabaseSchema(dbConfig);
      setSchemaData(data);
      if (data.tables && data.tables.length > 0) {
        setSelectedTable(data.tables[0]);
      }
    } catch {
      toast.error("Failed to inspect database schema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSchema();
      setMobileTab("tables");
    }
  }, [isOpen, dbConfig]);

  const handleSyncEmbeddings = async () => {
    setIsSyncingEmbeddings(true);
    try {
      const res = await syncSchemaVectorEmbeddings(dbConfig);
      if (res.success) {
        toast.success(`Vector RAG Synced! ${res.message || "Schema indexed."}`);
      }
    } catch {
      toast.error("Failed to sync vector RAG embeddings.");
    } finally {
      setIsSyncingEmbeddings(false);
    }
  };

  if (!isOpen) return null;

  const filteredTables = schemaData?.tables.filter((t: TableSchemaInfo) =>
    t.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] w-full max-w-4xl h-[88vh] sm:h-[80vh] rounded-2xl p-3 sm:p-6 shadow-2xl flex flex-col space-y-3 sm:space-y-4 text-[#0F172A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 shrink-0">
          <div className="flex items-center gap-2 text-[#047857] font-semibold text-sm sm:text-base min-w-0">
            <Database className="w-5 h-5 text-[#10B981] shrink-0" />
            <span className="truncate">Database Schema Explorer</span>
            {schemaData?.dialect && (
              <span className="hidden xs:inline-block text-[10px] bg-[#ECFDF5] text-[#047857] border border-[#10B981]/30 px-2 py-0.5 rounded-full font-mono uppercase shrink-0">
                {schemaData.dialect}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleSyncEmbeddings}
              disabled={isSyncingEmbeddings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#10B981]/30 text-[#047857] rounded-lg cursor-pointer transition-all font-medium"
              title="Re-index Vector Schema Embeddings in ChromaDB/Pinecone"
            >
              <Cpu className={`w-3.5 h-3.5 text-[#10B981] ${isSyncingEmbeddings ? "animate-spin text-[#D97706]" : ""}`} />
              <span className="hidden sm:inline">{isSyncingEmbeddings ? "Syncing..." : "Sync Vector RAG"}</span>
            </button>

            <button
              onClick={loadSchema}
              disabled={loading}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#047857] rounded-lg border border-[#E2E8F0] cursor-pointer"
              title="Refresh Schema"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#10B981]" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A] cursor-pointer transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-[#047857]">
            <RefreshCw className="w-8 h-8 animate-spin text-[#10B981]" />
            <span className="text-xs font-medium">Inspecting database catalog & tables...</span>
          </div>
        ) : schemaData?.error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-rose-600 text-xs font-medium">
            {schemaData.error}
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row gap-4 overflow-hidden text-xs min-h-0">
            {/* Table Sidebar List (Desktop always visible, Mobile tab switching) */}
            <div className={`w-full sm:w-64 border-r-0 sm:border-r border-[#E2E8F0] sm:pr-4 flex-col space-y-3 shrink-0 h-full ${
              mobileTab === "tables" ? "flex" : "hidden sm:flex"
            }`}>
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter tables..."
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#10B981] shadow-xs text-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {filteredTables.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">No tables match filter</div>
                ) : (
                  filteredTables.map((tbl: TableSchemaInfo) => (
                    <button
                      key={tbl.table_name}
                      onClick={() => {
                        setSelectedTable(tbl);
                        setMobileTab("details");
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                        selectedTable?.table_name === tbl.table_name
                          ? "bg-[#ECFDF5] border-[#10B981]/50 text-[#047857] font-semibold shadow-xs"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                      }`}
                    >
                      <TableIcon className="w-4 h-4 text-[#10B981] shrink-0" />
                      <span className="truncate font-mono font-medium">{tbl.table_name}</span>
                      <span className="ml-auto text-[10px] text-[#047857] bg-[#ECFDF5] border border-[#10B981]/20 px-2 py-0.5 rounded-full shrink-0">
                        {tbl.columns.length} cols
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Columns & Details Panel */}
            <div className={`flex-1 flex-col overflow-hidden space-y-3 h-full ${
              mobileTab === "details" ? "flex" : "hidden sm:flex"
            }`}>
              {/* Mobile Back Button header */}
              <div className="sm:hidden flex items-center justify-between bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                <button
                  onClick={() => setMobileTab("tables")}
                  className="flex items-center gap-1 text-xs font-semibold text-[#047857] hover:text-[#10B981]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Tables</span>
                </button>
                <span className="text-xs font-mono font-bold text-[#0F172A]">{selectedTable?.table_name}</span>
              </div>

              {selectedTable ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 shrink-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] font-mono">
                      <TableIcon className="w-4 h-4 text-[#10B981]" />
                      <span>{selectedTable.table_name}</span>
                    </div>
                    <span className="text-[11px] text-[#047857] font-mono font-semibold bg-[#ECFDF5] border border-[#10B981]/20 px-2 py-0.5 rounded-md">
                      Total Columns: {selectedTable.columns.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto border border-[#E2E8F0] rounded-xl custom-scrollbar bg-[#FFFFFF]">
                    <table className="w-full text-left border-collapse min-w-[320px]">
                      <thead className="bg-[#F8FAFC] text-[#047857] text-[11px] uppercase sticky top-0 border-b border-[#E2E8F0] z-10">
                        <tr>
                          <th className="p-3 font-semibold">Column Name</th>
                          <th className="p-3 font-semibold">Data Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] font-mono text-xs">
                        {selectedTable.columns.map((col: { name: string; type: string }, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F1F5F9] transition-colors">
                            <td className="p-3 text-[#0F172A] font-medium break-all">{col.name}</td>
                            <td className="p-3 text-[#047857] font-semibold break-all">
                              <span className="bg-[#ECFDF5] text-[#047857] px-2 py-0.5 rounded border border-[#10B981]/20 inline-block">
                                {col.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#64748B] text-center p-6 space-y-2">
                  <TableIcon className="w-10 h-10 text-[#CBD5E1]" />
                  <p>Select a table from the list to inspect column definitions.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
