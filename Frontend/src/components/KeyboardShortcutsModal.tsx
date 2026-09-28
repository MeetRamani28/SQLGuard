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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-2xl text-[#0F172A]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-[#E0F2FE] p-2 text-[#0284C7] border border-[#0284C7]/30">
                <Keyboard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Keyboard Shortcuts & Hotkeys</h2>
                <p className="text-xs text-[#047857]">
                  Boost developer productivity with instant keyboard controls
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* List of Shortcuts */}
          <div className="p-6 space-y-3 bg-[#FFFFFF]">
            {shortcuts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs shadow-xs"
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 text-[#10B981]" />
                    <span className="text-[#0F172A] font-medium">{item.desc}</span>
                  </div>
                  <kbd className="rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] px-2.5 py-1 font-mono text-[11px] font-bold text-[#0284C7] shadow-xs">
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
