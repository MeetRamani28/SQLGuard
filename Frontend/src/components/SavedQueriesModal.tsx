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
          className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/20">
                <Bookmark className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Saved Queries & Bookmarks</h2>
                <p className="text-xs text-slate-400">
                  Quick access library for enterprise SQL templates & frequent questions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center space-x-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>{showAddForm ? "Cancel" : "Add Template"}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
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
              className="border-b border-slate-800 bg-slate-950 p-5 space-y-4"
            >
              <h3 className="text-sm font-semibold text-indigo-400 flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Create Custom Saved Query Template</span>
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="Template Title (e.g. Sales Report)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Natural Language Question"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  required
                />
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-emerald-400 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-indigo-500"
                >
                  Save Template
                </button>
              </div>
            </motion.form>
          )}

          {/* Search & Tag Filter Bar */}
          <div className="flex flex-col space-y-3 border-b border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates or SQL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Tag className="h-3.5 w-3.5 text-slate-400 mr-1" />
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    selectedTag === tag
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
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
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Loading query templates...
              </div>
            ) : filteredQueries.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center space-y-2 text-center text-slate-400">
                <Code2 className="h-10 w-10 text-slate-600" />
                <p className="text-sm font-semibold">No saved query templates found</p>
                <p className="text-xs text-slate-500">
                  Bookmark queries from response cards or create a template above.
                </p>
              </div>
            ) : (
              filteredQueries.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-slate-700 hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200 text-sm">{item.title}</span>
                        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                          {item.tag || "General"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.question}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          onRunQuery(item.question);
                          onClose();
                        }}
                        className="flex items-center space-x-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-600/30"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Run</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-400 border border-slate-800">
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
