import React, { useState, useEffect } from "react";
import {
  Database,
  X,
  Search,
  Table as TableIcon,
  RefreshCw,
  Cpu,
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
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] w-full max-w-4xl h-[80vh] rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 text-[#0F172A]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2 text-[#047857] font-semibold text-base">
            <Database className="w-5 h-5 text-[#10B981]" />
            <span>Database Schema Explorer</span>
            {schemaData?.dialect && (
              <span className="text-[10px] bg-[#ECFDF5] text-[#047857] border border-[#10B981]/30 px-2 py-0.5 rounded-full font-mono uppercase">
                {schemaData.dialect}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncEmbeddings}
              disabled={isSyncingEmbeddings}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#10B981]/30 text-[#047857] rounded-lg cursor-pointer transition-all"
              title="Re-index Vector Schema Embeddings in ChromaDB/Pinecone"
            >
              <Cpu className={`w-3.5 h-3.5 text-[#10B981] ${isSyncingEmbeddings ? "animate-spin text-[#D97706]" : ""}`} />
              <span>{isSyncingEmbeddings ? "Syncing..." : "Sync Vector RAG"}</span>
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
              className="text-[#64748B] hover:text-[#0F172A] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-[#047857]">
            <RefreshCw className="w-8 h-8 animate-spin text-[#10B981]" />
            <span className="text-xs">Inspecting database catalog & tables...</span>
          </div>
        ) : schemaData?.error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-rose-600 text-xs">
            {schemaData.error}
          </div>
        ) : (
          <div className="flex-1 flex gap-4 overflow-hidden text-xs">
            {/* Table Sidebar List */}
            <div className="w-64 border-r border-[#E2E8F0] pr-4 flex flex-col space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter tables..."
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#10B981] shadow-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredTables.map((tbl: TableSchemaInfo) => (
                  <button
                    key={tbl.table_name}
                    onClick={() => setSelectedTable(tbl)}
                    className={`w-full text-left p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                      selectedTable?.table_name === tbl.table_name
                        ? "bg-[#ECFDF5] border-[#10B981]/50 text-[#047857] font-semibold shadow-xs"
                        : "bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span className="truncate font-mono">{tbl.table_name}</span>
                    <span className="ml-auto text-[10px] text-[#64748B] bg-[#E2E8F0] px-1.5 py-0.5 rounded">
                      {tbl.columns.length} cols
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Columns & Details Panel */}
            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              {selectedTable ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] font-mono">
                      <TableIcon className="w-4 h-4 text-[#10B981]" />
                      <span>{selectedTable.table_name}</span>
                    </div>
                    <span className="text-[11px] text-[#047857] font-mono font-semibold">
                      Total Columns: {selectedTable.columns.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-[#E2E8F0] rounded-xl custom-scrollbar bg-[#FFFFFF]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#F8FAFC] text-[#047857] text-[11px] uppercase sticky top-0 border-b border-[#E2E8F0]">
                        <tr>
                          <th className="p-3">Column Name</th>
                          <th className="p-3">Data Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] font-mono text-xs">
                        {selectedTable.columns.map((col: { name: string; type: string }, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F1F5F9] transition-colors">
                            <td className="p-3 text-[#0F172A] font-medium">{col.name}</td>
                            <td className="p-3 text-[#047857] font-semibold">{col.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#64748B]">
                  Select a table from the sidebar to inspect column definitions.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
