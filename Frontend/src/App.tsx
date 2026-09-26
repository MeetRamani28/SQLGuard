import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  Database,
  Cpu,
  Sparkles,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Trash2,
  User,
  Bot,
  Terminal,
  Plus,
  Edit2,
  Check,
  Globe,
  Table as TableIcon,
  XCircle,
  Layers,
  Menu,
  ChevronsLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { ChatProvider, useChat } from "./context/ChatContext";
import { QueryResponseCard } from "./components/QueryResponseCard";
import { Database3DCanvas } from "./components/Database3DCanvas";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { AuthGateway, UserButton } from "./components/AuthGateway";

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
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
    sendMessage,
    saveDbConfig,
    disconnectDb,
    loadHistoryItem,
    clearHistory,
  } = useChat();

  const [questionInput, setQuestionInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || loading) return;
    const text = questionInput;
    setQuestionInput("");
    sendMessage(text);
  };

  const handleSampleClick = (sampleText: string) => {
    setQuestionInput(sampleText);
    sendMessage(sampleText);
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
    if (!dbConfig) return "Dev SQLite (sqlguard_dev.db)";
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

      {/* Top Header Navigation (Fixed Height h-16) */}
      <header className="h-16 border-b border-[#476072]/60 bg-[#334257]/90 backdrop-blur-md z-40 shrink-0 px-3 sm:px-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Professional Sidebar Toggle Icon */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-[#1E293B] hover:bg-[#548CA8]/20 text-[#548CA8] hover:text-[#EEEEEE] rounded-xl border border-[#476072]/60 hover:border-[#548CA8]/60 cursor-pointer transition-all shrink-0 shadow-sm group"
            title={isSidebarOpen ? "Collapse Analytics Sidebar" : "Expand Analytics Sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronsLeft className="w-4.5 h-4.5 text-[#548CA8] group-hover:text-sky-300 transition-colors" />
            ) : (
              <Menu className="w-4.5 h-4.5 text-[#548CA8] group-hover:text-sky-300 transition-colors" />
            )}
          </button>

          <div className="p-2 bg-gradient-to-tr from-[#548CA8]/30 to-[#476072]/30 border border-[#548CA8]/40 rounded-xl text-[#548CA8] shadow-inner shrink-0 hidden sm:block">
            <Database className="w-5 h-5" />
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-[#EEEEEE] via-sky-200 to-[#548CA8] bg-clip-text text-transparent tracking-tight truncate">
                SQLGuard
              </h1>
              <span className="text-[10px] bg-[#548CA8]/15 text-[#548CA8] border border-[#548CA8]/30 px-2 py-0.5 rounded-full font-semibold hidden md:flex items-center gap-1 shrink-0">
                <Layers className="w-2.5 h-2.5" /> Dual-Env Ready
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden lg:block truncate">
              Enterprise Autonomous Text-to-SQL Engine
            </p>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Schema Explorer Button */}
          <button
            onClick={() => setIsSchemaModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-[#1E293B] hover:bg-[#476072] text-[#548CA8] hover:text-[#EEEEEE] px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#476072]/60 transition-colors cursor-pointer font-medium shadow-sm"
            title="Explore Database Schema"
          >
            <TableIcon className="w-3.5 h-3.5 text-[#548CA8]" />
            <span className="hidden sm:inline">Schema Explorer</span>
          </button>

          {/* Connected Database Pill */}
          <div className="flex items-center gap-1 bg-[#1E293B] border border-[#476072]/60 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setIsDbModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-[#548CA8] hover:text-[#EEEEEE] px-2 sm:px-2.5 py-1 transition-colors cursor-pointer font-medium"
            >
              <Database className="w-3.5 h-3.5 text-[#548CA8]" />
              <span className="max-w-[90px] sm:max-w-[170px] truncate">{getDbDisplayName()}</span>
            </button>

            {dbConfig && (
              <button
                onClick={disconnectDb}
                title="Reset to Default Demo DB"
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#548CA8] bg-[#1E293B] px-3 py-1.5 rounded-xl border border-[#476072]/60 font-medium">
            <Globe className="w-3.5 h-3.5 text-[#548CA8]" />
            <span>EN | ગુજરાતી | हिंदी</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40 font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>AST Active</span>
          </div>

          {/* Custom Cyberpunk User Profile Dropdown */}
          <div className="flex items-center gap-2 pl-1 border-l border-[#476072]/50">
            <UserButton userContext={userContext} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

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

      {/* Main Body (Fixed Height calc(100vh - 4rem)) */}
      <div className="flex-1 h-[calc(100vh-4rem)] flex overflow-hidden relative">
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

              {/* Query History Drawer */}
              <div className="p-3 border-t border-[#476072]/60 space-y-2 max-h-48 flex flex-col shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#548CA8] uppercase tracking-wider">
                    Query History
                  </span>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-slate-500 hover:text-rose-400 text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto space-y-1 custom-scrollbar pr-1 flex-1">
                  {history.slice(0, 5).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        loadHistoryItem(item);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className="w-full text-left text-[11px] p-1.5 rounded-lg bg-[#1E293B]/40 hover:bg-[#1E293B] text-slate-300 hover:text-[#EEEEEE] truncate cursor-pointer transition-colors"
                    >
                      • {item.question}
                    </button>
                  ))}
                </div>
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

                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[#EEEEEE]">
                    Ask Questions in Natural Language, Get{" "}
                    <span className="bg-gradient-to-r from-[#EEEEEE] via-sky-200 to-[#548CA8] bg-clip-text text-transparent">
                      Instant Unified Insights
                    </span>
                  </h2>

                  <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                    Translates English, Gujarati (ગુજરાતી), and Hindi (हिंदी) mixed queries into read-only SQL, validates AST security rules, and renders dynamic unified visualizations.
                  </p>

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
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
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
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#548CA8] to-[#476072] flex items-center justify-center text-white shrink-0 shadow-lg mt-1">
                            <Bot className="w-4 h-4" />
                          </div>

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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#548CA8] to-[#476072] flex items-center justify-center text-white shrink-0 shadow-lg mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SkeletonLoader />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Fixed Bottom Input Bar */}
          <div className="border-t border-[#476072]/60 bg-[#334257]/90 backdrop-blur-md p-3 sm:p-4 shrink-0 shadow-2xl relative z-20">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleFormSubmit} className="relative">
                <div className="flex items-center bg-[#1E293B] border border-[#476072]/80 focus-within:border-[#548CA8] rounded-2xl p-1.5 sm:p-2 shadow-2xl transition-all">
                  <Terminal className="w-5 h-5 text-[#548CA8] ml-2.5 shrink-0" />
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask any question in English, Gujarati (ગુજરાતી), or Hindi (हिंदी)..."
                    className="w-full bg-transparent border-none px-3 sm:px-4 py-2 text-xs sm:text-sm text-[#EEEEEE] placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !questionInput.trim()}
                    className="bg-[#548CA8] hover:bg-[#476072] disabled:bg-[#1E293B] disabled:text-slate-600 text-[#EEEEEE] font-semibold px-4 sm:px-5 py-2.5 rounded-xl flex items-center gap-1.5 text-xs transition-all cursor-pointer shrink-0 shadow-lg shadow-[#548CA8]/20"
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
            </div>
          </div>
        </main>
      </div>
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
