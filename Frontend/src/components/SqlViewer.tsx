import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

interface SqlViewerProps {
  question?: string;
  sqlQuery: string | null;
  retryCount: number;
  explanation?: string | null;
}

export const SqlViewer: React.FC<SqlViewerProps> = ({
  question,
  sqlQuery,
  retryCount,
  explanation,
}) => {
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!sqlQuery && !question) return null;

  const isForbidden =
    sqlQuery === "FORBIDDEN" ||
    sqlQuery?.startsWith("FORBIDDEN") ||
    explanation?.includes("FORBIDDEN") ||
    explanation?.toLowerCase().includes("strictly forbidden");

  const handleCopy = () => {
    if (!sqlQuery || isForbidden) return;
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    toast.success("SQL query copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-xl backdrop-blur-sm">
      {/* Asked Question Banner */}
      {question && (
        <div className="flex items-start gap-2.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs">
          <QuestionIcon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">
              Asked Question
            </span>
            <span className="text-slate-100 font-medium text-sm break-words">
              {question}
            </span>
          </div>
        </div>
      )}

      {/* Security Error Alert Block if Forbidden */}
      {isForbidden ? (
        <div className="p-4 bg-rose-950/70 border-2 border-rose-600/80 rounded-xl space-y-2 text-rose-200 text-xs shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
            <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />
            <span>SECURITY VIOLATION BLOCKED BY AST GUARD</span>
          </div>
          <p className="text-rose-300 font-mono text-xs leading-relaxed">
            Destructive operation detected (DELETE, DROP, UPDATE, INSERT, ALTER, or PRAGMA). SQLGuard strictly permits read-only SELECT queries.
          </p>
        </div>
      ) : (
        <>
          {/* Query Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-sky-400" />
              <span>SYNTHESIZED SQL QUERY</span>
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                <ShieldCheck className="w-3 h-3" /> Read-Only AST Guard
              </span>
            </div>

            <div className="flex items-center gap-3">
              {retryCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 text-[11px]">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Retried: {retryCount}x
                </span>
              )}
              {sqlQuery && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition-colors cursor-pointer text-xs"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{copied ? "Copied" : "Copy SQL"}</span>
                </button>
              )}
            </div>
          </div>

          {/* SQL Code Box with wrapping text and no horizontal scrollbar */}
          {sqlQuery && (
            <pre className="p-3.5 bg-slate-950 rounded-lg text-emerald-400 font-mono text-xs border border-slate-800/80 leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden">
              <code>{sqlQuery}</code>
            </pre>
          )}

          {/* Explanation Accordion */}
          {explanation && (
            <div className="border-t border-slate-800/80 pt-2">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Explain SQL Logic</span>
                {showExplanation ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showExplanation && (
                <div className="mt-2 p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
                  💡 <span className="font-semibold text-slate-200">Query Breakdown:</span>{" "}
                  {explanation}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
