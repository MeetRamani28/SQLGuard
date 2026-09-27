import React, { useState, useEffect } from "react";
import { Clock, X, Plus, Trash2, Calendar, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ScheduleItem } from "../types";
import { fetchScheduledQueries, createScheduledQuery, deleteScheduledQuery } from "../services/api";
import { toast } from "sonner";

interface QueryScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueryScheduleModal: React.FC<QueryScheduleModalProps> = ({ isOpen, onClose }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [cron, setCron] = useState("0 9 * * *");

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await fetchScheduledQueries();
      setSchedules(data);
    } catch {
      toast.error("Failed to load query schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSchedules();
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !question.trim()) {
      toast.error("Please fill in required fields.");
      return;
    }
    const created = await createScheduledQuery(name, question, cron);
    if (created) {
      setSchedules([created, ...schedules]);
      toast.success("Query scheduled successfully!");
      setName("");
      setQuestion("");
      setShowAdd(false);
    } else {
      toast.error("Failed to schedule query.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await deleteScheduledQuery(id);
    if (ok) {
      setSchedules(schedules.filter((s) => s.id !== id));
      toast.info(`Canceled schedule "${name}"`);
    } else {
      toast.error("Failed to cancel schedule.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400 border border-purple-500/20">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Automated Query Scheduler</h2>
                <p className="text-xs text-slate-400">
                  Configure recurring NL-to-SQL execution alerts & snapshot reports
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="flex items-center space-x-1.5 rounded-lg border border-purple-500/30 bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/30"
              >
                <Plus className="h-4 w-4" />
                <span>{showAdd ? "Cancel" : "New Schedule"}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Schedule Form */}
          {showAdd && (
            <form onSubmit={handleCreate} className="border-b border-slate-800 bg-slate-950 p-5 space-y-4">
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="h-4 w-4" />
                <span>Create Recurring Execution Schedule</span>
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="Schedule Title (e.g. Daily Revenue)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Natural Language Question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  required
                />
                <select
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="0 9 * * *">Daily at 9:00 AM</option>
                  <option value="0 0 * * 1">Every Monday at Midnight</option>
                  <option value="0 */6 * * *">Every 6 Hours</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-purple-500"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          )}

          {/* List of Schedules */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Loading query schedules...
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center space-y-2 text-slate-400">
                <Calendar className="h-10 w-10 text-slate-600" />
                <p>No active scheduled queries found.</p>
              </div>
            ) : (
              schedules.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{item.name}</span>
                      <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                        {item.cron_expression}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{item.question}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
