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
  PieChart as PieChartIcon,
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
  "#3ECF8E", // Series 1: Supabase Emerald Green
  "#38BDF8", // Series 2: Sky Blue
  "#A855F7", // Series 3: Purple Accent
  "#F59E0B", // Series 4: Amber Gold
  "#F43F5E", // Series 5: Rose Red
  "#818CF8", // Series 6: Indigo Accent
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
      <div className="p-8 text-center text-[#3ECF8E] bg-[#232323] rounded-2xl border border-[#333333] shadow-sm space-y-2">
        <Database className="w-8 h-8 text-[#71717A] mx-auto" />
        <p className="text-xs">No data records returned for this query.</p>
      </div>
    );
  }

  const keys = useMemo(() => (data && data.length > 0 ? Object.keys(data[0]) : []), [data]);

  const { labelKey, numericKeys } = useMemo(() => {
    if (!data || data.length === 0) return { labelKey: "", numericKeys: [] };

    const allKeys = Object.keys(data[0]);

    const stringKeys = allKeys.filter((key) =>
      data.some((row) => {
        const val = row[key];
        return typeof val === "string" && isNaN(Number(val));
      })
    );

    const numKeys = allKeys.filter((key) =>
      data.some((row) => {
        const val = row[key];
        if (val === null || val === undefined) return false;
        if (typeof val === "boolean") return false;
        return typeof val === "number" || (!isNaN(Number(val)) && String(val).trim() !== "");
      })
    );

    const label = stringKeys.length > 0 ? stringKeys[0] : allKeys[0] || "";

    const isIdKey = (k: string) =>
      k.toLowerCase() === "id" || k.toLowerCase().endsWith("_id") || k.toLowerCase().endsWith("id");

    let validNumeric = numKeys;
    if (validNumeric.includes(label) && validNumeric.length > 1) {
      validNumeric = validNumeric.filter((k) => k !== label);
    }
    const nonIdNumKeys = validNumeric.filter((k) => !isIdKey(k));
    const idNumKeys = validNumeric.filter((k) => isIdKey(k));
    const prioritizedNumeric = nonIdNumKeys.length > 0 ? [...nonIdNumKeys, ...idNumKeys] : validNumeric;

    return {
      labelKey: label,
      numericKeys: prioritizedNumeric.length > 0 ? prioritizedNumeric : allKeys.slice(1),
    };
  }, [data]);

  const xAxisKey = labelKey || keys[0];
  const valueKeys = numericKeys;
  const activeMetricKey = numericKeys[0] || keys[1] || keys[0] || "";

  const sanitizedChartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((row: any) => {
      const cleanRow: Record<string, any> = {};
      Object.keys(row).forEach((key) => {
        const val = row[key];
        if (val !== null && val !== undefined && typeof val !== "boolean") {
          const num = Number(val);
          if (!isNaN(num) && typeof val !== "object" && String(val).trim() !== "") {
            cleanRow[key] = num;
          } else {
            cleanRow[key] = val;
          }
        } else {
          cleanRow[key] = val;
        }
      });
      return cleanRow;
    });
  }, [data]);

  const hasValidPieMetrics = useMemo(() => {
    if (!sanitizedChartData || sanitizedChartData.length === 0 || !activeMetricKey) return false;
    return sanitizedChartData.some(
      (row: any) => typeof row[activeMetricKey] === "number" && !isNaN(row[activeMetricKey]) && row[activeMetricKey] > 0
    );
  }, [sanitizedChartData, activeMetricKey]);

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
        backgroundColor: "#121212",
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
      className="bg-[#232323] border border-[#333333] rounded-2xl p-6 shadow-md space-y-5"
    >
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {explanation ? (
          <div className="p-3 bg-[rgba(62,207,142,0.15)] rounded-xl text-xs text-[#FFFFFF] border border-[#3ECF8E]/30 flex-1 leading-relaxed shadow-sm">
            💡 <span className="font-bold text-[#3ECF8E]">Business Insight:</span>{" "}
            {explanation}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 text-xs bg-[#2C2C2C] hover:bg-[#333333] text-[#FFFFFF] px-3.5 py-2 rounded-xl border border-[#333333] cursor-pointer transition-all shadow-sm font-medium"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#3ECF8E]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 text-xs bg-[#2C2C2C] hover:bg-[#333333] disabled:opacity-50 text-[#FFFFFF] px-3.5 py-2 rounded-xl border border-[#333333] cursor-pointer transition-all shadow-sm font-medium"
            title="Download PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-[#3ECF8E] animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#3ECF8E]" />
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
              className="p-5 bg-[#2C2C2C] border border-[#333333] rounded-2xl shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-[#3ECF8E] tracking-wider block">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="text-3xl font-black text-[#3ECF8E] font-mono">
                  {String(data[0][k] ?? "0")}
                </span>
              </div>
              <div className="p-3 bg-[rgba(62,207,142,0.15)] border border-[#3ECF8E]/30 rounded-xl text-[#3ECF8E]">
                {idx === 0 ? <TrendingUp className="w-6 h-6" /> : <Database className="w-6 h-6" />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISUALIZATION CONTAINER */
        <div className="w-full">
          {chartType === "bar" && (
            <div className="h-80 w-full pt-2 min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sanitizedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis dataKey={xAxisKey} stroke="#3ECF8E" fontSize={12} />
                  <YAxis stroke="#3ECF8E" fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "rgba(0, 240, 255, 0.08)" }}
                    contentStyle={{
                      backgroundColor: "#232323",
                      borderColor: "#333333",
                      color: "#FFFFFF",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
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
            <div className="h-80 w-full pt-2 min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={sanitizedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis dataKey={xAxisKey} stroke="#3ECF8E" fontSize={12} />
                  <YAxis stroke="#3ECF8E" fontSize={12} />
                  <Tooltip
                    cursor={{ stroke: "#3ECF8E", strokeWidth: 1, strokeDasharray: "4 4" }}
                    contentStyle={{
                      backgroundColor: "#232323",
                      borderColor: "#333333",
                      color: "#FFFFFF",
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
            hasValidPieMetrics ? (
              <div className="h-80 w-full pt-2 min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        typeof value === "number" ? value.toLocaleString() : value,
                        name || activeMetricKey,
                      ]}
                      contentStyle={{
                        backgroundColor: "#232323",
                        borderColor: "#333333",
                        color: "#FFFFFF",
                        borderRadius: "12px",
                      }}
                    />
                    <Legend />
                    <Pie
                      data={sanitizedChartData}
                      dataKey={activeMetricKey}
                      nameKey={labelKey}
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      label={({ name, percent }: any) =>
                        `${name ? String(name).slice(0, 14) : ""}: ${(((percent as number) || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {sanitizedChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center p-6 bg-[#2C2C2C] rounded-2xl border border-dashed border-[#333333] text-center space-y-2 my-2">
                <PieChartIcon className="w-8 h-8 text-[#71717A]" />
                <p className="text-xs font-semibold text-[#FFFFFF]">No Pie Chart Metrics Available</p>
                <p className="text-[11px] text-[#A1A1AA]">This dataset does not contain positive numeric values suitable for pie chart distribution.</p>
              </div>
            )
          )}

          {/* ADVANCED ENTERPRISE TABLE UI */}
          {(chartType === "table" || chartType === "none") && (
            <div className="space-y-3 pt-2">
              {/* Table Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#2C2C2C] p-2.5 rounded-xl border border-[#333333]">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-[#3ECF8E] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search results..."
                    className="w-full bg-[#232323] border border-[#333333] rounded-lg pl-8 pr-3 py-1 text-xs text-[#FFFFFF] placeholder-[#71717A] focus:outline-none focus:border-[#3ECF8E]"
                  />
                </div>

                <div className="flex items-center gap-3 text-xs text-[#3ECF8E]">
                  <span className="text-[11px] font-mono text-[#3ECF8E]">
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
                      className="bg-[#232323] border border-[#333333] rounded px-2 py-0.5 text-xs text-[#FFFFFF] focus:outline-none"
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
              <div className="overflow-x-auto border border-[#333333] rounded-xl bg-[#232323] shadow-sm">
                <table className="w-full text-xs text-left text-[#FFFFFF] border-collapse">
                  <thead className="bg-[#2C2C2C] text-[#3ECF8E] uppercase font-semibold border-b border-[#333333] sticky top-0">
                    <tr>
                      <th className="p-3 text-[10px] text-[#71717A] w-10">#</th>
                      {keys.map((key) => (
                        <th
                          key={key}
                          onClick={() => handleSort(key)}
                          className="p-3 cursor-pointer hover:text-[#3ECF8E] transition-colors select-none"
                        >
                          <div className="flex items-center gap-1.5 font-mono">
                            <span>{key}</span>
                            {sortColumn === key ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="w-3 h-3 text-[#3ECF8E]" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-[#3ECF8E]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-[#71717A] opacity-60" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333333] font-mono">
                    {paginatedData.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="hover:bg-[#2C2C2C]/60 transition-colors group"
                      >
                        <td className="p-3 text-[10px] text-[#71717A] font-mono">
                          {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                        </td>
                        {keys.map((key) => (
                          <td key={key} className="p-3 text-[#FFFFFF]">
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
                <div className="flex items-center justify-between pt-1 px-1 text-xs text-[#3ECF8E]">
                  <span className="text-[11px] font-mono">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 bg-[#2C2C2C] hover:bg-[#333333] disabled:opacity-40 text-[#FFFFFF] rounded-lg cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 bg-[#2C2C2C] hover:bg-[#333333] disabled:opacity-40 text-[#FFFFFF] rounded-lg cursor-pointer transition-colors"
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
