import React from 'react';
import { motion } from 'framer-motion';

export const SkeletonLoader: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="w-full max-w-full overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-md space-y-4 sm:space-y-5"
    >
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 sm:pb-4 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#E2E8F0] animate-pulse shrink-0" />
          <div className="h-4 sm:h-5 w-32 sm:w-48 bg-[#E2E8F0] rounded-md animate-pulse truncate" />
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="h-5 sm:h-6 w-12 sm:w-16 bg-[#E2E8F0] rounded-full animate-pulse" />
          <div className="h-5 sm:h-6 w-16 sm:w-24 bg-[#E2E8F0] rounded-full animate-pulse" />
        </div>
      </div>

      {/* SQL code block skeleton */}
      <div className="space-y-2 bg-[#F8FAFC] p-3 sm:p-4 rounded-xl border border-[#E2E8F0]">
        <div className="h-3.5 sm:h-4 w-2/5 bg-[#CBD5E1] rounded animate-pulse" />
        <div className="h-3.5 sm:h-4 w-4/5 bg-[#CBD5E1] rounded animate-pulse" />
      </div>

      {/* Insight bar skeleton */}
      <div className="h-9 sm:h-10 bg-[#ECFDF5] border border-[#10B981]/20 rounded-lg p-2.5 sm:p-3 flex items-center space-x-2.5 sm:space-x-3">
        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#10B981]/30 animate-pulse shrink-0" />
        <div className="h-3.5 sm:h-4 w-full bg-[#CBD5E1] rounded animate-pulse" />
      </div>

      {/* Content grid / Data visual skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1 sm:pt-2">
        <div className="h-20 sm:h-28 bg-[#F1F5F9] rounded-xl animate-pulse" />
        <div className="h-20 sm:h-28 bg-[#F1F5F9] rounded-xl animate-pulse hidden sm:block" />
        <div className="h-20 sm:h-28 bg-[#F1F5F9] rounded-xl animate-pulse text-xs text-[#64748B] flex items-center justify-center font-medium p-2 text-center">
          Analyzing SQL & Executing RAG...
        </div>
      </div>
    </motion.div>
  );
};
