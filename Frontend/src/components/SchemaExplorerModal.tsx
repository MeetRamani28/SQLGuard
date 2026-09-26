import React, { useState, useEffect } from "react";
import { X, Database, Table as TableIcon, Search, RefreshCw } from "lucide-react";
import type { DbConfig, SchemaResponseData, TableSchemaInfo } from "../types";
import { fetchDatabaseSchema } from "../services/api";

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
  const [selectedTable, setSelectedTable] = useState<TableSchemaInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadSchema();
    }
  }, [isOpen, dbConfig]);

  const loadSchema = async () => {
    setLoading(true);
    try {
      const res = await fetchDatabaseSchema(dbConfig);
      setSchemaData(res);
      if (res.tables && res.tables.length > 0) {
        setSelectedTable(res.tables[0]);
      }
    } catch {
      // Handled in API call
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTables = schemaData?.tables.filter((t) =>
    t.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl h-[80vh] rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-base">
            <Database className="w-5 h-5" />
            <span>Database Schema Explorer</span>
            {schemaData?.dialect && (
              <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800/60 px-2 py-0.5 rounded-full font-mono uppercase">
                {schemaData.dialect}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSchema}
              disabled={loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
              title="Refresh Schema"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-xs">Inspecting database catalog & tables...</span>
          </div>
        ) : schemaData?.error ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-rose-400 text-xs">
            {schemaData.error}
          </div>
        ) : (
          <div className="flex-1 flex gap-4 overflow-hidden text-xs">
            {/* Table Sidebar List */}
            <div className="w-64 border-r border-slate-800 pr-4 flex flex-col space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter tables..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredTables.map((tbl) => (
                  <button
                    key={tbl.table_name}
                    onClick={() => setSelectedTable(tbl)}
                    className={`w-full text-left p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                      selectedTable?.table_name === tbl.table_name
                        ? "bg-sky-950/70 border-sky-500/50 text-sky-300 font-semibold"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate font-mono">{tbl.table_name}</span>
                    <span className="ml-auto text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
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
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 font-mono">
                      <TableIcon className="w-4 h-4 text-sky-400" />
                      <span>{selectedTable.table_name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Total Columns: {selectedTable.columns.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Column Name</th>
                          <th className="p-3">Data Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                        {selectedTable.columns.map((col, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 text-sky-300 font-medium">{col.name}</td>
                            <td className="p-3 text-emerald-400">{col.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  Select a table to view columns
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
