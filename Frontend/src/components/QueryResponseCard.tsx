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
  Sparkles,
  Pin,
  Play,
  Edit3,
  AlertTriangle,
  Gauge,
  Globe,
  Bookmark,
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
import { toast } from "sonner";
import type { QueryResponseData } from "../types";
import { useChat } from "../context/ChatContext";
import {
  executeRawUserSql,
  optimizeSql,
  translateSql,
  saveQueryTemplate,
  formatSql,
  generateNarrative,
  translateExplanation,
} from "../services/api";

interface QueryResponseCardProps {
  data: QueryResponseData;
}

const CHART_COLORS = [
  "#548CA8", // Oceanic Steel Cyan
  "#818cf8", // Indigo Accent
  "#476072", // Muted Slate Blue
  "#34d399", // Emerald
  "#c084fc", // Purple
  "#fbbf24", // Amber
];

export const QueryResponseCard: React.FC<QueryResponseCardProps> = ({ data: initialData }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { pinCard, dbConfig } = useChat();

  const [cardData, setCardData] = useState<QueryResponseData>(initialData);
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Playground state
  const [isEditingSql, setIsEditingSql] = useState(false);
  const [editedSql, setEditedSql] = useState(initialData.sql_query || "");
  const [isExecutingPlayground, setIsExecutingPlayground] = useState(false);

  // Optimizer & Enterprise state
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizerResult, setOptimizerResult] = useState<import("../types").SqlOptimizationResult | null>(null);
  const [targetDialect, setTargetDialect] = useState("postgres");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  // Dynamic Chart & Palette Customizer State
  const [activeChartType, setActiveChartType] = useState<"bar" | "line" | "pie" | "table">(
    initialData.chart_type === "none" ? "table" : (initialData.chart_type || "table")
  );
  const [activePalette, setActivePalette] = useState<"cyan" | "emerald" | "sunset" | "purple">("cyan");

  const paletteColors = useMemo(() => {
    switch (activePalette) {
      case "emerald":
        return ["#10b981", "#34d399", "#059669", "#6ee7b7", "#047857", "#a7f3d0"];
      case "sunset":
        return ["#f59e0b", "#fbbf24", "#d97706", "#f97316", "#ef4444", "#fde68a"];
      case "purple":
        return ["#8b5cf6", "#a855f7", "#c084fc", "#7c3aed", "#e879f9", "#ddd6fe"];
      default:
        return ["#548CA8", "#818cf8", "#476072", "#34d399", "#c084fc", "#fbbf24"];
    }
  }, [activePalette]);

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
    explanation,
    executive_summary: executiveSummary,
    anomalies,
    retry_count: retryCount,
    error_trace: errorTrace,
    execution_time_ms: executionTimeMs,
  } = cardData;

  const handleOptimizeSql = async () => {
    if (!sqlQuery) return;
    setIsOptimizing(true);
    try {
      const res = await optimizeSql(sqlQuery, dbConfig?.db_type || "sqlite");
      setOptimizerResult(res);
      setShowOptimizer(!showOptimizer);
      if (!showOptimizer) {
        toast.success(`Optimizer Score: ${res.performance_score}/100`);
      }
    } catch {
      toast.error("Failed to run AI SQL Optimizer.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleTranslateDialect = async (dialect: string) => {
    if (!editedSql) return;
    setTargetDialect(dialect);
    setIsTranslating(true);
    try {
      const res = await translateSql(editedSql, dialect, dbConfig?.db_type || "sqlite");
      if (res.translated_sql) {
        setEditedSql(res.translated_sql);
        toast.success(`Translated to ${dialect.toUpperCase()}!`);
      }
    } catch {
      toast.error("Failed to translate SQL dialect.");
    } finally {
      setIsTranslating(false);
    }
  };

  const [narrativeStory, setNarrativeStory] = useState<string | null>(null);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [translatedInsight, setTranslatedInsight] = useState<{ text: string; lang: string } | null>(null);
  const [isTranslatingInsight, setIsTranslatingInsight] = useState(false);

  const handleTranslateInsight = async (targetLang: "gu" | "hi") => {
    if (!explanation) return;
    setIsTranslatingInsight(true);
    try {
      const res = await translateExplanation(explanation, targetLang);
      if (res.translated_text) {
        const langName = targetLang === "gu" ? "Gujarati (ગુજરાતી)" : "Hindi (हिंदी)";
        setTranslatedInsight({ text: res.translated_text, lang: langName });
        toast.success(`Business Insight translated into ${langName}!`);
      }
    } catch {
      toast.error("Translation failed.");
    } finally {
      setIsTranslatingInsight(false);
    }
  };

  const handleFormatSql = async () => {
    if (!editedSql) return;
    const res = await formatSql(editedSql, dbConfig?.db_type || "sqlite");
    if (res.formatted_sql) {
      setEditedSql(res.formatted_sql);
      toast.success("SQL formatted & beautified!");
    }
  };

  const handleFetchNarrative = async () => {
    if (!queryResult || queryResult.length === 0) return;
    setIsGeneratingNarrative(true);
    try {
      const text = await generateNarrative(question, sqlQuery || "", queryResult);
      setNarrativeStory(text);
      toast.success("Executive data narrative generated!");
    } catch {
      toast.error("Failed to generate data narrative.");
    } finally {
      setIsGeneratingNarrative(false);
    }
  };

  const handleBookmarkQuery = async () => {
    if (!sqlQuery || !question) return;
    setIsBookmarking(true);
    try {
      const saved = await saveQueryTemplate(
        question.slice(0, 35),
        question,
        sqlQuery,
        "Executive"
      );
      if (saved) {
        toast.success("Query bookmarked to Saved Queries Library!");
      }
    } catch {
      toast.error("Failed to bookmark query.");
    } finally {
      setIsBookmarking(false);
    }
  };

  const isForbidden =
    sqlQuery === "FORBIDDEN" ||
    sqlQuery?.startsWith("FORBIDDEN") ||
    errorTrace?.includes("SECURITY ERROR") ||
    explanation?.toLowerCase().includes("forbidden");

  const results = queryResult || [];
  const keys = results.length > 0 ? Object.keys(results[0]) : [];
  const xAxisKey = keys[0];
  const valueKeys = keys.slice(1);

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

  const handleRunPlaygroundSql = async () => {
    if (!editedSql.trim() || isExecutingPlayground) return;
    setIsExecutingPlayground(true);
    try {
      const res = await executeRawUserSql(editedSql.trim(), dbConfig, question);
      setCardData(res);
      setIsEditingSql(false);
      toast.success("Custom SQL executed cleanly!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to execute custom SQL.");
    } finally {
      setIsExecutingPlayground(false);
    }
  };

  const exportToCSV = () => {
    if (!results || results.length === 0) return;
    try {
      const headers = keys.join(",");
      const rows = results.map((row: any) =>
        keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
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
    setIsExportingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      // Background Slate Layout
      pdf.setFillColor(30, 41, 59); // Slate dark
      pdf.rect(0, 0, 595, 842, "F");

      // Title & Brand Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(56, 189, 248); // Oceanic Cyan
      pdf.text("SQLGuard Analytics Report", 40, 50);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generated: ${new Date().toLocaleString()}  |  AST Guard Policy Verified`, 40, 68);

      let currentY = 100;

      // User Question Box
      pdf.setFillColor(51, 66, 87);
      pdf.roundedRect(40, currentY, 515, 45, 6, 6, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(56, 189, 248);
      pdf.text("QUERY QUESTION:", 52, currentY + 16);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(248, 250, 252);
      const questionLines = pdf.splitTextToSize(question || "Analytics Query", 490);
      pdf.text(questionLines, 52, currentY + 32);

      currentY += 60;

      // Synthesized SQL Box
      if (sqlQuery) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(56, 189, 248);
        pdf.text("SYNTHESIZED READ-ONLY SQL QUERY:", 40, currentY);
        currentY += 12;

        pdf.setFillColor(15, 23, 42);
        pdf.roundedRect(40, currentY, 515, 50, 6, 6, "F");

        pdf.setFont("courier", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(52, 211, 153); // Emerald
        const splitSql = pdf.splitTextToSize(sqlQuery, 495);
        pdf.text(splitSql, 52, currentY + 18);

        currentY += 65;
      }

      // AI Executive Summary
      if (executiveSummary && executiveSummary.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(56, 189, 248);
        pdf.text("AI EXECUTIVE INSIGHTS:", 40, currentY);
        currentY += 14;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(226, 232, 240);

        executiveSummary.forEach((point) => {
          const bulletText = `•  ${point}`;
          const lines = pdf.splitTextToSize(bulletText, 500);
          pdf.text(lines, 45, currentY);
          currentY += lines.length * 13 + 3;
        });

        currentY += 15;
      }

      // Result Data Table
      if (results && results.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(56, 189, 248);
        pdf.text(`QUERY RESULTS (${results.length} RECORD${results.length > 1 ? "S" : ""}):`, 40, currentY);
        currentY += 14;

        const tableKeys = keys.slice(0, 5);
        const colWidth = 515 / tableKeys.length;

        // Header row
        pdf.setFillColor(51, 66, 87);
        pdf.rect(40, currentY, 515, 20, "F");

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(248, 250, 252);
        tableKeys.forEach((k, colIdx) => {
          pdf.text(String(k).toUpperCase(), 45 + colIdx * colWidth, currentY + 13);
        });
        currentY += 20;

        // Data Rows
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        results.slice(0, 30).forEach((row, rowIdx) => {
          if (currentY > 800) {
            pdf.addPage();
            pdf.setFillColor(30, 41, 59);
            pdf.rect(0, 0, 595, 842, "F");
            currentY = 40;
          }

          if (rowIdx % 2 === 0) {
            pdf.setFillColor(30, 41, 59);
          } else {
            pdf.setFillColor(24, 34, 48);
          }
          pdf.rect(40, currentY, 515, 18, "F");

          pdf.setTextColor(203, 213, 225);
          tableKeys.forEach((k, colIdx) => {
            const valStr = String(row[k] ?? "");
            pdf.text(valStr.slice(0, 25), 45 + colIdx * colWidth, currentY + 12);
          });
          currentY += 18;
        });
      }

      const filename = `${getSanitizedBaseName()}.pdf`;
      pdf.save(filename);
      toast.success(`Exported PDF Report: ${filename}`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to generate PDF report.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!results || results.length === 0) return;
    try {
      const headerRow = `| ${keys.join(" | ")} |`;
      const dividerRow = `| ${keys.map(() => "---").join(" | ")} |`;
      const dataRows = results
        .map((row: any) => `| ${keys.map((k) => String(row[k] ?? "")).join(" | ")} |`)
        .join("\n");
      const mdTable = `${headerRow}\n${dividerRow}\n${dataRows}`;
      navigator.clipboard.writeText(mdTable);
      toast.success("Table copied as Markdown!");
    } catch {
      toast.error("Failed to copy Markdown.");
    }
  };

  const handleCopyJson = () => {
    if (!results || results.length === 0) return;
    try {
      navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      toast.success("Data copied as JSON!");
    } catch {
      toast.error("Failed to copy JSON.");
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
      className="bg-[#334257]/90 border border-[#476072]/60 hover:border-[#548CA8]/50 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 backdrop-blur-md transition-all"
    >
      {/* 1. MASTER CARD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#476072]/50 pb-3">
        {/* Asked Question Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 bg-[#548CA8]/15 border border-[#548CA8]/30 rounded-lg text-[#548CA8] shrink-0">
            <QuestionIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#548CA8] block">
              QUERY QUESTION
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[#EEEEEE] truncate block">
              {question}
            </span>
          </div>
        </div>

        {/* Header Badges & Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 max-w-full">
          {executionTimeMs !== undefined && executionTimeMs > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40 font-mono">
              <Zap className="w-3 h-3 text-emerald-400" /> {executionTimeMs}ms
            </span>
          )}

          {retryCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin" /> {retryCount}x Retry
            </span>
          )}

          {/* Pin to Live Dashboard */}
          <button
            onClick={() => pinCard(cardData)}
            className="flex items-center gap-1 text-xs bg-[#1E293B] hover:bg-[#548CA8]/20 text-[#548CA8] hover:text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-[#476072]/60 cursor-pointer transition-colors"
            title="Pin to Live Dashboard"
          >
            <Pin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pin</span>
          </button>

          {/* Edit SQL Playground Toggle */}
          {sqlQuery && !isForbidden && (
            <button
              onClick={() => {
                setEditedSql(sqlQuery);
                setIsEditingSql(!isEditingSql);
              }}
              className="flex items-center gap-1 text-xs bg-[#1E293B] hover:bg-[#476072] text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-[#476072]/60 cursor-pointer transition-colors"
              title="Edit SQL Query"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#548CA8]" />
              <span className="hidden sm:inline">{isEditingSql ? "Cancel" : "Edit SQL"}</span>
            </button>
          )}

          {/* Copy SQL */}
          {sqlQuery && !isForbidden && (
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 text-xs bg-[#1E293B] hover:bg-[#476072] text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-[#476072]/60 cursor-pointer transition-colors"
              title="Copy SQL"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#548CA8]" />
              )}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          )}

          {/* AI Query Optimizer Toggle */}
          {sqlQuery && !isForbidden && (
            <button
              onClick={handleOptimizeSql}
              disabled={isOptimizing}
              className="flex items-center gap-1 text-xs bg-[#1E293B] hover:bg-[#548CA8]/20 text-indigo-400 hover:text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-indigo-500/30 cursor-pointer transition-colors"
              title="AI Query Performance Optimizer"
            >
              {isOptimizing ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              ) : (
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span className="hidden sm:inline">Optimizer</span>
            </button>
          )}

          {/* Bookmark Query */}
          {sqlQuery && !isForbidden && (
            <button
              onClick={handleBookmarkQuery}
              disabled={isBookmarking}
              className="flex items-center gap-1 text-xs bg-[#1E293B] hover:bg-[#548CA8]/20 text-amber-400 hover:text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-amber-500/30 cursor-pointer transition-colors"
              title="Bookmark to Saved Queries Library"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Bookmark</span>
            </button>
          )}

          {results.length > 0 && (
            <>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 text-xs bg-[#1E293B] hover:bg-[#476072] text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-[#476072]/60 cursor-pointer transition-colors"
                title="Copy Table as Markdown"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">MD</span>
              </button>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 text-xs bg-[#1E293B] hover:bg-[#476072] text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-[#476072]/60 cursor-pointer transition-colors"
                title="Copy Data as JSON"
              >
                <Code className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">JSON</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 text-xs bg-[#1E293B] hover:bg-[#476072] text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-[#476072]/60 cursor-pointer transition-colors"
                title="Export CSV / Excel Data"
              >
                <Download className="w-3.5 h-3.5 text-[#548CA8]" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 text-xs bg-[#1E293B] hover:bg-[#476072] disabled:opacity-50 text-[#EEEEEE] px-2.5 py-1.5 rounded-lg border border-[#476072]/60 cursor-pointer transition-colors"
                title="Export PDF Report"
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

      {/* 1.5 DATA ANOMALY ALERT BANNER */}
      {anomalies && anomalies.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-amber-200">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Automated Data Quality Anomaly Alert</span>
          </div>
          <div className="mt-2 space-y-1 pl-6">
            {anomalies.map((a: any, idx: number) => (
              <p key={idx} className="text-xs text-amber-300/90 font-mono">
                • {a.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 1.6 AI QUERY OPTIMIZER PANEL */}
      {showOptimizer && optimizerResult && (
        <div className="rounded-xl border border-indigo-500/40 bg-slate-900/90 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Gauge className="h-5 w-5 text-indigo-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                AI SQL Performance Optimizer & Tuning Plan
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-400">
                Complexity: <strong className="text-indigo-300">{optimizerResult.complexity_score}</strong>
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-bold text-emerald-400 border border-emerald-500/20">
                Performance Score: {optimizerResult.performance_score}/100
              </span>
            </div>
          </div>
          <div className="space-y-1.5 pl-2">
            {optimizerResult.recommendations.map((rec: string, i: number) => (
              <div key={i} className="flex items-start space-x-2 text-xs text-slate-300">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. EXECUTIVE SUMMARY HIGHLIGHTS */}
      {executiveSummary && executiveSummary.length > 0 && !isForbidden && (
        <div className="p-3 bg-[#1E293B] border border-[#548CA8]/40 rounded-xl space-y-1.5 text-xs text-[#EEEEEE]">
          <div className="flex items-center gap-2 text-[#548CA8] font-bold text-xs">
            <Sparkles className="w-4 h-4 text-[#548CA8]" />
            <span>AI EXECUTIVE SUMMARY & KEY INSIGHTS</span>
          </div>
          <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
            {executiveSummary.map((bullet: string, idx: number) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. SECURITY ALERT OR SYNTHESIZED SQL QUERY */}
      {isForbidden ? (
        <div className="p-4 bg-rose-950/80 border-2 border-rose-600/80 rounded-xl space-y-2 text-rose-200 text-xs shadow-2xl">
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
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2 flex-wrap">
                <Code className="w-3.5 h-3.5 text-[#548CA8]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#548CA8]">
                  SYNTHESIZED SQL QUERY
                </span>
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[10px]">
                  <ShieldCheck className="w-3 h-3" /> AST Guard Verified
                </span>
              </div>
            </div>

            {/* Interactive SQL Playground Mode */}
            {isEditingSql ? (
              <div className="space-y-2 bg-[#1E293B] p-3 rounded-xl border border-[#548CA8]/50">
                <textarea
                  value={editedSql}
                  onChange={(e) => setEditedSql(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0f172a] text-emerald-400 font-mono text-xs p-3 rounded-lg border border-[#476072] focus:outline-none focus:border-[#548CA8]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/60 pt-2">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[11px] text-slate-400">Translate Dialect:</span>
                    <select
                      value={targetDialect}
                      onChange={(e) => handleTranslateDialect(e.target.value)}
                      disabled={isTranslating}
                      className="bg-[#0f172a] text-xs text-indigo-300 font-mono rounded border border-slate-700 px-2 py-1 focus:outline-none"
                    >
                      <option value="postgres">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="sqlite">SQLite</option>
                      <option value="snowflake">Snowflake</option>
                      <option value="bigquery">BigQuery</option>
                      <option value="oracle">Oracle</option>
                      <option value="tsql">SQL Server</option>
                    </select>
                    {isTranslating && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFormatSql}
                      className="px-2.5 py-1.5 text-xs text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Format SQL</span>
                    </button>
                    <button
                      onClick={() => setIsEditingSql(false)}
                      className="px-3 py-1.5 text-xs text-slate-300 bg-[#334257] hover:bg-[#476072] rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRunPlaygroundSql}
                      disabled={isExecutingPlayground}
                      className="px-3 py-1.5 text-xs text-[#EEEEEE] font-bold bg-[#548CA8] hover:bg-[#476072] rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {isExecutingPlayground ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>Run Custom SQL</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Formatted Code Block */
              <pre className="p-3 bg-[#1E293B] rounded-xl text-emerald-400 font-mono text-xs border border-[#476072]/60 leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden shadow-inner">
                <code>{sqlQuery}</code>
              </pre>
            )}

            {/* Explain Logic Toggle */}
            {explanation && (
              <div>
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-1 text-[11px] text-[#548CA8] hover:text-[#EEEEEE] font-medium transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3 text-[#548CA8]" />
                  <span>Explain Query Logic</span>
                  {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showExplanation && (
                  <div className="mt-1.5 p-2.5 bg-[#1E293B]/90 border border-[#476072]/60 rounded-lg text-xs text-slate-200 leading-relaxed">
                    💡 <span className="font-semibold text-[#548CA8]">Logic Breakdown:</span> {explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* 3. BUSINESS INSIGHT BAR */}
      {explanation && !isForbidden && (
        <div className="p-3 bg-[#1E293B]/80 rounded-xl text-xs text-[#EEEEEE] border border-[#548CA8]/30 leading-relaxed shadow-inner space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#548CA8]">
              <Sparkles className="w-3.5 h-3.5 text-[#548CA8]" />
              <span>Business Insight</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-400">Translate Insight:</span>
              <button
                onClick={() => handleTranslateInsight("gu")}
                disabled={isTranslatingInsight}
                className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-700/50 hover:border-sky-400 text-sky-300 font-semibold cursor-pointer transition-colors"
              >
                Gujarati (ગુજરાતી)
              </button>
              <button
                onClick={() => handleTranslateInsight("hi")}
                disabled={isTranslatingInsight}
                className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 hover:border-amber-400 text-amber-300 font-semibold cursor-pointer transition-colors"
              >
                Hindi (हिंदी)
              </button>
              {isTranslatingInsight && <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />}
            </div>
          </div>

          <p className="text-slate-200">{explanation}</p>

          {translatedInsight && (
            <div className="p-2.5 bg-[#0f172a] border border-[#548CA8]/40 rounded-lg text-xs text-emerald-300 font-medium space-y-0.5">
              <span className="text-[10px] text-[#548CA8] uppercase font-bold tracking-wider block">
                {translatedInsight.lang} Translation:
              </span>
              <p className="text-emerald-200 font-sans">{translatedInsight.text}</p>
            </div>
          )}
        </div>
      )}

      {/* 3.5 AI DATA STORYTELLER NARRATIVE */}
      {results.length > 0 && !isForbidden && (
        <div className="space-y-2">
          {!narrativeStory ? (
            <button
              onClick={handleFetchNarrative}
              disabled={isGeneratingNarrative}
              className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              {isGeneratingNarrative ? (
                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>Generate AI Data Storyteller Narrative</span>
            </button>
          ) : (
            <div className="p-3.5 bg-purple-950/40 border border-purple-500/40 rounded-xl space-y-1.5 text-xs text-purple-200">
              <div className="flex items-center space-x-2 font-bold text-purple-400 text-xs">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Executive Data Storyteller Narrative</span>
              </div>
              <p className="text-purple-200/90 leading-relaxed font-sans text-xs">
                {narrativeStory}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. VISUALIZATION OR DATA PRESENTATION */}
      {results.length > 0 && !isForbidden && (
        <div className="space-y-3 pt-1 border-t border-[#476072]/50">
          {/* KPI Stat Cards */}
          {isKpiMetric ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {keys.map((k, idx) => (
                <div
                  key={k}
                  className="p-4 bg-[#1E293B] border border-[#548CA8]/30 rounded-xl shadow-xl flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-[11px] uppercase font-bold text-[#548CA8] tracking-wider block">
                      {k.replace(/_/g, " ")}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#EEEEEE] font-mono">
                      {String(results[0][k] ?? "0")}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#548CA8]/20 border border-[#548CA8]/30 rounded-xl text-[#548CA8]">
                    {idx === 0 ? <TrendingUp className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full space-y-3">
              {/* Dynamic Chart & Palette Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1E293B] p-2 rounded-xl border border-[#476072]/50 text-xs">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">View:</span>
                  {(["bar", "line", "pie", "table"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setActiveChartType(type)}
                      className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] transition-colors ${
                        activeChartType === type
                          ? "bg-[#548CA8] text-white shadow"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Palette:</span>
                  <select
                    value={activePalette}
                    onChange={(e) => setActivePalette(e.target.value as any)}
                    className="bg-[#0f172a] text-xs text-[#548CA8] rounded border border-slate-700 px-2 py-0.5 focus:outline-none"
                  >
                    <option value="cyan">Oceanic Cyan</option>
                    <option value="emerald">Emerald Matrix</option>
                    <option value="sunset">Sunset Amber</option>
                    <option value="purple">Violet Aurora</option>
                  </select>
                </div>
              </div>

              {activeChartType === "bar" && (
                <div className="h-64 sm:h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#476072" />
                      <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        cursor={{ fill: "rgba(84, 140, 168, 0.12)" }}
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          borderColor: "#548CA8",
                          color: "#EEEEEE",
                          borderRadius: "10px",
                        }}
                      />
                      <Legend />
                      {valueKeys.map((key, idx) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          fill={paletteColors[idx % paletteColors.length]}
                          radius={[6, 6, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeChartType === "line" && (
                <div className="h-64 sm:h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#476072" />
                      <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        cursor={{ stroke: "#548CA8", strokeWidth: 1, strokeDasharray: "4 4" }}
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          borderColor: "#548CA8",
                          color: "#EEEEEE",
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

              {activeChartType === "pie" && (
                <div className="h-64 sm:h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E293B",
                          borderColor: "#548CA8",
                          color: "#EEEEEE",
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
                        outerRadius={85}
                        label
                      >
                        {results.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={paletteColors[index % paletteColors.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ENTERPRISE DATA TABLE */}
              {activeChartType === "table" && (
                <div className="space-y-2.5 pt-1">
                  {/* Table Search & Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1E293B]/80 p-2 rounded-xl border border-[#476072]/60">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search records..."
                        className="w-full bg-[#334257] border border-[#476072] rounded-lg pl-8 pr-2.5 py-1 text-xs text-[#EEEEEE] placeholder-slate-400 focus:outline-none focus:border-[#548CA8]"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="text-[10px] font-mono text-[#548CA8]">
                        Total: {filteredAndSortedData.length} records
                      </span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-[#334257] border border-[#476072] rounded px-2 py-0.5 text-[11px] text-[#EEEEEE] focus:outline-none"
                      >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                      </select>
                    </div>
                  </div>

                  {/* Table Element */}
                  <div className="overflow-x-auto border border-[#476072]/60 rounded-xl bg-[#1E293B]/80 shadow-inner custom-scrollbar">
                    <table className="w-full text-xs text-left text-slate-200 border-collapse">
                      <thead className="bg-[#334257] text-[#548CA8] uppercase font-semibold border-b border-[#476072]/60 sticky top-0">
                        <tr>
                          <th className="p-2.5 text-[10px] text-slate-400 w-8">#</th>
                          {keys.map((key) => (
                            <th
                              key={key}
                              onClick={() => handleSort(key)}
                              className="p-2.5 cursor-pointer hover:text-[#EEEEEE] transition-colors select-none"
                            >
                              <div className="flex items-center gap-1 font-mono text-[11px]">
                                <span>{key}</span>
                                {sortColumn === key ? (
                                  sortDirection === "asc" ? (
                                    <ArrowUp className="w-3 h-3 text-[#548CA8]" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 text-[#548CA8]" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#476072]/40 font-mono text-[11px]">
                        {paginatedData.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className="hover:bg-[#334257]/50 transition-colors"
                          >
                            <td className="p-2.5 text-[10px] text-slate-500">
                              {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                            </td>
                            {keys.map((key) => (
                              <td key={key} className="p-2.5 text-[#EEEEEE]">
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
                    <div className="flex items-center justify-between px-1 text-xs text-slate-300">
                      <span className="text-[10px] font-mono text-[#548CA8]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1 bg-[#334257] hover:bg-[#476072] disabled:opacity-40 text-slate-300 rounded cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 bg-[#334257] hover:bg-[#476072] disabled:opacity-40 text-slate-300 rounded cursor-pointer"
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
