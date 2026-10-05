import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  Check,
  Link,
  Server,
  FileCode,
  Loader2,
  AlertCircle,
  Bookmark,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import type { DbConfig, SavedDbPreset } from "../types";
import { testDbConnection } from "../services/api";
import { useChat } from "../context/ChatContext";
import { toast } from "sonner";

interface ConnectDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DbConfig) => void;
  currentConfig: DbConfig | null;
}

export const ConnectDbModal: React.FC<ConnectDbModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentConfig,
}) => {
  const { savedPresets = [], saveDbPreset, deleteDbPreset } = useChat();

  const [activeTab, setActiveTab] = useState<"url" | "postgres" | "sqlite" | "presets">(
    currentConfig?.connection_url
      ? "url"
      : currentConfig?.sqlite_path
      ? "sqlite"
      : "postgres"
  );

  const [form, setForm] = useState<DbConfig>(
    currentConfig || {
      preset_name: "",
      db_type: "postgres",
      host: "localhost",
      port: 5432,
      dbname: "",
      user: "postgres",
      password: "",
      sslmode: "prefer",
      connection_url: "",
      sqlite_path: "",
    }
  );

  const [presetNameInput, setPresetNameInput] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("qs_saved_db_connections", JSON.stringify(savedPresets));
    } catch {
      // safe fallback
    }
  }, [savedPresets]);

  if (!isOpen) return null;

  const getFormPayload = (): DbConfig => {
    if (activeTab === "url") {
      return {
        preset_name: form.preset_name || "Live URL Database",
        db_type: "url",
        connection_url: form.connection_url,
      };
    }
    if (activeTab === "sqlite") {
      return {
        preset_name: form.preset_name || "SQLite Database",
        db_type: "sqlite",
        sqlite_path: form.sqlite_path,
      };
    }
    return {
      preset_name: form.preset_name || form.dbname || "PostgreSQL Database",
      db_type: "postgres",
      host: form.host,
      port: Number(form.port) || 5432,
      dbname: form.dbname,
      user: form.user,
      password: form.password,
      sslmode: form.sslmode || "prefer",
    };
  };

  const handleTestConnection = async () => {
    const payload = getFormPayload();
    setTesting(true);
    setTestResult(null);

    try {
      const res = await testDbConnection(payload);
      setTestResult({ success: res.success, message: res.message });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection test failed";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSavePreset = () => {
    const payload = getFormPayload();
    const name = presetNameInput.trim() || payload.preset_name || "Saved Database";
    const newPreset: SavedDbPreset = {
      id: `preset-${Date.now()}`,
      name,
      config: { ...payload, preset_name: name },
      createdAt: new Date().toLocaleDateString(),
    };

    if (saveDbPreset) {
      saveDbPreset(newPreset);
    }
    setPresetNameInput("");
    toast.success(`Saved connection preset: "${name}"`);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteDbPreset) {
      deleteDbPreset(id);
    }
    toast.info("Deleted database preset.");
  };

  const handleSelectPreset = (preset: SavedDbPreset) => {
    onSave(preset.config);
    toast.success(`Connected to preset: ${preset.name}`);
    onClose();
  };

  const handleResetToDemo = () => {
    onSave({
      preset_name: "Demo E-Commerce DB",
      db_type: "sqlite",
      sqlite_path: "sqlguard_dev.db",
    });
    toast.success("Switched to Default Demo E-Commerce Database!");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = getFormPayload();
    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] w-full max-w-lg max-h-[92vh] overflow-y-auto custom-scrollbar rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-[#0F172A]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 sm:pb-4 gap-2">
          <div className="flex items-center gap-2 text-[#047857] font-semibold text-sm sm:text-base min-w-0">
            <Database className="w-5 h-5 text-[#10B981] shrink-0" />
            <span className="truncate">Database Connection Manager</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetToDemo}
              className="px-2 sm:px-2.5 py-1 text-xs bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#047857] border border-[#10B981]/30 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset to built-in Demo E-Commerce DB"
            >
              <RotateCcw className="w-3 h-3 text-[#10B981]" />
              <span className="hidden xs:inline">Use Demo DB</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A] cursor-pointer transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto custom-scrollbar bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("url");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "url"
                ? "bg-[#10B981] text-white shadow-xs font-bold"
                : "text-[#047857] hover:text-[#0F172A]"
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Connection URL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("postgres");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "postgres"
                ? "bg-[#10B981] text-white shadow-xs font-bold"
                : "text-[#047857] hover:text-[#0F172A]"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Host</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("sqlite");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "sqlite"
                ? "bg-[#10B981] text-white shadow-xs font-bold"
                : "text-[#047857] hover:text-[#0F172A]"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>SQLite</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("presets");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "presets"
                ? "bg-[#10B981] text-white shadow-xs font-bold"
                : "text-[#047857] hover:text-[#0F172A]"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Presets ({savedPresets.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "presets" ? (
          <div className="space-y-3 text-xs max-h-72 overflow-y-auto custom-scrollbar">
            {savedPresets.length === 0 ? (
              <div className="text-center p-6 text-[#64748B] space-y-1">
                <Bookmark className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <p>No saved database presets yet.</p>
                <p className="text-[11px]">Save connections to quickly select them later!</p>
              </div>
            ) : (
              savedPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#10B981]/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group shadow-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[#047857] block text-sm group-hover:text-[#10B981]">
                      {preset.name}
                    </span>
                    <span className="text-[11px] text-[#64748B] font-mono block truncate max-w-xs">
                      {preset.config.connection_url ||
                        `${preset.config.host}:${preset.config.port}/${preset.config.dbname}` ||
                        preset.config.sqlite_path}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="p-1.5 text-[#94A3B8] hover:text-rose-600 cursor-pointer transition-colors"
                    title="Delete Preset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {activeTab === "url" && (
              <div className="space-y-2">
                <label className="block text-[#047857] font-medium">
                  Live Database Connection String / URL
                </label>
                <input
                  type="text"
                  required
                  value={form.connection_url || ""}
                  onChange={(e) =>
                    setForm({ ...form, connection_url: e.target.value })
                  }
                  placeholder="postgresql://postgres.ref:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-3 text-[#0F172A] placeholder-slate-400 font-mono focus:border-[#10B981] focus:outline-none shadow-xs"
                />
                <p className="text-[11px] text-[#64748B]">
                  Tip: For Supabase on IPv4 networks, use the Pooler URL (aws-0-[region].pooler.supabase.com on port 6543/5432).
                </p>
              </div>
            )}

            {activeTab === "postgres" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[#047857] mb-1 font-medium">
                    Host / Server IP
                  </label>
                  <input
                    type="text"
                    required
                    value={form.host || ""}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="e.g. localhost or db.company.com"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:border-[#10B981] focus:outline-none shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#047857] mb-1 font-medium">Port</label>
                    <input
                      type="number"
                      required
                      value={form.port || 5432}
                      onChange={(e) =>
                        setForm({ ...form, port: parseInt(e.target.value) || 5432 })
                      }
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:border-[#10B981] focus:outline-none shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#047857] mb-1 font-medium">
                      Database Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.dbname || ""}
                      onChange={(e) => setForm({ ...form, dbname: e.target.value })}
                      placeholder="e.g. sales_db"
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:border-[#10B981] focus:outline-none shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#047857] mb-1 font-medium">Username</label>
                    <input
                      type="text"
                      required
                      value={form.user || ""}
                      onChange={(e) => setForm({ ...form, user: e.target.value })}
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:border-[#10B981] focus:outline-none shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#047857] mb-1 font-medium">Password</label>
                    <input
                      type="password"
                      required
                      value={form.password || ""}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:border-[#10B981] focus:outline-none shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#047857] mb-1 font-medium">SSL Mode</label>
                  <select
                    value={form.sslmode || "prefer"}
                    onChange={(e) => setForm({ ...form, sslmode: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2.5 text-[#0F172A] focus:border-[#10B981] focus:outline-none shadow-xs"
                  >
                    <option value="prefer">Prefer (Default)</option>
                    <option value="require">Require (SSL / Cloud DBs)</option>
                    <option value="disable">Disable (Local dev)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "sqlite" && (
              <div className="space-y-2">
                <label className="block text-[#047857] font-medium">
                  SQLite Database File Path
                </label>
                <input
                  type="text"
                  required
                  value={form.sqlite_path || ""}
                  onChange={(e) =>
                    setForm({ ...form, sqlite_path: e.target.value })
                  }
                  placeholder="e.g. F:/Projects/my_data.db or app.db"
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-3 text-[#0F172A] placeholder-slate-400 font-mono focus:border-[#10B981] focus:outline-none shadow-xs"
                />
              </div>
            )}

            {/* Save Preset Input Bar */}
            <div className="pt-2 flex items-center gap-2 border-t border-[#E2E8F0]">
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                placeholder="Preset Name e.g. Supabase Prod DB..."
                className="flex-1 bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg p-2 text-[#0F172A] focus:border-[#10B981] focus:outline-none shadow-xs"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                className="px-3 py-2 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors border border-[#D97706]/30"
                title="Save as preset"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Preset</span>
              </button>
            </div>

            {/* Test Connection Result Status */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? "bg-[#ECFDF5] border-[#10B981]/30 text-[#047857]"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] font-medium rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#10B981]" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-[#10B981]" />
                )}
                <span>{testing ? "Testing..." : "Test Connection"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] rounded-lg cursor-pointer transition-colors border border-[#E2E8F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-md shadow-[#10B981]/20"
                >
                  <Check className="w-4 h-4" /> Save Connection
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
