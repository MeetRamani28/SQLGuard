import React, { useRef, useState, useMemo } from "react";
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
import {
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
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface DynamicChartProps {
  question?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>> | null;
  chartType: "bar" | "line" | "pie" | "table" | "none";
  explanation?: string | null;
}

const COLORS = [
  "#38bdf8", // Sky Blue
  "#818cf8", // Indigo
  "#c084fc", // Purple
  "#34d399", // Emerald
  "#f472b6", // Pink
  "#fbbf24", // Amber
  "#fb7185", // Rose
];

export const DynamicChart: React.FC<DynamicChartProps> = ({
  question,
  data,
  chartType,
  explanation,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Advanced Table State
  const [tableSearch, setTableSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl space-y-2">
        <Database className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-xs">No data records returned for this query.</p>
      </div>
    );
  }

  const keys = Object.keys(data[0]);
  const xAxisKey = keys[0];
  const valueKeys = keys.slice(1);

  // Check if result is a single metric KPI card (e.g. 1 row, <= 2 columns)
  const isKpiMetric = data.length === 1 && keys.length <= 2;

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

  const exportToCSV = () => {
    try {
      const headers = keys.join(",");
      const rows = data.map((row) =>
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
    if (!chartRef.current) return;
    setIsExportingPdf(true);
    try {
      const element = chartRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0b0f17",
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

  // Table Sorting & Filtering Logic
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      result = result.filter((row) =>
        keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
      );
    }

    if (sortColumn) {
      result.sort((a, b) => {
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

    return result;
  }, [data, keys, tableSearch, sortColumn, sortDirection]);

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
      ref={chartRef}
      className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-5 backdrop-blur-md"
    >
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {explanation ? (
          <div className="p-3 bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-slate-900 rounded-xl text-xs text-sky-300 border border-sky-500/20 flex-1 leading-relaxed shadow-inner">
            💡 <span className="font-semibold text-sky-200">Business Insight:</span>{" "}
            {explanation}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 text-xs bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700 cursor-pointer transition-all shadow-sm font-medium"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 text-xs bg-slate-800/90 hover:bg-slate-700/90 disabled:opacity-50 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700 cursor-pointer transition-all shadow-sm font-medium"
            title="Download PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isExportingPdf ? "Generating..." : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARD (For single aggregate results e.g. count/sum queries) */}
      {isKpiMetric ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {keys.map((k, idx) => (
            <div
              key={k}
              className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/40 border border-sky-500/30 rounded-2xl shadow-xl flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="text-3xl font-black bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent font-mono">
                  {String(data[0][k] ?? "0")}
                </span>
              </div>
              <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
                {idx === 0 ? <TrendingUp className="w-6 h-6" /> : <Database className="w-6 h-6" />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISUALIZATION CONTAINER */
        <div className="w-full">
          {chartType === "bar" && (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#f8fafc",
                      borderRadius: "12px",
                      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
                    }}
                  />
                  <Legend />
                  {valueKeys.map((key, idx) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={COLORS[idx % COLORS.length]}
                      radius={[6, 6, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartType === "line" && (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    cursor={{ stroke: "#38bdf8", strokeWidth: 1, strokeDasharray: "4 4" }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#f8fafc",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend />
                  {valueKeys.map((key, idx) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartType === "pie" && (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      color: "#f8fafc",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend />
                  <Pie
                    data={data}
                    dataKey={valueKeys[0] || keys[1]}
                    nameKey={xAxisKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={105}
                    label
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ADVANCED ENTERPRISE TABLE UI */}
          {(chartType === "table" || chartType === "none") && (
            <div className="space-y-3 pt-2">
              {/* Table Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search results..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="text-[11px] font-mono text-slate-500">
                    Showing {filteredAndSortedData.length} records
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">Rows:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Element */}
              <div className="overflow-x-auto border border-slate-800/90 rounded-xl bg-slate-950/60 shadow-inner">
                <table className="w-full text-xs text-left text-slate-300 border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3 text-[10px] text-slate-500 w-10">#</th>
                      {keys.map((key) => (
                        <th
                          key={key}
                          onClick={() => handleSort(key)}
                          className="p-3 cursor-pointer hover:text-sky-400 transition-colors select-none"
                        >
                          <div className="flex items-center gap-1.5 font-mono">
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
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {paginatedData.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="p-3 text-[10px] text-slate-600 font-mono">
                          {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                        </td>
                        {keys.map((key) => (
                          <td key={key} className="p-3 text-slate-200">
                            {String(row[key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1 px-1 text-xs text-slate-400">
                  <span className="text-[11px] font-mono">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
