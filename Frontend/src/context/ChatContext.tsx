import React, { createContext, useContext, useState, useEffect } from "react";
import type { ChatMessage, ChatSession, DbConfig, QueryResponseData, PinnedCardItem } from "../types";
import { submitAnalyticsQuery } from "../services/api";
import { toast } from "sonner";

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string;
  activeSession: ChatSession | undefined;
  messages: ChatMessage[];
  loading: boolean;
  dbConfig: DbConfig | null;
  history: QueryResponseData[];
  pinnedCards: PinnedCardItem[];
  userId: string;
  userEmail: string;
  userName: string;
  createNewSession: () => string;
  switchSession: (id: string) => void;
  renameSession: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => void;
  sendMessage: (question: string) => Promise<void>;
  clearCurrentSession: () => void;
  clearAllSessions: () => void;
  saveDbConfig: (config: DbConfig) => void;
  disconnectDb: () => void;
  loadHistoryItem: (item: QueryResponseData) => void;
  clearHistory: () => void;
  pinCard: (item: QueryResponseData) => void;
  unpinCard: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const createDefaultSession = (): ChatSession => ({
  id: `session-${Date.now()}`,
  title: "New Analytics Chat",
  createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  messages: [],
});

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  userContext?: { userId: string; userEmail: string; userName: string };
}> = ({ children, userContext }) => {
  const userId = userContext?.userId || "default_user";
  const userEmail = userContext?.userEmail || "engineer@sqlguard.io";
  const userName = userContext?.userName || "Senior AI Engineer";

  const storagePrefix = `qs_user_${userId}`;

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}_sessions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    const defaultSess = createDefaultSession();
    return [defaultSess];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem(`${storagePrefix}_active_session`);
    if (savedId && sessions.some((s) => s.id === savedId)) return savedId;
    return sessions[0]?.id || "";
  });

  const [dbConfig, setDbConfig] = useState<DbConfig | null>(() => {
    const saved = localStorage.getItem(`${storagePrefix}_db_config`);
    return saved ? JSON.parse(saved) : null;
  });

  const [history, setHistory] = useState<QueryResponseData[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}_history`);
    return saved ? JSON.parse(saved) : [];
  });

  const [pinnedCards, setPinnedCards] = useState<PinnedCardItem[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}_pinned_cards`);
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false);

  // Sync state whenever user switches accounts
  useEffect(() => {
    const saved = localStorage.getItem(`${storagePrefix}_sessions`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const savedActive = localStorage.getItem(`${storagePrefix}_active_session`);
          if (savedActive && parsed.some((s: ChatSession) => s.id === savedActive)) {
            setActiveSessionId(savedActive);
          } else {
            setActiveSessionId(parsed[0].id);
          }
        }
      } catch {
        // fallback
      }
    } else {
      const fresh = createDefaultSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    }
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_sessions`, JSON.stringify(sessions));
  }, [sessions, storagePrefix]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(`${storagePrefix}_active_session`, activeSessionId);
    }
  }, [activeSessionId, storagePrefix]);

  useEffect(() => {
    if (dbConfig) {
      localStorage.setItem(`${storagePrefix}_db_config`, JSON.stringify(dbConfig));
    } else {
      localStorage.removeItem(`${storagePrefix}_db_config`);
    }
  }, [dbConfig, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_history`, JSON.stringify(history));
  }, [history, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_pinned_cards`, JSON.stringify(pinnedCards));
  }, [pinnedCards, storagePrefix]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const createNewSession = (): string => {
    if (activeSession && activeSession.messages.length === 0) {
      toast.info("Already in a new empty analytics chat session");
      return activeSession.id;
    }
    const newSession = createDefaultSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    toast.success("Created new chat session");
    return newSession.id;
  };

  const switchSession = (id: string) => {
    setActiveSessionId(id);
  };

  const renameSession = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s))
    );
    toast.success("Renamed chat session");
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh = createDefaultSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
    toast.info("Deleted chat session");
  };

  const clearAllSessions = () => {
    const fresh = createDefaultSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    toast.info("Cleared all chat sessions");
  };

  const pinCard = (item: QueryResponseData) => {
    if (pinnedCards.some((p) => p.data.question === item.question)) {
      toast.info("Card is already pinned to your Live Dashboard.");
      return;
    }
    const newPinned: PinnedCardItem = {
      id: `pinned-${Date.now()}`,
      title: item.question,
      data: item,
      pinnedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setPinnedCards((prev) => [newPinned, ...prev]);
    toast.success("Pinned to Live Dashboard!");
  };

  const unpinCard = (id: string) => {
    setPinnedCards((prev) => prev.filter((p) => p.id !== id));
    toast.info("Unpinned card from Dashboard.");
  };

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    let targetSessionId = activeSessionId;
    let currentSess = sessions.find((s) => s.id === targetSessionId);

    if (!currentSess) {
      const fresh = createDefaultSession();
      setSessions((prev) => [fresh, ...prev]);
      targetSessionId = fresh.id;
      setActiveSessionId(fresh.id);
      currentSess = fresh;
    }

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp,
    };

    const shouldAutoRename = currentSess.title === "New Analytics Chat" || currentSess.messages.length === 0;
    const autoTitle = question.length > 30 ? question.slice(0, 30) + "..." : question;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            title: shouldAutoRename ? autoTitle : s.title,
            updatedAt: timestamp,
            messages: [...s.messages, userMessage],
          };
        }
        return s;
      })
    );

    setLoading(true);

    try {
      const chatHistory = messages
        .filter((m) => m.data?.sql_query)
        .map((m) => ({
          question: m.content || m.data?.question || "",
          sql_query: m.data?.sql_query || "",
        }));

      const res = await submitAnalyticsQuery(question, dbConfig, chatHistory);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        data: res,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        error: res.error_trace,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: timestamp,
              messages: [...s.messages, assistantMessage],
            };
          }
          return s;
        })
      );

      if (res.sql_query && !res.sql_query.startsWith("FORBIDDEN")) {
        setHistory((prev) => {
          const filtered = prev.filter((h) => h.question !== res.question);
          return [res, ...filtered].slice(0, 20);
        });
        toast.success("Query executed successfully!");
      } else if (res.error_trace) {
        if (res.error_trace.includes("SECURITY ERROR") || res.sql_query === "FORBIDDEN") {
          toast.error("Security Violation: Destructive operation blocked!");
        } else {
          toast.error("Execution error detected.");
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err.message || "Failed to process query.";
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        error: errorMessage,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: [...s.messages, assistantMessage],
            };
          }
          return s;
        })
      );
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearCurrentSession = () => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
    );
    toast.info("Cleared current chat messages.");
  };

  const saveDbConfig = (config: DbConfig) => {
    setDbConfig(config);
    const dbNameDisplay =
      config.dbname ||
      config.connection_url?.split("/").pop()?.split("?")[0] ||
      config.sqlite_path?.split("/").pop() ||
      "Custom DB";
    toast.success(`Database configured: ${dbNameDisplay}`);
  };

  const disconnectDb = () => {
    setDbConfig(null);
    toast.info("Disconnected custom database. Reverted to default environment DB.");
  };

  const loadHistoryItem = (item: QueryResponseData) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: item.question,
      timestamp,
    };
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      data: item,
      timestamp,
      error: item.error_trace,
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, userMsg, assistantMsg],
          };
        }
        return s;
      })
    );
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(`${storagePrefix}_history`);
    toast.info("Query history cleared.");
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        activeSession,
        messages,
        loading,
        dbConfig,
        history,
        pinnedCards,
        userId,
        userEmail,
        userName,
        createNewSession,
        switchSession,
        renameSession,
        deleteSession,
        sendMessage,
        clearCurrentSession,
        clearAllSessions,
        saveDbConfig,
        disconnectDb,
        loadHistoryItem,
        clearHistory,
        pinCard,
        unpinCard,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
