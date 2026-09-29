import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  Sparkles,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Trash2,
  User,
  Terminal,
  Plus,
  Edit2,
  Check,
  Table as TableIcon,
  XCircle,
  Menu,
  ChevronsLeft,
  X,
  Pin,
  ShieldCheck,
  LayoutGrid,
  Activity,
  Bookmark,
  Mic,
  Network,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { ChatProvider, useChat } from "./context/ChatContext";
import { QueryResponseCard } from "./components/QueryResponseCard";
import { Database3DCanvas } from "./components/Database3DCanvas";
import { SQLGuard3DLogo } from "./components/SQLGuard3DLogo";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { AuthGateway, UserButton } from "./components/AuthGateway";
import type { QueryResponseData } from "./types";

// Code splitting & Lazy loading heavy modal components for smooth page loading
const ConnectDbModal = lazy(() =>
  import("./components/ConnectDbModal").then((m) => ({ default: m.ConnectDbModal }))
);
const SchemaExplorerModal = lazy(() =>
  import("./components/SchemaExplorerModal").then((m) => ({ default: m.SchemaExplorerModal }))
);
const SavedQueriesModal = lazy(() =>
  import("./components/SavedQueriesModal").then((m) => ({ default: m.SavedQueriesModal }))
);
const ErDiagramModal = lazy(() =>
  import("./components/ErDiagramModal").then((m) => ({ default: m.ErDiagramModal }))
);
const SystemHealthModal = lazy(() =>
  import("./components/SystemHealthModal").then((m) => ({ default: m.SystemHealthModal }))
);
const QueryScheduleModal = lazy(() =>
  import("./components/QueryScheduleModal").then((m) => ({ default: m.QueryScheduleModal }))
);
const CommandPaletteModal = lazy(() =>
  import("./components/CommandPaletteModal").then((m) => ({ default: m.CommandPaletteModal }))
);
const QueryCompareModal = lazy(() =>
  import("./components/QueryCompareModal").then((m) => ({ default: m.QueryCompareModal }))
);
const KeyboardShortcutsModal = lazy(() =>
  import("./components/KeyboardShortcutsModal").then((m) => ({ default: m.KeyboardShortcutsModal }))
);
const QueryHistoryModal = lazy(() =>
  import("./components/QueryHistoryModal").then((m) => ({ default: m.QueryHistoryModal }))
);


const MainAppContent: React.FC<{
  userContext: { userId: string; userEmail: string; userName: string };
}> = ({ userContext }) => {
  const {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    loading,
    dbConfig,
    history,
    pinnedCards,
    tableChips,
    sampleQuestions,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
    sendMessage,
    saveDbConfig,
    disconnectDb,
    loadHistoryItem,
    clearHistory,
    unpinCard,
  } = useChat();

  const [questionInput, setQuestionInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [isSavedQueriesModalOpen, setIsSavedQueriesModalOpen] = useState(false);
  const [isErDiagramModalOpen, setIsErDiagramModalOpen] = useState(false);
  const [isSystemHealthModalOpen, setIsSystemHealthModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQueryHistoryModalOpen, setIsQueryHistoryModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isKeyboardModalOpen, setIsKeyboardModalOpen] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const isAnyModalOpen =
    isDbModalOpen ||
    isSchemaModalOpen ||
    isDashboardModalOpen ||
    isAuditLogModalOpen ||
    isSavedQueriesModalOpen ||
    isErDiagramModalOpen ||
    isSystemHealthModalOpen ||
    isScheduleModalOpen ||
    isCommandPaletteOpen ||
    isQueryHistoryModalOpen ||
    isCompareModalOpen ||
    isKeyboardModalOpen;

  const handleCommandSelect = (actionId: string) => {
    switch (actionId) {
      case "toggle-command-palette":
        setIsCommandPaletteOpen(true);
        break;
      case "shortcuts":
      case "hotkeys":
        setIsKeyboardModalOpen(true);
        break;
      case "schema":
        setIsSchemaModalOpen(true);
        break;
      case "er":
        setIsErDiagramModalOpen(true);
        break;
      case "dashboard":
        setIsDashboardModalOpen(true);
        break;
      case "bookmarks":
        setIsSavedQueriesModalOpen(true);
        break;
      case "health":
        setIsSystemHealthModalOpen(true);
        break;
      case "schedules":
        setIsScheduleModalOpen(true);
        break;
      case "audit":
        setIsAuditLogModalOpen(true);
        break;
      case "connect":
        setIsDbModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Web Speech API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningVoice(true);
      toast.info("Listening for voice query (Speak now)...");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuestionInput(transcript);
      toast.success(`Voice captured: "${transcript}"`);
      setIsListeningVoice(false);
    };

    recognition.onerror = () => {
      toast.error("Voice input error or timeout.");
      setIsListeningVoice(false);
    };

    recognition.onend = () => {
      setIsListeningVoice(false);
    };

    recognition.start();
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === "input" || targetTag === "textarea" || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setIsKeyboardModalOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsDashboardModalOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsSchemaModalOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSavedQueriesModalOpen((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setIsSystemHealthModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scrollToExistingOrSend = (text: string) => {
    if (!text.trim() || loading) return;
    const cleanText = text.trim();
    const existingMsg = messages.find(
      (m) => m.role === "user" && m.content?.trim().toLowerCase() === cleanText.toLowerCase()
    );

    if (existingMsg) {
      const el = document.getElementById(`msg-${existingMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        toast.info("Redirected to existing query in workspace");
        setQuestionInput("");
        return;
      }
    }

    setQuestionInput("");
    sendMessage(cleanText);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scrollToExistingOrSend(questionInput);
  };

  const handleSampleClick = (sampleText: string) => {
    scrollToExistingOrSend(sampleText);
  };

  const handleSelectHistoryItem = (item: QueryResponseData) => {
    setIsQueryHistoryModalOpen(false);

    // 1. Check if question exists in current active chat session messages
    const existingMsg = messages.find(
      (m) => m.role === "user" && m.content?.trim().toLowerCase() === item.question.trim().toLowerCase()
    );
    if (existingMsg) {
      const el = document.getElementById(`msg-${existingMsg.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        toast.info("Redirected to existing query in workspace");
        return;
      }
    }

    // 2. Check if question exists in another chat session
    const targetSession = sessions.find((s) =>
      s.messages.some(
        (m) => m.role === "user" && m.content?.trim().toLowerCase() === item.question.trim().toLowerCase()
      )
    );
    if (targetSession) {
      switchSession(targetSession.id);
      toast.info(`Switched to workspace: "${targetSession.title}"`);
      setTimeout(() => {
        const match = targetSession.messages.find(
          (m) => m.role === "user" && m.content?.trim().toLowerCase() === item.question.trim().toLowerCase()
        );
        if (match) {
          const el = document.getElementById(`msg-${match.id}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return;
    }

    // 3. Fallback: load item into workspace
    loadHistoryItem(item);
  };

  const startEditingSession = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditingTitle(currentTitle);
  };

  const saveEditingSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    renameSession(id, editingTitle);
    setEditingSessionId(null);
  };

  const handleSignOut = async () => {
    localStorage.removeItem("sqlguard_user_session");
    if ((window as any).Clerk) {
      try {
        await (window as any).Clerk.signOut();
      } catch (err) {
        console.warn("Clerk signout notice:", err);
      }
    }
    toast.info("Logged out of SQLGuard Workspace");
    window.location.href = "/";
  };

  const getDbDisplayName = () => {
    if (!dbConfig) return "Demo SQLite";
    if (dbConfig.preset_name) return dbConfig.preset_name;
    if (dbConfig.dbname) return `PostgreSQL: ${dbConfig.dbname}`;
    if (dbConfig.connection_url) {
      try {
        const urlObj = new URL(dbConfig.connection_url);
        return `Live DB: ${urlObj.hostname}`;
      } catch {
        return "Live DB Connection";
      }
    }
    if (dbConfig.sqlite_path) {
      const parts = dbConfig.sqlite_path.split(/[/\\]/);
      return `SQLite: ${parts[parts.length - 1]}`;
    }
    return "Custom Database";
  };

  return (
    <div className="h-screen h-[100dvh] w-full max-w-full flex flex-col overflow-hidden fixed inset-0 bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-[#10B981]/20 selection:text-[#0F172A]">
      <Toaster position="top-right" theme="light" richColors />

      {/* Primary Top Header Navigation (Fixed Height h-14) */}
      <header className={`sticky top-0 h-14 border-b border-[#E2E8F0] bg-[#FFFFFF] z-40 shrink-0 px-3 sm:px-4 flex items-center justify-between shadow-xs transition-all duration-300 ${
        isAnyModalOpen ? "filter blur-xs opacity-50 pointer-events-none" : "filter-none opacity-100"
      }`}>
        {/* Left Branding & Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#047857] rounded-xl border border-[#E2E8F0] hover:border-[#10B981]/50 cursor-pointer transition-all shrink-0 shadow-xs group"
            title={isSidebarOpen ? "Collapse Analytics Sidebar" : "Expand Analytics Sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronsLeft className="w-5 h-5 text-[#10B981] group-hover:text-[#059669] transition-colors" />
            ) : (
              <Menu className="w-5 h-5 text-[#10B981] group-hover:text-[#059669] transition-colors" />
            )}
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <SQLGuard3DLogo size={34} />
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate flex items-center font-sans select-none">
                <span className="text-[#0F172A] font-extrabold tracking-tight">SQL</span>
                <span className="bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] bg-clip-text text-transparent font-black tracking-wider drop-shadow-xs">
                  Guard
                </span>
                <span className="ml-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#047857] bg-[#ECFDF5] border border-[#10B981]/30 rounded-md shadow-2xs hidden xs:inline-block">
                  AI 2.0
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Right Status Controls & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Connected Database Pill / CTA */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setIsDbModalOpen(true)}
              className={`flex items-center gap-1.5 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                dbConfig
                  ? "bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5] border border-[#10B981]/30"
                  : "bg-[#F0FDF4] text-[#047857] hover:bg-[#DCFCE7] border border-[#10B981]/40 shadow-2xs"
              }`}
              title={
                dbConfig
                  ? "Connected Custom Database (Click to Change)"
                  : "Built-in Demo E-Commerce Database Active (Click to Connect PostgreSQL or Custom DB)"
              }
            >
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
              <span className="max-w-[100px] xs:max-w-[140px] sm:max-w-[210px] truncate">
                {dbConfig ? getDbDisplayName() : "Demo DB (Active)"}
              </span>
              {!dbConfig && (
                <span className="ml-1 text-[9px] bg-[#10B981] text-white px-1.5 py-0.2 rounded font-bold uppercase tracking-wider hidden sm:inline-block">
                  + Connect DB
                </span>
              )}
            </button>

            {dbConfig && (
              <button
                onClick={disconnectDb}
                title="Disconnect Custom DB & Reset to Demo"
                className="text-[#047857] hover:text-rose-600 p-0.5 sm:p-1 cursor-pointer transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* AST Active Security Pill */}
          <button
            onClick={() => setIsAuditLogModalOpen(true)}
            className="hidden sm:flex items-center gap-1 text-xs text-[#047857] bg-[#ECFDF5] hover:bg-[#D1FAE5] px-2.5 py-1 rounded-xl border border-[#10B981]/30 font-medium cursor-pointer transition-all"
            title="View System Observability & AST Security Policy"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>AST Active</span>
          </button>

          {/* User Profile Dropdown - ALWAYS VISIBLE */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[#E2E8F0] shrink-0">
            <UserButton userContext={userContext} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      {/* Secondary Tools Navigation Sub-Bar (Fixed Height h-11) */}
      <nav className={`sticky top-14 h-11 border-b border-[#E2E8F0] bg-[#FFFFFF] backdrop-blur-md z-30 shrink-0 px-3 flex items-center justify-between overflow-x-auto custom-scrollbar shadow-xs gap-2 transition-all duration-300 ${
        isAnyModalOpen ? "filter blur-xs opacity-50 pointer-events-none" : "filter-none opacity-100"
      }`}>
        <div className="flex items-center gap-1.5 shrink-0 min-w-max">
          {/* Query History Popup Button */}
          <button
            onClick={() => setIsQueryHistoryModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#047857] hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#E2E8F0] transition-all cursor-pointer font-medium"
            title="Open Query History & Execution Log"
          >
            <History className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Query History</span>
            {history.length > 0 && (
              <span className="text-[10px] bg-[#ECFDF5] text-[#047857] px-1.5 py-0.2 rounded-full font-bold border border-[#10B981]/30">
                {history.length}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-[#E2E8F0] mx-1" />

          {/* Live Dashboard */}
          <button
            onClick={() => setIsDashboardModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#047857] hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#E2E8F0] transition-all cursor-pointer font-medium relative"
            title="Live Pinned Analytics Dashboard"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Live Dashboard</span>
            {pinnedCards.length > 0 && (
              <span className="text-[10px] bg-[#10B981] text-[#FFFFFF] px-1.5 py-0.2 rounded-full font-bold">
                {pinnedCards.length}
              </span>
            )}
          </button>

          {/* Saved Queries */}
          <button
            onClick={() => setIsSavedQueriesModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#047857] hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer font-medium"
            title="Saved Query Templates & Bookmarks"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Saved Queries</span>
          </button>

          {/* ER Diagram */}
          <button
            onClick={() => setIsErDiagramModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0284C7] hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer font-medium"
            title="Interactive ER Schema Diagram"
          >
            <Network className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>ER Diagram</span>
          </button>

          <div className="h-4 w-px bg-[#E2E8F0] mx-1" />

          {/* System Health */}
          <button
            onClick={() => setIsSystemHealthModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#047857] hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer font-medium"
            title="System Observability & Latency SLA"
          >
            <Activity className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Health</span>
          </button>

          {/* Schema Explorer */}
          <button
            onClick={() => setIsSchemaModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#047857] hover:text-[#0F172A] px-2.5 py-1 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer font-medium"
            title="Explore Database Schema"
          >
            <TableIcon className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Schema Explorer</span>
          </button>
        </div>
      </nav>

      {/* LIVE DASHBOARD MODAL */}
      {isDashboardModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#0F172A]/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] w-full max-w-6xl h-[88vh] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col space-y-4 text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2 text-[#047857] font-bold text-base">
                <LayoutGrid className="w-5 h-5 text-[#10B981]" />
                <span className="text-[#0F172A] font-bold text-base sm:text-lg">Live Pinned Analytics Dashboard</span>
                <span className="text-xs bg-[#ECFDF5] border border-[#10B981]/30 px-2.5 py-0.5 rounded-full text-[#047857] font-semibold">
                  {pinnedCards.length} Pinned Metrics
                </span>
              </div>
              <button
                onClick={() => setIsDashboardModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              {pinnedCards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3 text-[#047857] py-12">
                  <Pin className="w-10 h-10 text-[#10B981] opacity-70" />
                  <p className="text-xs sm:text-sm font-bold text-[#0F172A]">No pinned analytics cards yet.</p>
                  <p className="text-[11px] text-[#64748B]">Click "Pin" on any query result card to build your executive dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {pinnedCards.map((pinned) => (
                    <div key={pinned.id} className="relative group border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#FFFFFF] shadow-sm hover:shadow-md transition-all">
                      <button
                        onClick={() => unpinCard(pinned.id)}
                        className="absolute right-3 top-3 z-20 px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 text-[10px] font-semibold cursor-pointer transition-colors shadow-2xs"
                        title="Unpin Card"
                      >
                        Unpin Metric
                      </button>
                      <QueryResponseCard data={pinned.data} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AST SECURITY AUDIT LOG MODAL */}
      {isAuditLogModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 text-xs text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2 text-[#047857] font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-[#10B981]" />
                <span>AST Security Guard & System Audit Policy</span>
              </div>
              <button
                onClick={() => setIsAuditLogModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] cursor-pointer p-1 rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5 font-medium">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#64748B]">AST Guard Mode</span>
                  <span className="text-[#047857] font-mono font-bold">Strict Read-Only SELECT</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#64748B]">PII Data Masking</span>
                  <span className="text-[#047857] font-mono font-bold">ACTIVE (SSN, Passwords, Credit Cards)</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#64748B]">Schema Vector RAG</span>
                  <span className="text-[#047857] font-mono font-bold">ChromaDB / Pinecone Hybrid</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#64748B]">LangGraph Self-Correction</span>
                  <span className="text-amber-700 font-mono font-bold">Max 3 Heals / Query</span>
                </div>
              </div>

              <div className="p-3 bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl space-y-1 text-[11px] text-[#047857]">
                <p className="font-bold flex items-center gap-1 text-[#047857]">
                  <Activity className="w-3.5 h-3.5 text-[#10B981]" /> Enforced Security Rules:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[#047857] font-medium">
                  <li>Destructive SQL commands (DROP, DELETE, INSERT, UPDATE, ALTER) hard-stopped before execution.</li>
                  <li>Multi-statement SQL injections automatically rejected.</li>
                  <li>Max row result cap enforced at 1000 rows.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lazy Loaded Connection Manager Modal */}
      <Suspense fallback={null}>
        {isDbModalOpen && (
          <ConnectDbModal
            isOpen={isDbModalOpen}
            onClose={() => setIsDbModalOpen(false)}
            onSave={saveDbConfig}
            currentConfig={dbConfig}
          />
        )}
      </Suspense>

      {/* Lazy Loaded Schema Explorer Modal */}
      <Suspense fallback={null}>
        {isSchemaModalOpen && (
          <SchemaExplorerModal
            isOpen={isSchemaModalOpen}
            onClose={() => setIsSchemaModalOpen(false)}
            dbConfig={dbConfig}
          />
        )}
      </Suspense>

      {/* Main Body (Fixed Height calc(100dvh - 5.5rem) on mobile, 100vh on desktop) */}
      <div className="flex-1 h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-6.25rem)] flex overflow-hidden relative max-w-full overflow-x-hidden">
        {/* Mobile Backdrop Overlay for small screens */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-[#0F172A]/60 z-[90] backdrop-blur-xs transition-opacity"
          />
        )}

        {/* Sidebar Container - Fully Responsive Top-Level Drawer on Mobile (z-[100]), Lower z-index on Desktop (md:z-10) */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`h-full bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col shrink-0 overflow-hidden z-[100] md:z-10 fixed md:relative left-0 top-0 bottom-0 shadow-2xl md:shadow-none w-72 max-w-[85vw] transition-all duration-300 ${
                isAnyModalOpen ? "filter blur-sm opacity-40 pointer-events-none" : "filter-none opacity-100"
              }`}
            >
              {/* Sidebar Header for Mobile */}
              <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2 bg-[#F8FAFC]">
                <button
                  onClick={createNewSession}
                  className="flex-1 py-2 px-3 bg-[#10B981] hover:bg-[#059669] text-[#FFFFFF] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#10B981]/20 truncate"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">New Analytics Chat</span>
                </button>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-1.5 text-[#047857] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-xl cursor-pointer shrink-0 transition-colors"
                  title="Close Sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                <div className="text-[10px] font-bold text-[#047857] px-2 uppercase tracking-wider mb-2">
                  Chat Sessions ({sessions.length})
                </div>

                {sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  const isEditing = editingSessionId === sess.id;

                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        switchSession(sess.id);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isActive
                          ? "bg-[#ECFDF5] border-[#10B981]/50 text-[#047857] font-semibold shadow-xs"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#10B981]" : "text-[#94A3B8]"}`} />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditingSession(sess.id, e as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#FFFFFF] text-[#0F172A] px-1.5 py-0.5 rounded border border-[#10B981] text-xs w-full focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate">{sess.title}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <button
                            onClick={(e) => saveEditingSession(sess.id, e)}
                            className="p-1 hover:text-[#10B981] cursor-pointer"
                            title="Save Title"
                          >
                            <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => startEditingSession(sess.id, sess.title, e)}
                            className="p-1 hover:text-[#10B981] cursor-pointer text-[#94A3B8]"
                            title="Rename Chat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(sess.id);
                          }}
                          className="p-1 hover:text-rose-600 cursor-pointer text-[#94A3B8]"
                          title="Delete Chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Conversation Stream Viewport */}
        <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC] relative z-10">
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 custom-scrollbar relative">
            {messages.length === 0 ? (
              <div className="relative min-h-[70vh] flex flex-col items-center justify-center">
                {/* Ambient 3D Particle Canvas */}
                <Database3DCanvas />

                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto my-auto text-center space-y-5 pt-4 relative z-10 px-2 flex flex-col items-center"
                >
                  <SQLGuard3DLogo size={56} className="mx-auto mb-1" />

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 text-[#047857] text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{activeSession?.title || "Analytics Workspace"}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] max-w-2xl mx-auto leading-snug">
                    Ask questions in natural language and {dbConfig ? getDbDisplayName() : "demo db"} is connected
                  </h2>

                  {/* Sample Prompt Pills */}
                  <div className="pt-2 space-y-3">
                    <span className="text-[11px] text-[#047857] font-semibold tracking-wider uppercase block">
                      Multilingual Sample Queries to try out:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
                      {sampleQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSampleClick(q)}
                          className="text-left text-xs bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#10B981] text-[#0F172A] p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between group shadow-xs"
                        >
                          <span className="line-clamp-2">{q}</span>
                          <Sparkles className="w-3.5 h-3.5 text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.section>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 scroll-mt-20"
                    >
                      {/* USER MESSAGE BUBBLE - Right Aligned */}
                      {msg.role === "user" && (
                        <div className="flex items-start gap-2.5 sm:gap-3 justify-end">
                          <div className="bg-[#FFFFFF] text-[#0F172A] rounded-2xl rounded-tr-none px-4 py-3 max-w-2xl shadow-sm border border-[#E2E8F0] text-xs sm:text-sm leading-relaxed">
                            <div className="flex items-center justify-between gap-4 text-[10px] text-[#047857] font-semibold uppercase tracking-wider mb-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-[#10B981]" /> USER QUESTION
                              </span>
                              <span className="text-[#64748B]">{msg.timestamp}</span>
                            </div>
                            <div className="break-words font-medium">{msg.content}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#ECFDF5] border border-[#10B981]/30 flex items-center justify-center text-[#047857] shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      {/* ASSISTANT RESPONSE CARD - Single Unified Container */}
                      {msg.role === "assistant" && (
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <SQLGuard3DLogo size={28} />

                          <div className="flex-1 min-w-0">
                            {msg.data ? (
                              <QueryResponseCard data={msg.data} />
                            ) : msg.error ? (
                              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-1 shadow-sm leading-relaxed">
                                <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Execution / Connection Error</span>
                                </div>
                                <p className="font-mono break-words">{msg.error}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Animated Skeleton Loading State */}
                {loading && (
                  <div className="flex items-start gap-3">
                    <SQLGuard3DLogo size={28} />
                    <div className="flex-1 min-w-0">
                      <SkeletonLoader />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Ultra-Slick Bottom Input Bar - Sticky at bottom of viewport */}
          <div className="sticky bottom-0 z-40 border-t border-[#E2E8F0] bg-[#FFFFFF] backdrop-blur-xl p-2 sm:p-3 shrink-0 shadow-lg pb-safe">
            <div className="max-w-4xl mx-auto space-y-2">
              {/* Quick Table Suggestion Chips - Placed ABOVE prompt form for mobile visibility */}
              {tableChips && tableChips.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar py-0.5 px-0.5 text-[11px] text-[#047857]">
                  <span className="font-semibold text-[#047857] flex items-center gap-1 text-[10px] uppercase tracking-wider shrink-0 bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#10B981]/20">
                    <TableIcon className="w-3 h-3 text-[#10B981]" /> Table Chips:
                  </span>
                  {tableChips.map((tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => {
                        const queryText = questionInput ? `${questionInput} ${tbl}` : `Show data from ${tbl}`;
                        scrollToExistingOrSend(queryText);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#10B981] text-[#047857] hover:text-[#0F172A] font-mono text-[10px] cursor-pointer transition-all hover:bg-[#F1F5F9] shadow-xs shrink-0 active:scale-95"
                    >
                      +{tbl}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="relative">
                <div className="flex items-center bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#10B981] focus-within:ring-2 focus-within:ring-[#10B981]/20 rounded-2xl p-1.5 sm:p-2 shadow-xs transition-all">
                  <div className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] text-[#047857] text-xs font-semibold shrink-0">
                    <Terminal className="w-3.5 h-3.5 text-[#10B981]" />
                    <span className="hidden sm:inline font-mono">SQL</span>
                  </div>

                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask in English, Gujarati (ગુજરાતી), or Hindi (हिंदी)..."
                    className="w-full bg-transparent border-none px-2 sm:px-4 py-2 text-xs sm:text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none min-w-0"
                  />

                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-1.5 sm:p-2 rounded-xl text-xs transition-colors shrink-0 ${
                      isListeningVoice
                        ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-500/50"
                        : "text-[#047857] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    }`}
                    title="Multilingual Voice Input (English, Gujarati, Hindi)"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !questionInput.trim()}
                    className="bg-[#10B981] hover:bg-[#059669] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] text-white font-bold px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-[#10B981]/20 border border-[#10B981]/30 active:scale-95"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Execute Query</span>
                        <span className="sm:hidden font-semibold">Run</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
      {/* SAVED QUERIES LIBRARY MODAL */}
      <Suspense fallback={null}>
        {isSavedQueriesModalOpen && (
          <SavedQueriesModal
            isOpen={isSavedQueriesModalOpen}
            onClose={() => setIsSavedQueriesModalOpen(false)}
            onRunQuery={(q) => sendMessage(q)}
          />
        )}
      </Suspense>

      {/* ER DIAGRAM MODAL */}
      <Suspense fallback={null}>
        {isErDiagramModalOpen && (
          <ErDiagramModal
            isOpen={isErDiagramModalOpen}
            onClose={() => setIsErDiagramModalOpen(false)}
          />
        )}
      </Suspense>

      {/* SYSTEM HEALTH & OBSERVABILITY METRICS MODAL */}
      <Suspense fallback={null}>
        {isSystemHealthModalOpen && (
          <SystemHealthModal
            isOpen={isSystemHealthModalOpen}
            onClose={() => setIsSystemHealthModalOpen(false)}
          />
        )}
      </Suspense>

      {/* AUTOMATED QUERY SCHEDULER MODAL */}
      <Suspense fallback={null}>
        {isScheduleModalOpen && (
          <QueryScheduleModal
            isOpen={isScheduleModalOpen}
            onClose={() => setIsScheduleModalOpen(false)}
          />
        )}
      </Suspense>

      {/* GLOBAL COMMAND PALETTE (CTRL+K) */}
      <Suspense fallback={null}>
        {isCommandPaletteOpen && (
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onSelectAction={handleCommandSelect}
          />
        )}
      </Suspense>

      {/* SIDE-BY-SIDE QUERY COMPARE & DIFF MODAL */}
      <Suspense fallback={null}>
        {isCompareModalOpen && (
          <QueryCompareModal
            isOpen={isCompareModalOpen}
            onClose={() => setIsCompareModalOpen(false)}
            cardA={history[0] || null}
            cardB={history[1] || null}
          />
        )}
      </Suspense>

      {/* KEYBOARD SHORTCUTS MODAL */}
      <Suspense fallback={null}>
        {isKeyboardModalOpen && (
          <KeyboardShortcutsModal
            isOpen={isKeyboardModalOpen}
            onClose={() => setIsKeyboardModalOpen(false)}
          />
        )}
      </Suspense>

      {/* QUERY HISTORY MODAL POPUP */}
      <Suspense fallback={null}>
        {isQueryHistoryModalOpen && (
          <QueryHistoryModal
            isOpen={isQueryHistoryModalOpen}
            onClose={() => setIsQueryHistoryModalOpen(false)}
            history={history}
            onSelectHistoryItem={(item) => handleSelectHistoryItem(item)}
            onClearHistory={clearHistory}
          />
        )}
      </Suspense>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthGateway>
      {(userContext) => (
        <ChatProvider userContext={userContext}>
          <MainAppContent userContext={userContext} />
        </ChatProvider>
      )}
    </AuthGateway>
  );
};

export default App;
