import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  Table,
  Network,
  LayoutGrid,
  Bookmark,
  Activity,
  Clock,
  ShieldCheck,
  Database,
  Terminal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState("");

  const actions = [
    { id: "schema", title: "Schema Explorer", desc: "Inspect database tables and columns", icon: Table, category: "Database" },
    { id: "er", title: "ER Schema Diagram", desc: "Visual entity relationship graph", icon: Network, category: "Database" },
    { id: "dashboard", title: "Live Pinned Dashboard", desc: "View pinned analytics metrics", icon: LayoutGrid, category: "Analytics" },
    { id: "bookmarks", title: "Saved Query Templates", desc: "Access bookmarked query library", icon: Bookmark, category: "Analytics" },
    { id: "health", title: "System Health & Metrics", desc: "CPU, RAM, SLA & Cache stats", icon: Activity, category: "System" },
    { id: "schedules", title: "Automated Schedules", desc: "Manage recurring query reports", icon: Clock, category: "System" },
    { id: "audit", title: "AST Security Audit Policy", desc: "Inspect security guard rules", icon: ShieldCheck, category: "Security" },
    { id: "connect", title: "Connect Custom Database", desc: "Configure PostgreSQL, SQLite or URL", icon: Database, category: "Database" },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.desc.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectAction("toggle-command-palette");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onSelectAction]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Search Header */}
          <div className="flex items-center border-b border-slate-800 px-4 py-3.5 bg-slate-950">
            <Search className="h-5 w-5 text-[#548CA8] mr-3 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Type a command or search feature... (Ctrl + K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Command List */}
          <div className="max-h-96 overflow-y-auto p-3 space-y-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No commands matching "{query}"
              </div>
            ) : (
              filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectAction(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 transition-colors group cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-[#548CA8]/20 text-[#548CA8] transition-colors border border-slate-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-[#548CA8] transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.category}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-2.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Terminal className="h-3.5 w-3.5 text-[#548CA8]" /> SQLGuard Command Palette
            </span>
            <span>Use ↑ ↓ to navigate, ESC to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
