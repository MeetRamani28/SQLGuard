import React from 'react';
import { motion } from 'framer-motion';

export const SkeletonLoader: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="w-full bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-5"
    >
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-5 w-48 bg-slate-800 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-6 w-16 bg-slate-800 rounded-full animate-pulse" />
          <div className="h-6 w-24 bg-slate-800 rounded-full animate-pulse" />
        </div>
      </div>

      {/* SQL code block skeleton */}
      <div className="space-y-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800/40">
        <div className="h-4 w-1/3 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Insight bar skeleton */}
      <div className="h-10 bg-cyan-950/20 border border-cyan-500/10 rounded-lg p-3 flex items-center space-x-3">
        <div className="w-4 h-4 rounded-full bg-cyan-500/20 animate-pulse" />
        <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Content grid / Data visual skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="h-28 bg-slate-800/50 rounded-xl animate-pulse" />
        <div className="h-28 bg-slate-800/50 rounded-xl animate-pulse" />
        <div className="h-28 bg-slate-800/50 rounded-xl animate-pulse text-xs text-slate-500 flex items-center justify-center">
          Analyzing SQL & Executing RAG...
        </div>
      </div>
    </motion.div>
  );
};
