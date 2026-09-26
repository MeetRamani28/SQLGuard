import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  Database,
  Cpu,
  Sparkles,
  AlertCircle,
  RefreshCw,
  History,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { ChatProvider, useChat } from "./context/ChatContext";
import { QueryResponseCard } from "./components/QueryResponseCard";
import { Database3DCanvas } from "./components/Database3DCanvas";
import { SkeletonLoader } from "./components/SkeletonLoader";

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

const MainAppContent: React.FC = () => {
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#090d16] text-slate-100 font-sans selection:bg-sky-500/30 selection:text-sky-200">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Top Header Navigation (Fixed Height h-16) */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md z-40 shrink-0 px-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 rounded-xl border border-slate-700 cursor-pointer transition-colors"
            title="Toggle Sidebar"
          >
            <History className="w-4 h-4 text-sky-400" />
          </button>

          <div className="p-2 bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-cyan-500/20 border border-sky-500/30 rounded-xl text-sky-400 shadow-inner">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black bg-gradient-to-r from-sky-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                SQLGuard
              </h1>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> Dual-Env Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Dual-Environment Autonomous Text-to-SQL Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Schema Explorer Button */}
          <button
            onClick={() => setIsSchemaModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-sky-300 hover:text-sky-200 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors cursor-pointer font-medium shadow-sm"
            title="Explore Connected Database Schema"
          >
            <TableIcon className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Schema Explorer</span>
          </button>

          {/* Connected Database Status Pill */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setIsDbModalOpen(true)}
              className="flex items-center gap-2 text-xs text-sky-300 hover:text-sky-200 px-3 py-1.5 transition-colors cursor-pointer font-medium"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span className="max-w-[150px] sm:max-w-[210px] truncate">{getDbDisplayName()}</span>
            </button>

            {dbConfig && (
              <button
                onClick={disconnectDb}
                title="Reset to Default Demo DB"
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-sky-300 bg-sky-950/40 px-3 py-1.5 rounded-xl border border-sky-800/40 font-medium">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>EN | ગુજરાતી | हिंदी</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40 font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>AST Guard Active</span>
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
        {/* Sidebar Container */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full bg-slate-900/60 border-r border-slate-800/80 flex flex-col shrink-0 overflow-hidden z-20"
            >
              {/* New Chat Button */}
              <div className="p-3 border-b border-slate-800/80">
                <button
                  onClick={createNewSession}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Analytics Chat</span>
                </button>
              </div>

              {/* Chat Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                <div className="text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wider mb-2">
                  Chat Sessions
                </div>

                {sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  const isEditing = editingSessionId === sess.id;

                  return (
                    <div
                      key={sess.id}
                      onClick={() => switchSession(sess.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isActive
                          ? "bg-sky-950/70 border-sky-500/50 text-sky-200 font-medium shadow-sm"
                          : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-sky-400" : "text-slate-500"}`} />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditingSession(sess.id, e as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-950 text-slate-100 px-1.5 py-0.5 rounded border border-sky-500 text-xs w-full focus:outline-none"
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
                            className="p-1 hover:text-sky-400 cursor-pointer text-slate-500"
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
              <div className="p-3 border-t border-slate-800/80 space-y-2 max-h-48 flex flex-col shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left text-[11px] p-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 truncate cursor-pointer transition-colors"
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
        <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden bg-[#090d16] relative z-10">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar relative">
            {messages.length === 0 ? (
              <div className="relative min-h-[70vh] flex flex-col items-center justify-center">
                {/* Ambient 3D Particle Canvas */}
                <Database3DCanvas />

                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto my-auto text-center space-y-6 pt-6 relative z-10"
                >
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{activeSession?.title || "Analytics Workspace"}</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-100">
                    Ask Questions in Natural Language, Get{" "}
                    <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                      Instant Unified Insights
                    </span>
                  </h2>

                  <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
                    Translates English, Gujarati (ગુજરાતી), and Hindi (हिंदी) mixed queries into read-only SQL, validates AST security rules, and renders dynamic unified visualizations.
                  </p>

                  {/* Sample Prompt Pills */}
                  <div className="pt-4 space-y-3">
                    <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase block">
                      Multilingual Sample Queries to try out:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
                      {SAMPLE_QUESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSampleClick(q)}
                          className="text-left text-xs bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-sky-500/40 text-slate-300 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between group shadow-sm backdrop-blur-sm"
                        >
                          <span className="line-clamp-2">{q}</span>
                          <Sparkles className="w-3.5 h-3.5 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
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
                        <div className="flex items-start gap-3 justify-end">
                          <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-2xl shadow-lg border border-sky-400/20 text-sm leading-relaxed">
                            <div className="flex items-center justify-between gap-4 text-[10px] text-sky-200 font-semibold uppercase tracking-wider mb-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> USER QUESTION
                              </span>
                              <span>{msg.timestamp}</span>
                            </div>
                            <div className="break-words font-medium">{msg.content}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        </div>
                      )}

                      {/* ASSISTANT RESPONSE CARD - Single Unified Container */}
                      {msg.role === "assistant" && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg mt-1">
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg mt-1">
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
          <div className="border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md p-4 shrink-0 shadow-2xl relative z-20">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleFormSubmit} className="relative">
                <div className="flex items-center bg-slate-950 border border-slate-800 focus-within:border-sky-500 rounded-2xl p-2 shadow-2xl transition-all">
                  <Terminal className="w-5 h-5 text-sky-400 ml-3 shrink-0" />
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask any question in English, Gujarati (ગુજરાતી), or Hindi (हिंदी)..."
                    className="w-full bg-transparent border-none px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !questionInput.trim()}
                    className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-all cursor-pointer shrink-0 shadow-lg shadow-sky-600/20"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
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
    <ChatProvider>
      <MainAppContent />
    </ChatProvider>
  );
};

export default App;
