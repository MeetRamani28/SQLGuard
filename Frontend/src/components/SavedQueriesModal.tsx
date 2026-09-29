import React, { useState, useEffect } from "react";
import {
  Bookmark,
  X,
  Search,
  Play,
  Trash2,
  Tag,
  Plus,
  Code2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SavedQueryItem } from "../types";
import {
  fetchSavedQueries,
  saveQueryTemplate,
  deleteSavedQuery,
} from "../services/api";
import { toast } from "sonner";

interface SavedQueriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunQuery: (question: string) => void;
}

export const SavedQueriesModal: React.FC<SavedQueriesModalProps> = ({
  isOpen,
  onClose,
  onRunQuery,
}) => {
  const [queries, setQueries] = useState<SavedQueryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newSql, setNewSql] = useState("");
  const [newTag, setNewTag] = useState("General");

  const loadQueries = async () => {
    setLoading(true);
    try {
      const data = await fetchSavedQueries();
      setQueries(data);
    } catch {
      toast.error("Failed to load saved queries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueries();
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuestion.trim() || !newSql.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const created = await saveQueryTemplate(newTitle, newQuestion, newSql, newTag);
    if (created) {
      toast.success("Query template bookmarked!");
      setQueries([created, ...queries]);
      setNewTitle("");
      setNewQuestion("");
      setNewSql("");
      setShowAddForm(false);
    } else {
      toast.error("Failed to bookmark query.");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await deleteSavedQuery(id);
    if (ok) {
      setQueries(queries.filter((q) => q.id !== id));
      toast.info(`Deleted "${title}"`);
    } else {
      toast.error("Failed to delete query template.");
    }
  };

  const tags = ["All", ...Array.from(new Set(queries.map((q) => q.tag || "General")))];

  const filteredQueries = queries.filter((q) => {
    const matchesTag = selectedTag === "All" || (q.tag || "General") === selectedTag;
    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.sql_query.toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-2 sm:p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex h-[88vh] sm:h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-2xl text-[#0F172A]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 sm:px-6 py-3.5 shrink-0">
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="rounded-xl bg-[#ECFDF5] p-2 sm:p-2.5 text-[#10B981] border border-[#10B981]/30 shrink-0">
                <Bookmark className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-[#0F172A] truncate">
                  Saved Queries & Bookmarks
                </h2>
                <p className="text-[11px] sm:text-xs text-[#047857] truncate hidden xs:block">
                  Quick access library for enterprise SQL templates & frequent questions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-1.5 rounded-lg border border-[#10B981]/30 bg-[#ECFDF5] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#047857] transition-all hover:bg-[#D1FAE5] cursor-pointer"
              >
                <Plus className="h-4 w-4 text-[#10B981]" />
                <span className="hidden xs:inline">{showAddForm ? "Cancel" : "Add Template"}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Add Template Form */}
          {showAddForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleCreate}
              className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5 space-y-3 sm:space-y-4 shrink-0"
            >
              <h3 className="text-xs sm:text-sm font-semibold text-[#047857] flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-[#10B981]" />
                <span>Create Custom Saved Query Template</span>
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="Template Title (e.g. Sales Report)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#10B981] focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Natural Language Question"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#10B981] focus:outline-none"
                  required
                />
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#10B981] focus:outline-none"
                >
                  <option value="General">General</option>
                  <option value="Sales">Sales</option>
                  <option value="Audit">Audit</option>
                  <option value="Executive">Executive</option>
                  <option value="Security">Security</option>
                </select>
              </div>
              <textarea
                placeholder="SQL Query (SELECT ...)"
                value={newSql}
                onChange={(e) => setNewSql(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 font-mono text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#10B981] focus:outline-none"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-[#10B981] hover:bg-[#059669] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </motion.form>
          )}

          {/* Search & Tag Filter Bar */}
          <div className="flex flex-col space-y-3 border-b border-[#E2E8F0] bg-[#FFFFFF] p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search templates or SQL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] py-2 pl-9 pr-4 text-xs text-[#0F172A] placeholder-slate-400 focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              <Tag className="h-3.5 w-3.5 text-[#10B981] mr-1 shrink-0" />
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedTag === tag
                      ? "bg-[#10B981] text-white font-bold shadow-xs"
                      : "bg-[#F8FAFC] text-[#047857] border border-[#E2E8F0] hover:bg-[#ECFDF5]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* List of Templates */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar bg-[#F8FAFC]">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-xs font-semibold text-[#047857]">
                Loading query templates...
              </div>
            ) : filteredQueries.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center space-y-2 text-center text-[#047857]">
                <Code2 className="h-10 w-10 text-[#94A3B8]" />
                <p className="text-xs font-semibold text-[#0F172A]">No saved query templates found</p>
                <p className="text-[11px] text-[#64748B]">
                  Bookmark queries from response cards or create a template above.
                </p>
              </div>
            ) : (
              filteredQueries.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 transition-all hover:border-[#10B981]/40 shadow-xs hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-[#0F172A] text-sm">{item.title}</span>
                        <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-medium text-[#047857] border border-[#10B981]/30 font-mono">
                          {item.tag || "General"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#047857] font-medium">{item.question}</p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => {
                          onRunQuery(item.question);
                          onClose();
                        }}
                        className="flex items-center space-x-1.5 rounded-lg bg-[#ECFDF5] border border-[#10B981]/30 px-3 py-1.5 text-xs font-semibold text-[#047857] transition-all hover:bg-[#D1FAE5] cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 text-[#10B981]" />
                        <span>Run</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-lg bg-[#F8FAFC] p-3 font-mono text-xs text-[#0F172A] border border-[#E2E8F0] custom-scrollbar">
                    {item.sql_query}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
