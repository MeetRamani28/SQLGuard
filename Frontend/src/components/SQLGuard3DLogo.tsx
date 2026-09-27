import React, { useEffect } from "react";
import { motion } from "framer-motion";

export const SQLGuard3DLogo: React.FC<{ size?: number }> = ({ size = 36 }) => {
  useEffect(() => {
    try {
      let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement("link");
        faviconLink.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(faviconLink);
      }
      faviconLink.type = "image/png";
      faviconLink.href = "/favicon.png";
    } catch {
      // Fallback
    }
  }, []);

  return (
    <motion.div
      whileHover={{ scale: 1.12, rotateY: 15, rotateX: -10 }}
      whileTap={{ scale: 0.95 }}
      className="relative flex items-center justify-center cursor-pointer shrink-0 group"
      style={{ width: size, height: size, perspective: 1000 }}
      title="SQLGuard Neon Ribbon Shield Engine"
    >
      {/* Cyan Neon Glow Halo Effect */}
      <div className="absolute inset-0 bg-sky-400/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl blur-md" />

      {/* 100% Transparent Option 2 Emblem Image */}
      <img
        src="/logo_transparent.png"
        alt="SQLGuard Emblem"
        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.7)] transition-transform duration-300 relative z-10"
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
};
