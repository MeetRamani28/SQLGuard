import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { ChatMessage, ChatSession, DbConfig, QueryResponseData, PinnedCardItem, TableSchemaInfo } from "../types";
import { submitAnalyticsQuery, syncUserState, fetchUserSyncState, pingBackendKeepAlive, fetchDatabaseSchema } from "../services/api";
import { toast } from "sonner";

const DEFAULT_TABLE_CHIPS = ["customers", "orders", "revenue", "products", "categories", "region"];

const DEFAULT_SAMPLE_QUESTIONS = [
  "how many data vechana che",
  "Show me total revenue and order count for each product category",
  "ketla users che database ma?",
  "સૌથી વધુ કમાણી કરતી કેટેગરી કઈ છે?",
  "sabse jyada order dene wale top 3 customers kaun hain?",
  "Which products are low in stock (less than 30 units)?",
];

const generateDynamicSampleQueries = (tables: TableSchemaInfo[]): string[] => {
  if (!tables || tables.length === 0) {
    return DEFAULT_SAMPLE_QUESTIONS;
  }

  const queries: string[] = [];
  const tableNames = tables.map((t) => t.table_name);

  const t0 = tableNames[0];
  const t1 = tableNames[1];
  const t2 = tableNames[2];
  const t3 = tableNames[3];

  if (t0) {
    queries.push(`Show top 10 records from ${t0} table`);
    queries.push(`${t0} table ma total ketla records che?`);
  }

  if (t1) {
    queries.push(`List all details from ${t1}`);
    queries.push(`${t1} table me kitni total entries hain?`);
  } else if (tables[0]?.columns?.length > 1) {
    const colName = tables[0].columns[1].name;
    queries.push(`Show ${colName} details from ${t0}`);
    queries.push(`${t0} table me latest entries dikhao`);
  }

  if (t2) {
    queries.push(`સૌથી વધુ વિગતો ${t2} ટેબલમાં કઈ છે?`);
    queries.push(`Show summary count of all records in ${t2}`);
  } else if (t0) {
    queries.push(`Show recent 5 rows in ${t0} table`);
    queries.push(`${t0} ma badha records ni summary aapo`);
  }

  if (t3) {
    queries.push(`Show top 5 items from ${t3}`);
  }

  if (queries.length < 6 && t0) {
    queries.push(`Which records in ${t0} have highest values?`);
  }
  if (queries.length < 6 && (t1 || t0)) {
    const target = t1 || t0;
    queries.push(`${target} table nu data count ketlu che?`);
  }

  return queries.slice(0, 6);
};

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string;
  activeSession: ChatSession | undefined;
  messages: ChatMessage[];
  loading: boolean;
  dbConfig: DbConfig | null;
  history: QueryResponseData[];
  pinnedCards: PinnedCardItem[];
  savedPresets: import("../types").SavedDbPreset[];
  tableChips: string[];
  sampleQuestions: string[];
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
  saveDbPreset: (preset: import("../types").SavedDbPreset) => void;
  deleteDbPreset: (id: string) => void;
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
  const lastSyncTimestamp = useRef<number>(0); // Initialize at 0 to force initial pull from server on mount
  const isSyncingFromRemote = useRef<boolean>(false);

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

  const [savedPresets, setSavedPresets] = useState<import("../types").SavedDbPreset[]>(() => {
    const saved = localStorage.getItem(`${storagePrefix}_saved_presets`) || localStorage.getItem("qs_saved_db_connections");
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false);
  const [tableChips, setTableChips] = useState<string[]>(DEFAULT_TABLE_CHIPS);
  const [sampleQuestions, setSampleQuestions] = useState<string[]>(DEFAULT_SAMPLE_QUESTIONS);

  // Automatically fetch schema tables & generate dynamic sample questions whenever dbConfig changes
  useEffect(() => {
    let isMounted = true;

    if (!dbConfig || dbConfig.sqlite_path === "sqlguard_dev.db") {
      setTableChips(DEFAULT_TABLE_CHIPS);
      setSampleQuestions(DEFAULT_SAMPLE_QUESTIONS);
      return;
    }

    fetchDatabaseSchema(dbConfig)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.tables && res.tables.length > 0) {
          const names = res.tables.map((t) => t.table_name);
          setTableChips(names);
          setSampleQuestions(generateDynamicSampleQueries(res.tables));
        } else {
          setTableChips(DEFAULT_TABLE_CHIPS);
          setSampleQuestions(DEFAULT_SAMPLE_QUESTIONS);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setTableChips(DEFAULT_TABLE_CHIPS);
        setSampleQuestions(DEFAULT_SAMPLE_QUESTIONS);
      });

    return () => {
      isMounted = false;
    };
  }, [dbConfig]);

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

  // Push local updates to backend for real-time cross-device sync
  const pushSyncToRemote = (updatedFields: {
    sessions?: ChatSession[];
    activeSessionId?: string;
    dbConfig?: DbConfig | null;
    history?: QueryResponseData[];
    pinnedCards?: PinnedCardItem[];
    savedPresets?: import("../types").SavedDbPreset[];
  }) => {
    if (isSyncingFromRemote.current || !userEmail) return;
    const now = Date.now();
    lastSyncTimestamp.current = now;
    syncUserState({
      user_email: userEmail,
      db_config: updatedFields.dbConfig !== undefined ? updatedFields.dbConfig : dbConfig,
      sessions: updatedFields.sessions !== undefined ? updatedFields.sessions : sessions,
      active_session_id: updatedFields.activeSessionId !== undefined ? updatedFields.activeSessionId : activeSessionId,
      history: updatedFields.history !== undefined ? updatedFields.history : history,
      pinned_cards: updatedFields.pinnedCards !== undefined ? updatedFields.pinnedCards : pinnedCards,
      saved_presets: updatedFields.savedPresets !== undefined ? updatedFields.savedPresets : savedPresets,
      updated_at: now,
    });
  };

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_sessions`, JSON.stringify(sessions));
    pushSyncToRemote({ sessions });
  }, [sessions, storagePrefix]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(`${storagePrefix}_active_session`, activeSessionId);
      pushSyncToRemote({ activeSessionId });
    }
  }, [activeSessionId, storagePrefix]);

  useEffect(() => {
    if (dbConfig) {
      localStorage.setItem(`${storagePrefix}_db_config`, JSON.stringify(dbConfig));
    } else {
      localStorage.removeItem(`${storagePrefix}_db_config`);
    }
    pushSyncToRemote({ dbConfig });
  }, [dbConfig, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_history`, JSON.stringify(history));
    pushSyncToRemote({ history });
  }, [history, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_pinned_cards`, JSON.stringify(pinnedCards));
    pushSyncToRemote({ pinnedCards });
  }, [pinnedCards, storagePrefix]);

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}_saved_presets`, JSON.stringify(savedPresets));
    localStorage.setItem("qs_saved_db_connections", JSON.stringify(savedPresets));
    pushSyncToRemote({ savedPresets });
  }, [savedPresets, storagePrefix]);

  // Real-time Background Polling Sync Loop across all logged-in devices
  useEffect(() => {
    if (!userEmail) return;

    const checkRemoteSync = async () => {
      if (loading) return; // don't interrupt active query processing
      try {
        const res = await fetchUserSyncState(userEmail);
        if (res.exists && res.state && res.state.updated_at) {
          if (res.state.updated_at > lastSyncTimestamp.current + 500) {
            isSyncingFromRemote.current = true;
            lastSyncTimestamp.current = res.state.updated_at;

            const remote = res.state;
            if (remote.db_config !== undefined) {
              setDbConfig(remote.db_config);
            }
            if (remote.sessions && Array.isArray(remote.sessions) && remote.sessions.length > 0) {
              setSessions(remote.sessions);
            }
            if (remote.active_session_id) {
              setActiveSessionId(remote.active_session_id);
            }
            if (remote.history && Array.isArray(remote.history)) {
              setHistory(remote.history);
            }
            if (remote.pinned_cards && Array.isArray(remote.pinned_cards)) {
              setPinnedCards(remote.pinned_cards);
            }
            if (remote.saved_presets && Array.isArray(remote.saved_presets)) {
              setSavedPresets(remote.saved_presets);
              localStorage.setItem(`${storagePrefix}_saved_presets`, JSON.stringify(remote.saved_presets));
              localStorage.setItem("qs_saved_db_connections", JSON.stringify(remote.saved_presets));
            }

            setTimeout(() => {
              isSyncingFromRemote.current = false;
            }, 300);
          }
        }
      } catch {
        // quiet fallback
      }
    };

    // Initial check on mount & window focus
    checkRemoteSync();
    window.addEventListener("focus", checkRemoteSync);

    // Poll every 1.5 seconds for instant multi-device cross-device sync
    const interval = setInterval(checkRemoteSync, 1500);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkRemoteSync);
    };
  }, [userEmail, loading]);

  // Frontend Keep-Alive Heartbeat for Render Backend (Pings /health every 3 minutes)
  useEffect(() => {
    const pingHeartbeat = () => {
      pingBackendKeepAlive();
    };
    pingHeartbeat();
    const interval = setInterval(pingHeartbeat, 180000); // 3 minutes
    return () => clearInterval(interval);
  }, []);

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

  const saveDbPreset = (preset: import("../types").SavedDbPreset) => {
    setSavedPresets((prev) => {
      const filtered = prev.filter((p) => p.id !== preset.id && p.name !== preset.name);
      const updated = [preset, ...filtered];
      localStorage.setItem(`${storagePrefix}_saved_presets`, JSON.stringify(updated));
      localStorage.setItem("qs_saved_db_connections", JSON.stringify(updated));
      pushSyncToRemote({ savedPresets: updated });
      return updated;
    });
  };

  const deleteDbPreset = (id: string) => {
    setSavedPresets((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem(`${storagePrefix}_saved_presets`, JSON.stringify(updated));
      localStorage.setItem("qs_saved_db_connections", JSON.stringify(updated));
      pushSyncToRemote({ savedPresets: updated });
      return updated;
    });
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
        savedPresets,
        tableChips,
        sampleQuestions,
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
        saveDbPreset,
        deleteDbPreset,
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
