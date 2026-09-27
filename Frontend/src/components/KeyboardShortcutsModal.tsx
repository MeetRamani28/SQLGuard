import React from "react";
import { Keyboard, X, Terminal, Search, Bookmark, LayoutGrid, Table, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcuts = [
    { key: "Ctrl + K", desc: "Open Global Command Palette", icon: Terminal },
    { key: "Ctrl + Enter", desc: "Execute Natural Language / SQL Query", icon: Search },
    { key: "Ctrl + Shift + D", desc: "Open Live Pinned Dashboard", icon: LayoutGrid },
    { key: "Ctrl + Shift + S", desc: "Open Database Schema Explorer", icon: Table },
    { key: "Ctrl + Shift + B", desc: "Open Saved Query Templates", icon: Bookmark },
    { key: "Ctrl + Shift + H", desc: "Open System Health & Metrics", icon: Activity },
    { key: "Esc", desc: "Close Modals or Cancel Edit", icon: X },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
                <Keyboard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Keyboard Shortcuts & Hotkeys</h2>
                <p className="text-xs text-slate-400">
                  Boost developer productivity with instant keyboard controls
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* List of Shortcuts */}
          <div className="p-6 space-y-3">
            {shortcuts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 text-[#548CA8]" />
                    <span className="text-slate-300 font-medium">{item.desc}</span>
                  </div>
                  <kbd className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-400 shadow-inner">
                    {item.key}
                  </kbd>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
