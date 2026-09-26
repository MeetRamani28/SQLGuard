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
} from "lucide-react";
import type { DbConfig, SavedDbPreset } from "../types";
import { testDbConnection } from "../services/api";
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
  const [savedPresets, setSavedPresets] = useState<SavedDbPreset[]>(() => {
    const saved = localStorage.getItem("qs_saved_db_connections");
    return saved ? JSON.parse(saved) : [];
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("qs_saved_db_connections", JSON.stringify(savedPresets));
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

    setSavedPresets((prev) => [newPreset, ...prev]);
    setPresetNameInput("");
    toast.success(`Saved connection preset: "${name}"`);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
    toast.info("Deleted database preset.");
  };

  const handleSelectPreset = (preset: SavedDbPreset) => {
    onSave(preset.config);
    toast.success(`Connected to preset: ${preset.name}`);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = getFormPayload();
    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-base">
            <Database className="w-5 h-5" />
            <span>Database Connection Manager</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("url");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "url"
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
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
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
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
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
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
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Presets ({savedPresets.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "presets" ? (
          <div className="space-y-3 text-xs max-h-72 overflow-y-auto custom-scrollbar">
            {savedPresets.length === 0 ? (
              <div className="text-center p-6 text-slate-500 space-y-1">
                <Bookmark className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No saved database presets yet.</p>
                <p className="text-[11px]">Save connections to quickly select them later!</p>
              </div>
            ) : (
              savedPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-3 bg-slate-950 border border-slate-800/80 hover:border-sky-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-sky-300 block text-sm group-hover:text-sky-200">
                      {preset.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block truncate max-w-xs">
                      {preset.config.connection_url ||
                        `${preset.config.host}:${preset.config.port}/${preset.config.dbname}` ||
                        preset.config.sqlite_path}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
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
                <label className="block text-slate-300 font-medium">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder-slate-600 font-mono focus:border-sky-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Tip: For Supabase on IPv4 networks, use the Pooler URL (aws-0-[region].pooler.supabase.com on port 6543/5432).
                </p>
              </div>
            )}

            {activeTab === "postgres" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    Host / Server IP
                  </label>
                  <input
                    type="text"
                    required
                    value={form.host || ""}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="e.g. localhost or db.company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Port</label>
                    <input
                      type="number"
                      required
                      value={form.port || 5432}
                      onChange={(e) =>
                        setForm({ ...form, port: parseInt(e.target.value) || 5432 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      Database Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.dbname || ""}
                      onChange={(e) => setForm({ ...form, dbname: e.target.value })}
                      placeholder="e.g. sales_db"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Username</label>
                    <input
                      type="text"
                      required
                      value={form.user || ""}
                      onChange={(e) => setForm({ ...form, user: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Password</label>
                    <input
                      type="password"
                      required
                      value={form.password || ""}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">SSL Mode</label>
                  <select
                    value={form.sslmode || "prefer"}
                    onChange={(e) => setForm({ ...form, sslmode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:border-sky-500 focus:outline-none"
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
                <label className="block text-slate-300 font-medium">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder-slate-600 font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>
            )}

            {/* Save Preset Input Bar */}
            <div className="pt-2 flex items-center gap-2 border-t border-slate-800/60">
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                placeholder="Preset Name e.g. Supabase Prod DB..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-medium flex items-center gap-1 cursor-pointer transition-colors"
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
                    ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                    : "bg-rose-950/60 border-rose-800/60 text-rose-300"
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{testing ? "Testing..." : "Test Connection"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-lg shadow-sky-600/20"
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
