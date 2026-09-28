import React from 'react';
import { motion } from 'framer-motion';

export const SkeletonLoader: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-md space-y-5"
    >
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#E2E8F0] animate-pulse" />
          <div className="h-5 w-48 bg-[#E2E8F0] rounded-md animate-pulse" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-6 w-16 bg-[#E2E8F0] rounded-full animate-pulse" />
          <div className="h-6 w-24 bg-[#E2E8F0] rounded-full animate-pulse" />
        </div>
      </div>

      {/* SQL code block skeleton */}
      <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
        <div className="h-4 w-1/3 bg-[#CBD5E1] rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-[#CBD5E1] rounded animate-pulse" />
      </div>

      {/* Insight bar skeleton */}
      <div className="h-10 bg-[#ECFDF5] border border-[#10B981]/20 rounded-lg p-3 flex items-center space-x-3">
        <div className="w-4 h-4 rounded-full bg-[#10B981]/30 animate-pulse" />
        <div className="h-4 w-3/4 bg-[#CBD5E1] rounded animate-pulse" />
      </div>

      {/* Content grid / Data visual skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="h-28 bg-[#F1F5F9] rounded-xl animate-pulse" />
        <div className="h-28 bg-[#F1F5F9] rounded-xl animate-pulse" />
        <div className="h-28 bg-[#F1F5F9] rounded-xl animate-pulse text-xs text-[#64748B] flex items-center justify-center font-medium">
          Analyzing SQL & Executing RAG...
        </div>
      </div>
    </motion.div>
  );
};
