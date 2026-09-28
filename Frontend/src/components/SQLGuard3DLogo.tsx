import React, { useEffect } from "react";
import { motion } from "framer-motion";

interface SQLGuard3DLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const SQLGuard3DLogo: React.FC<SQLGuard3DLogoProps> = ({
  size = 36,
  className = "",
  animate = true,
}) => {
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
      animate={animate ? { y: [0, -3, 0] } : undefined}
      transition={animate ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : undefined}
      className={`relative flex items-center justify-center cursor-pointer shrink-0 group ${className}`}
      style={{ width: size, height: size, perspective: 1000 }}
      title="SQLGuard 3D Analytics Engine"
    >
      {/* Cyan Neon Glow Halo Effect */}
      <div className="absolute inset-0 bg-[#3ECF8E]/25 opacity-40 group-hover:opacity-100 transition-opacity rounded-xl blur-md" />

      {/* 3D Emblem Image */}
      <img
        src="/logo_transparent.png"
        alt="SQLGuard Emblem"
        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(62,207,142,0.7)] transition-transform duration-300 relative z-10"
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
};
