import React, { useRef, useState, useMemo } from "react";
import {
  Code,
  Check,
  Copy,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  HelpCircle as QuestionIcon,
  Download,
  FileText,
  Loader2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Database,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import type { QueryResponseData } from "../types";

interface QueryResponseCardProps {
  data: QueryResponseData;
}

const CHART_COLORS = [
  "#38bdf8", // Cyan
  "#818cf8", // Indigo
  "#c084fc", // Purple
  "#34d399", // Emerald
  "#f472b6", // Pink
  "#fbbf24", // Amber
  "#fb7185", // Rose
];

export const QueryResponseCard: React.FC<QueryResponseCardProps> = ({ data }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Table State
  const [tableSearch, setTableSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    question,
    sql_query: sqlQuery,
    query_result: queryResult,
    chart_type: chartType,
    explanation,
    retry_count: retryCount,
    error_trace: errorTrace,
    execution_time_ms: executionTimeMs,
  } = data;

  const isForbidden =
    sqlQuery === "FORBIDDEN" ||
    sqlQuery?.startsWith("FORBIDDEN") ||
    errorTrace?.includes("SECURITY ERROR") ||
    explanation?.toLowerCase().includes("forbidden");

  const results = queryResult || [];
  const keys = results.length > 0 ? Object.keys(results[0]) : [];
  const xAxisKey = keys[0];
  const valueKeys = keys.slice(1);

  // Single record / KPI card check
  const isKpiMetric = results.length === 1 && keys.length <= 2;

  const getSanitizedBaseName = () => {
    if (!question) return `report_${Date.now()}`;
    const cleanStr = question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 35);
    const dateStr = new Date().toISOString().split("T")[0];
    return `${cleanStr || "query_result"}_${dateStr}`;
  };

  const handleCopySql = () => {
    if (!sqlQuery || isForbidden) return;
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    toast.success("SQL query copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToCSV = () => {
    if (!results || results.length === 0) return;
    try {
      const headers = keys.join(",");
      const rows = results.map((row) =>
        keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","),
      );
      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      const filename = `${getSanitizedBaseName()}.csv`;
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported CSV: ${filename}`);
    } catch {
      toast.error("Failed to export CSV file.");
    }
  };

  const exportToPDF = async () => {
    if (!cardRef.current) return;
    setIsExportingPdf(true);
    try {
      const element = cardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#090d16",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      let renderHeight = (canvas.height * imgWidth) / canvas.width;

      if (renderHeight > pageHeight - 20) {
        renderHeight = pageHeight - 20;
      }

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, renderHeight);
      const filename = `${getSanitizedBaseName()}.pdf`;
      pdf.save(filename);
      toast.success(`Exported PDF: ${filename}`);
    } catch {
      toast.error("Failed to generate PDF report.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Table Filtering & Sorting
  const filteredAndSortedData = useMemo(() => {
    let list = [...results];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter((row) =>
        keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
      );
    }

    if (sortColumn) {
      list.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? "").toLowerCase();
        const strB = String(valB ?? "").toLowerCase();
        if (strA < strB) return sortDirection === "asc" ? -1 : 1;
        if (strA > strB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [results, keys, tableSearch, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage) || 1;
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(colKey);
      setSortDirection("asc");
    }
  };

  return (
    <div
      ref={cardRef}
      className="bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950 border border-slate-800/90 hover:border-sky-500/40 rounded-2xl p-5 shadow-2xl space-y-4 backdrop-blur-md transition-all"
    >
      {/* 1. MASTER CARD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Asked Question Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400 shrink-0">
            <QuestionIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
              Query Question
            </span>
            <span className="text-sm font-semibold text-slate-100 truncate block">
              {question}
            </span>
          </div>
        </div>

        {/* Header Badges & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {executionTimeMs !== undefined && executionTimeMs > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40 font-mono">
              <Zap className="w-3 h-3" /> {executionTimeMs}ms
            </span>
          )}

          {retryCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin" /> {retryCount}x Retry
            </span>
          )}

          {/* Action Buttons */}
          {sqlQuery && !isForbidden && (
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 text-xs bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition-colors"
              title="Copy SQL"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy SQL"}</span>
            </button>
          )}

          {results.length > 0 && (
            <>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 text-xs bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 text-xs bg-slate-800/90 hover:bg-slate-700/90 disabled:opacity-50 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                title="Export PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline">{isExportingPdf ? "Exporting..." : "PDF"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. SECURITY ALERT OR SYNTHESIZED SQL QUERY */}
      {isForbidden ? (
        <div className="p-4 bg-rose-950/70 border-2 border-rose-600/80 rounded-xl space-y-2 text-rose-200 text-xs shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />
            <span>SECURITY VIOLATION BLOCKED BY AST GUARD</span>
          </div>
          <p className="text-rose-300 font-mono text-xs leading-relaxed">
            Destructive operation (DELETE, DROP, UPDATE, INSERT, ALTER, or PRAGMA) detected and blocked. SQLGuard strictly permits read-only SELECT queries.
          </p>
        </div>
      ) : (
        sqlQuery && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-mono uppercase tracking-wider">SYNTHESIZED SQL QUERY</span>
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[10px]">
                  <ShieldCheck className="w-3 h-3" /> AST Guard Verified
                </span>
              </div>
            </div>

            {/* Formatted Code Block */}
            <pre className="p-3 bg-slate-950/90 rounded-xl text-emerald-400 font-mono text-xs border border-slate-800/80 leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden shadow-inner">
              <code>{sqlQuery}</code>
            </pre>

            {/* Explain Logic Toggle */}
            {explanation && (
              <div>
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Explain Query Logic</span>
                  {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showExplanation && (
                  <div className="mt-1.5 p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
                    💡 <span className="font-semibold text-slate-200">Logic Breakdown:</span> {explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* 3. BUSINESS INSIGHT BAR */}
      {explanation && !isForbidden && (
        <div className="p-3 bg-gradient-to-r from-sky-950/50 via-slate-900 to-indigo-950/40 rounded-xl text-xs text-sky-300 border border-sky-500/20 leading-relaxed shadow-inner">
          💡 <span className="font-semibold text-sky-200">Business Insight:</span> {explanation}
        </div>
      )}

      {/* 4. VISUALIZATION OR DATA PRESENTATION */}
      {results.length > 0 && !isForbidden && (
        <div className="space-y-3 pt-1 border-t border-slate-800/60">
          {/* KPI Stat Cards (For single aggregate results) */}
          {isKpiMetric ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {keys.map((k, idx) => (
                <div
                  key={k}
                  className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/50 border border-sky-500/30 rounded-xl shadow-xl flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                      {k.replace(/_/g, " ")}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent font-mono">
                      {String(results[0][k] ?? "0")}
                    </span>
                  </div>
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
                    {idx === 0 ? <TrendingUp className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full">
              {chartType === "bar" && (
                <div className="h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          color: "#f8fafc",
                          borderRadius: "10px",
                        }}
                      />
                      <Legend />
                      {valueKeys.map((key, idx) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                          radius={[6, 6, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartType === "line" && (
                <div className="h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        cursor={{ stroke: "#38bdf8", strokeWidth: 1, strokeDasharray: "4 4" }}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          color: "#f8fafc",
                          borderRadius: "10px",
                        }}
                      />
                      <Legend />
                      {valueKeys.map((key, idx) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartType === "pie" && (
                <div className="h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          color: "#f8fafc",
                          borderRadius: "10px",
                        }}
                      />
                      <Legend />
                      <Pie
                        data={results}
                        dataKey={valueKeys[0] || keys[1]}
                        nameKey={xAxisKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        label
                      >
                        {results.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ENTERPRISE DATA TABLE */}
              {(chartType === "table" || chartType === "none") && (
                <div className="space-y-2.5 pt-1">
                  {/* Table Search & Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search records..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-[10px] font-mono text-slate-500">
                        Total: {filteredAndSortedData.length} records
                      </span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none"
                      >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                      </select>
                    </div>
                  </div>

                  {/* Table Element */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/70 shadow-inner">
                    <table className="w-full text-xs text-left text-slate-300 border-collapse">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-[10px] text-slate-500 w-8">#</th>
                          {keys.map((key) => (
                            <th
                              key={key}
                              onClick={() => handleSort(key)}
                              className="p-2.5 cursor-pointer hover:text-sky-400 transition-colors select-none"
                            >
                              <div className="flex items-center gap-1 font-mono text-[11px]">
                                <span>{key}</span>
                                {sortColumn === key ? (
                                  sortDirection === "asc" ? (
                                    <ArrowUp className="w-3 h-3 text-sky-400" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 text-sky-400" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {paginatedData.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="p-2.5 text-[10px] text-slate-600">
                              {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                            </td>
                            {keys.map((key) => (
                              <td key={key} className="p-2.5 text-slate-200">
                                {String(row[key] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                      <span className="text-[10px] font-mono">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
