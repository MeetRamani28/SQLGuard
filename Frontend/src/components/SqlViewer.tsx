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
  Sparkles,
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
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 space-y-3 shadow-md">
      {/* Asked Question Banner */}
      {question && (
        <div className="flex items-start gap-2.5 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] text-xs">
          <QuestionIcon className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[#047857] font-semibold block text-[10px] uppercase tracking-wider">
              Asked Question
            </span>
            <span className="text-[#0F172A] font-medium text-sm break-words">
              {question}
            </span>
          </div>
        </div>
      )}

      {/* Security Error Alert Block if Forbidden */}
      {isForbidden ? (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-rose-800 text-xs shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-700">
            <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse shrink-0" />
            <span>SECURITY VIOLATION BLOCKED BY AST GUARD</span>
          </div>
          <p className="text-rose-700 font-mono text-xs leading-relaxed">
            Destructive operation detected (DELETE, DROP, UPDATE, INSERT, ALTER, or PRAGMA). SQLGuard strictly permits read-only SELECT queries.
          </p>
        </div>
      ) : (
        <>
          {/* Query Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#047857] pt-1">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-[#10B981]" />
              <span>SYNTHESIZED SQL QUERY</span>
              <span className="flex items-center gap-1 text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#10B981]/30 text-[11px]">
                <ShieldCheck className="w-3 h-3" /> Read-Only AST Guard
              </span>
            </div>

            <div className="flex items-center gap-3">
              {retryCount > 0 && (
                <span className="flex items-center gap-1 text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#F59E0B]/30 text-[11px]">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Retried: {retryCount}x
                </span>
              )}
              {sqlQuery && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] px-2.5 py-1 rounded border border-[#E2E8F0] transition-colors cursor-pointer text-xs"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#10B981]" />
                  )}
                  <span>{copied ? "Copied" : "Copy SQL"}</span>
                </button>
              )}
            </div>
          </div>

          {/* SQL Code Box with wrapping text and no horizontal scrollbar */}
          {sqlQuery && (
            <pre className="p-3.5 bg-[#0F172A] rounded-lg text-[#10B981] font-mono text-xs border border-[#1E293B] leading-relaxed whitespace-pre-wrap break-words overflow-x-hidden shadow-inner">
              <code>{sqlQuery}</code>
            </pre>
          )}

          {/* Explanation Accordion */}
          {explanation && (
            <div className="border-t border-[#E2E8F0] pt-2">
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-1.5 text-xs text-[#047857] hover:text-[#0F172A] font-medium transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Explain SQL Logic</span>
                {showExplanation ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showExplanation && (
                <div className="mt-2 p-3 bg-[#ECFDF5] border border-[#10B981]/30 rounded-lg text-xs text-[#0F172A] leading-relaxed">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981] inline mr-1" /> <span className="font-semibold text-[#047857]">Query Breakdown:</span>{" "}
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
