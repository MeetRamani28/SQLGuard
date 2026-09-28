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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#333333] bg-[#232323] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#333333] bg-[#232323]/80 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-[#3ECF8E]/10 p-2.5 text-[#3ECF8E] border border-[#3ECF8E]/20">
                <Bookmark className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Saved Queries & Bookmarks</h2>
                <p className="text-xs text-[#3ECF8E]">
                  Quick access library for enterprise SQL templates & frequent questions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-1.5 rounded-lg border border-[#3ECF8E]/30 bg-[#3ECF8E]/15 px-3 py-1.5 text-xs font-semibold text-[#3ECF8E] transition-colors hover:bg-[#3ECF8E]/25"
              >
                <Plus className="h-4 w-4" />
                <span>{showAddForm ? "Cancel" : "Add Template"}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[#3ECF8E] transition-colors hover:bg-[#2C2C2C] hover:text-white"
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
              className="border-b border-[#333333] bg-[#121212] p-5 space-y-4"
            >
              <h3 className="text-sm font-semibold text-[#3ECF8E] flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Create Custom Saved Query Template</span>
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="Template Title (e.g. Sales Report)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-lg border border-[#333333] bg-[#232323] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Natural Language Question"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="rounded-lg border border-[#333333] bg-[#232323] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none"
                  required
                />
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="rounded-lg border border-[#333333] bg-[#232323] px-3 py-2 text-xs text-white focus:border-[#3ECF8E] focus:outline-none"
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
                className="w-full rounded-lg border border-[#333333] bg-[#232323] px-3 py-2 font-mono text-xs text-[#3ECF8E] placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-[#3ECF8E] hover:bg-[#10B981] px-4 py-2 text-xs font-semibold text-[#121212] shadow-lg transition-colors"
                >
                  Save Template
                </button>
              </div>
            </motion.form>
          )}

          {/* Search & Tag Filter Bar */}
          <div className="flex flex-col space-y-3 border-b border-[#333333] bg-[#232323]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#3ECF8E]" />
              <input
                type="text"
                placeholder="Search templates or SQL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#333333] bg-[#121212] py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-[#3ECF8E] focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Tag className="h-3.5 w-3.5 text-[#3ECF8E] mr-1" />
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    selectedTag === tag
                      ? "bg-[#3ECF8E] text-[#121212] font-bold shadow-md shadow-[#3ECF8E]/20"
                      : "bg-[#2C2C2C] text-[#3ECF8E] hover:bg-[#333333] hover:text-[#FFFFFF]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* List of Templates */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-[#3ECF8E]">
                Loading query templates...
              </div>
            ) : filteredQueries.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center space-y-2 text-center text-[#3ECF8E]">
                <Code2 className="h-10 w-10 text-[#71717A]" />
                <p className="text-sm font-semibold">No saved query templates found</p>
                <p className="text-xs text-[#71717A]">
                  Bookmark queries from response cards or create a template above.
                </p>
              </div>
            ) : (
              filteredQueries.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl border border-[#333333] bg-[#121212]/60 p-4 transition-all hover:border-[#333333] hover:bg-[#121212]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#FFFFFF] text-sm">{item.title}</span>
                        <span className="rounded-md bg-[#3ECF8E]/10 px-2 py-0.5 text-[10px] font-medium text-[#3ECF8E] border border-[#3ECF8E]/20">
                          {item.tag || "General"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#3ECF8E]">{item.question}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          onRunQuery(item.question);
                          onClose();
                        }}
                        className="flex items-center space-x-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-[#3ECF8E] transition-colors hover:bg-emerald-600/30"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Run</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="rounded-lg p-1.5 text-[#71717A] transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-lg bg-[#232323] p-3 font-mono text-xs text-[#3ECF8E] border border-[#333333]">
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
