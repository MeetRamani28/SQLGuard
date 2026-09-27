import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  Database,
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
import { SavedQueriesModal } from "./components/SavedQueriesModal";
import { ErDiagramModal } from "./components/ErDiagramModal";
import { SystemHealthModal } from "./components/SystemHealthModal";
import { QueryScheduleModal } from "./components/QueryScheduleModal";
import { CommandPaletteModal } from "./components/CommandPaletteModal";
import { QueryCompareModal } from "./components/QueryCompareModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { QueryHistoryModal } from "./components/QueryHistoryModal";
import type { QueryResponseData } from "./types";

// Code splitting with React.lazy
const ConnectDbModal = lazy(() =>
  import("./components/ConnectDbModal").then((m) => ({
    default: m.ConnectDbModal,
  }))
);

const SchemaExplorerModal = lazy(() =>
  import("./components/SchemaExplorerModal").then((m) => ({
    default: m.SchemaExplorerModal,
  }))
);

const SAMPLE_QUESTIONS = [
  "how many data vechana che",
  "Show me total revenue and order count for each product category",
  "ketla users che database ma?",
  "સૌથી વધુ કમાણી કરતી કેટેગરી કઈ છે?",
  "sabse jyada order dene wale top 3 customers kaun hain?",
  "Which products are low in stock (less than 30 units)?",
];

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    <div className="h-screen w-full max-w-full flex flex-col overflow-hidden bg-[#1E293B] text-[#EEEEEE] font-sans selection:bg-[#548CA8]/30 selection:text-[#EEEEEE]">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Primary Top Header Navigation (Fixed Height h-14) */}
      <header className="h-14 border-b border-[#476072]/60 bg-[#334257] z-40 shrink-0 px-3 sm:px-4 flex items-center justify-between shadow-xl">
        {/* Left Branding & Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 bg-[#1E293B] hover:bg-[#548CA8]/20 text-[#548CA8] hover:text-[#EEEEEE] rounded-xl border border-[#476072]/60 hover:border-[#548CA8]/60 cursor-pointer transition-all shrink-0 shadow-sm group"
            title={isSidebarOpen ? "Collapse Analytics Sidebar" : "Expand Analytics Sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronsLeft className="w-5 h-5 text-[#548CA8] group-hover:text-sky-300 transition-colors" />
            ) : (
              <Menu className="w-5 h-5 text-[#548CA8] group-hover:text-sky-300 transition-colors" />
            )}
          </button>

          <SQLGuard3DLogo size={32} />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-[#EEEEEE] via-sky-200 to-[#548CA8] bg-clip-text text-transparent tracking-tight truncate">
              SQLGuard
            </h1>
          </div>
        </div>

        {/* Right Status Controls & User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Connected Database Pill / CTA */}
          <div className="flex items-center gap-1 bg-[#1E293B] border border-[#476072]/60 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setIsDbModalOpen(true)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                dbConfig
                  ? "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-700/50"
                  : "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 border border-sky-400/50 shadow-sm"
              }`}
              title={dbConfig ? "Connected Database (Click to Change)" : "Click to Connect PostgreSQL or Custom Database"}
            >
              {dbConfig ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              ) : (
                <Database className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              )}
              <span className="max-w-[130px] sm:max-w-[210px] truncate">
                {dbConfig ? getDbDisplayName() : "+ Connect Database"}
              </span>
            </button>

            {dbConfig && (
              <button
                onClick={disconnectDb}
                title="Disconnect Custom DB & Reset to Demo"
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* AST Active Security Pill */}
          <button
            onClick={() => setIsAuditLogModalOpen(true)}
            className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 px-2.5 py-1 rounded-xl border border-emerald-800/40 font-medium cursor-pointer transition-all"
            title="View System Observability & AST Security Policy"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">AST Active</span>
          </button>

          {/* User Profile Dropdown */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#476072]/50 shrink-0">
            <UserButton userContext={userContext} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      {/* Secondary Tools Navigation Sub-Bar (Fixed Height h-11) */}
      <nav className="h-11 border-b border-[#476072]/50 bg-[#1E293B]/95 backdrop-blur-md z-30 shrink-0 px-3 flex items-center justify-between overflow-x-auto custom-scrollbar shadow-inner gap-2">
        <div className="flex items-center gap-1.5 shrink-0 min-w-max">
          {/* Query History Popup Button */}
          <button
            onClick={() => setIsQueryHistoryModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#334257] hover:bg-[#548CA8]/20 text-[#548CA8] hover:text-[#EEEEEE] px-2.5 py-1 rounded-lg border border-[#476072]/60 transition-all cursor-pointer font-medium"
            title="Open Query History & Execution Log"
          >
            <History className="w-3.5 h-3.5 text-[#548CA8]" />
            <span>Query History</span>
            {history.length > 0 && (
              <span className="text-[10px] bg-[#548CA8]/30 text-sky-200 px-1.5 py-0.2 rounded-full font-bold border border-[#548CA8]/40">
                {history.length}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-[#476072]/60 mx-1" />

          {/* Live Dashboard */}
          <button
            onClick={() => setIsDashboardModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#334257] hover:bg-[#548CA8]/20 text-[#548CA8] hover:text-[#EEEEEE] px-2.5 py-1 rounded-lg border border-[#476072]/60 transition-all cursor-pointer font-medium relative"
            title="Live Pinned Analytics Dashboard"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#548CA8]" />
            <span>Live Dashboard</span>
            {pinnedCards.length > 0 && (
              <span className="text-[10px] bg-[#548CA8] text-[#EEEEEE] px-1.5 py-0.2 rounded-full font-bold">
                {pinnedCards.length}
              </span>
            )}
          </button>

          {/* Saved Queries */}
          <button
            onClick={() => setIsSavedQueriesModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#334257] hover:bg-indigo-600/20 text-indigo-400 hover:text-[#EEEEEE] px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-colors cursor-pointer font-medium"
            title="Saved Query Templates & Bookmarks"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            <span>Saved Queries</span>
          </button>

          {/* ER Diagram */}
          <button
            onClick={() => setIsErDiagramModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#334257] hover:bg-cyan-600/20 text-cyan-400 hover:text-[#EEEEEE] px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer font-medium"
            title="Interactive ER Schema Diagram"
          >
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>ER Diagram</span>
          </button>

          <div className="h-4 w-px bg-[#476072]/60 mx-1" />

          {/* System Health */}
          <button
            onClick={() => setIsSystemHealthModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#334257] hover:bg-emerald-600/20 text-emerald-400 hover:text-[#EEEEEE] px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-colors cursor-pointer font-medium"
            title="System Observability & Latency SLA"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Health</span>
          </button>

          {/* Schema Explorer */}
          <button
            onClick={() => setIsSchemaModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#334257] hover:bg-[#476072] text-[#548CA8] hover:text-[#EEEEEE] px-2.5 py-1 rounded-lg border border-[#476072]/60 transition-colors cursor-pointer font-medium"
            title="Explore Database Schema"
          >
            <TableIcon className="w-3.5 h-3.5 text-[#548CA8]" />
            <span>Schema Explorer</span>
          </button>
        </div>
      </nav>

      {/* LIVE DASHBOARD MODAL */}
      {isDashboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#213448] border border-[#547792]/60 w-full max-w-6xl h-[88vh] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col space-y-4 text-[#EEEEEE]">
            <div className="flex items-center justify-between border-b border-[#547792]/50 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-base">
                <LayoutGrid className="w-5 h-5 text-sky-400" />
                <span className="text-[#EEEEEE] font-bold">Live Pinned Analytics Dashboard</span>
                <span className="text-xs bg-[#547792]/30 border border-[#547792]/50 px-2.5 py-0.5 rounded-full text-sky-200 font-semibold">
                  {pinnedCards.length} Pinned Metrics
                </span>
              </div>
              <button
                onClick={() => setIsDashboardModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {pinnedCards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-400 py-12">
                  <Pin className="w-10 h-10 text-sky-400 opacity-50" />
                  <p className="text-xs sm:text-sm font-medium">No pinned analytics cards yet.</p>
                  <p className="text-[11px] text-slate-500">Click "Pin" on any query result card to build your executive dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {pinnedCards.map((pinned) => (
                    <div key={pinned.id} className="relative group border border-[#547792]/40 rounded-2xl overflow-hidden bg-[#1E293B]/90 shadow-xl">
                      <button
                        onClick={() => unpinCard(pinned.id)}
                        className="absolute right-3 top-3 z-20 px-2.5 py-1 bg-rose-950/90 text-rose-300 hover:bg-rose-900 rounded-lg border border-rose-800/60 text-[10px] font-semibold cursor-pointer transition-colors shadow-md"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-[#476072] w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 text-xs text-[#EEEEEE]">
            <div className="flex items-center justify-between border-b border-[#476072]/60 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>AST Security Guard & System Audit Policy</span>
              </div>
              <button
                onClick={() => setIsAuditLogModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#0f172a] rounded-xl border border-[#476072]/60 space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#548CA8] font-semibold">AST Guard Mode</span>
                  <span className="text-emerald-400 font-mono font-bold">Strict Read-Only SELECT</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#548CA8] font-semibold">PII Data Masking</span>
                  <span className="text-emerald-400 font-mono font-bold">ACTIVE (SSN, Passwords, Credit Cards)</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#548CA8] font-semibold">Schema Vector RAG</span>
                  <span className="text-sky-300 font-mono font-bold">ChromaDB / Pinecone Hybrid</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#548CA8] font-semibold">LangGraph Self-Correction</span>
                  <span className="text-amber-400 font-mono font-bold">Max 3 Heals / Query</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1 text-[11px] text-emerald-200">
                <p className="font-bold flex items-center gap-1 text-emerald-400">
                  <Activity className="w-3.5 h-3.5" /> Enforced Security Rules:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
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

      {/* Main Body (Fixed Height calc(100vh - 6.25rem)) */}
      <div className="flex-1 h-[calc(100vh-6.25rem)] flex overflow-hidden relative">
        {/* Mobile Backdrop Overlay for small screens */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-950/70 z-20 backdrop-blur-xs"
          />
        )}

        {/* Sidebar Container - Fully Responsive Overlay on Mobile, Fixed Collapsible on Desktop */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full bg-[#334257]/95 md:bg-[#334257]/70 border-r border-[#476072]/60 flex flex-col shrink-0 overflow-hidden z-30 fixed md:relative left-0 top-0 bottom-0 shadow-2xl md:shadow-none"
            >
              {/* Sidebar Header for Mobile */}
              <div className="p-3 border-b border-[#476072]/60 flex items-center justify-between">
                <button
                  onClick={createNewSession}
                  className="flex-1 py-2.5 px-4 bg-[#548CA8] hover:bg-[#476072] text-[#EEEEEE] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#548CA8]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Analytics Chat</span>
                </button>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-2 text-slate-400 hover:text-white ml-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                <div className="text-[10px] font-bold text-[#548CA8] px-2 uppercase tracking-wider mb-2">
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
                          ? "bg-[#1E293B] border-[#548CA8]/70 text-[#EEEEEE] font-medium shadow-md"
                          : "bg-[#1E293B]/40 border-[#476072]/40 text-slate-300 hover:bg-[#1E293B]/80 hover:text-[#EEEEEE]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#548CA8]" : "text-slate-500"}`} />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditingSession(sess.id, e as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1E293B] text-[#EEEEEE] px-1.5 py-0.5 rounded border border-[#548CA8] text-xs w-full focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate">{sess.title}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <button
                            onClick={(e) => saveEditingSession(sess.id, e)}
                            className="p-1 hover:text-emerald-400 cursor-pointer"
                            title="Save Title"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => startEditingSession(sess.id, sess.title, e)}
                            className="p-1 hover:text-[#548CA8] cursor-pointer text-slate-500"
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
                          className="p-1 hover:text-rose-400 cursor-pointer text-slate-500"
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
        <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden bg-[#1E293B] relative z-10">
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 custom-scrollbar relative">
            {messages.length === 0 ? (
              <div className="relative min-h-[70vh] flex flex-col items-center justify-center">
                {/* Ambient 3D Particle Canvas */}
                <Database3DCanvas />

                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto my-auto text-center space-y-6 pt-4 relative z-10 px-2"
                >
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#548CA8]/15 border border-[#548CA8]/30 text-[#548CA8] text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-[#548CA8]" />
                    <span>{activeSession?.title || "Analytics Workspace"}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EEEEEE] max-w-2xl mx-auto leading-snug">
                    Ask questions in natural language and {dbConfig ? getDbDisplayName() : "demo db"} is connected
                  </h2>

                  {/* Sample Prompt Pills */}
                  <div className="pt-2 space-y-3">
                    <span className="text-[11px] text-[#548CA8] font-semibold tracking-wider uppercase block">
                      Multilingual Sample Queries to try out:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
                      {SAMPLE_QUESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSampleClick(q)}
                          className="text-left text-xs bg-[#334257]/80 hover:bg-[#334257] border border-[#476072]/60 hover:border-[#548CA8] text-slate-200 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between group shadow-sm backdrop-blur-sm"
                        >
                          <span className="line-clamp-2">{q}</span>
                          <Sparkles className="w-3.5 h-3.5 text-[#548CA8] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
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
                          <div className="bg-gradient-to-r from-[#334257] to-[#476072] text-[#EEEEEE] rounded-2xl rounded-tr-none px-4 py-3 max-w-2xl shadow-lg border border-[#548CA8]/30 text-xs sm:text-sm leading-relaxed">
                            <div className="flex items-center justify-between gap-4 text-[10px] text-[#548CA8] font-semibold uppercase tracking-wider mb-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> USER QUESTION
                              </span>
                              <span>{msg.timestamp}</span>
                            </div>
                            <div className="break-words font-medium">{msg.content}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#548CA8]/20 border border-[#548CA8]/40 flex items-center justify-center text-[#548CA8] shrink-0">
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
                              <div className="p-4 bg-rose-950/70 border border-rose-800/80 rounded-2xl text-rose-300 text-xs space-y-1 shadow-xl leading-relaxed">
                                <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
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

          {/* Ultra-Slick Glassmorphic Bottom Input Bar */}
          <div className="border-t border-[#476072]/50 bg-[#1E293B]/95 backdrop-blur-xl p-3 sm:p-4 shrink-0 shadow-2xl relative z-20">
            <div className="max-w-4xl mx-auto space-y-2.5">
              <form onSubmit={handleFormSubmit} className="relative">
                <div className="flex items-center bg-[#0f172a]/90 border border-[#548CA8]/40 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/30 rounded-2xl p-1.5 sm:p-2 shadow-2xl transition-all">
                  <div className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-[#1E293B] rounded-xl border border-[#476072]/50 text-sky-400 text-xs font-semibold shrink-0">
                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline font-mono">SQL</span>
                  </div>

                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask any question in English, Gujarati (ગુજરાતી), or Hindi (हिंदी)..."
                    className="w-full bg-transparent border-none px-3 sm:px-4 py-2 text-xs sm:text-sm text-[#EEEEEE] placeholder-slate-400 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2 rounded-xl text-xs transition-colors shrink-0 ${
                      isListeningVoice
                        ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-500/50"
                        : "text-[#548CA8] hover:bg-[#334257] hover:text-white"
                    }`}
                    title="Multilingual Voice Input (English, Gujarati, Hindi)"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !questionInput.trim()}
                    className="bg-[#547792] hover:bg-[#3d5a71] disabled:bg-[#1E293B] disabled:text-slate-600 text-white font-bold px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shrink-0 shadow-lg shadow-[#547792]/25 border border-[#94b4c1]/30 active:scale-95"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Execute Query</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Table Suggestion Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                <span className="font-semibold text-[#94b4c1] flex items-center gap-1 text-[10px] uppercase tracking-wider">
                  <TableIcon className="w-3 h-3 text-[#94b4c1]" /> Table Chips:
                </span>
                {["customers", "orders", "revenue", "products", "categories", "region"].map((tbl) => (
                  <button
                    key={tbl}
                    type="button"
                    onClick={() => {
                      const queryText = questionInput ? `${questionInput} ${tbl}` : `Show data from ${tbl}`;
                      scrollToExistingOrSend(queryText);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-[#1E293B] border border-[#476072]/60 hover:border-sky-400 text-sky-300 hover:text-white font-mono text-[10px] cursor-pointer transition-all hover:bg-[#334257] shadow-sm"
                  >
                    +{tbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* SAVED QUERIES LIBRARY MODAL */}
      <SavedQueriesModal
        isOpen={isSavedQueriesModalOpen}
        onClose={() => setIsSavedQueriesModalOpen(false)}
        onRunQuery={(q) => sendMessage(q)}
      />
      {/* ER DIAGRAM MODAL */}
      <ErDiagramModal
        isOpen={isErDiagramModalOpen}
        onClose={() => setIsErDiagramModalOpen(false)}
      />
      {/* SYSTEM HEALTH & OBSERVABILITY METRICS MODAL */}
      <SystemHealthModal
        isOpen={isSystemHealthModalOpen}
        onClose={() => setIsSystemHealthModalOpen(false)}
      />
      {/* AUTOMATED QUERY SCHEDULER MODAL */}
      <QueryScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
      {/* GLOBAL COMMAND PALETTE (CTRL+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={handleCommandSelect}
      />
      {/* SIDE-BY-SIDE QUERY COMPARE & DIFF MODAL */}
      <QueryCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        cardA={history[0] || null}
        cardB={history[1] || null}
      />
      {/* KEYBOARD SHORTCUTS MODAL */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardModalOpen}
        onClose={() => setIsKeyboardModalOpen(false)}
      />
      {/* QUERY HISTORY MODAL POPUP */}
      <QueryHistoryModal
        isOpen={isQueryHistoryModalOpen}
        onClose={() => setIsQueryHistoryModalOpen(false)}
        history={history}
        onSelectHistoryItem={(item) => handleSelectHistoryItem(item)}
        onClearHistory={clearHistory}
      />
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
