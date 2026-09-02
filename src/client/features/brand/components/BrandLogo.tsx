import React, { useState, useEffect, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getLogoCandidates(customLogo?: string, brandName?: string): string[] {
  const candidates: string[] = [];

  // 1. Direct custom logo (data URL, blob, remote URL)
  if (customLogo && customLogo.trim()) {
    candidates.push(customLogo.trim());
  }

  // 2. Multi-tier brand logo discovery from brand domain name
  if (brandName && brandName.trim()) {
    const cleanName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isGeneric = !cleanName || cleanName === 'studioai' || cleanName === 'brand' || cleanName === 'untitled';

    if (!isGeneric) {
      const domain = `${cleanName}.com`;
      const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
      const clearbit = `https://logo.clearbit.com/${domain}`;
      const iconHorse = `https://icon.horse/icon/${domain}`;
      const unavatar = `https://unavatar.io/${domain}`;

      if (!candidates.includes(googleFavicon)) candidates.push(googleFavicon);
      if (!candidates.includes(clearbit)) candidates.push(clearbit);
      if (!candidates.includes(iconHorse)) candidates.push(iconHorse);
      if (!candidates.includes(unavatar)) candidates.push(unavatar);
    }
  }

  return candidates;
}

export const BrandLogo = ({ 
  className, 
  collapsed = false, 
  customLogo, 
  brandName = "STUDIO AI",
  noReferrer = true,
  autoColor = false
}: { 
  className?: string, 
  collapsed?: boolean, 
  customLogo?: string, 
  brandName?: string,
  noReferrer?: boolean,
  autoColor?: boolean
}) => {
  const [attemptIndex, setAttemptIndex] = useState(0);
  const candidates = useMemo(() => getLogoCandidates(customLogo, brandName), [customLogo, brandName]);

  useEffect(() => {
    setAttemptIndex(0);
  }, [customLogo, brandName]);

  const currentSrc = candidates[attemptIndex];
  const isExhausted = !currentSrc;

  const handleError = () => {
    setAttemptIndex(prev => prev + 1);
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.9, y: 5 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: "spring" as const,
        stiffness: 300,
        damping: 20,
        duration: 0.6
      }
    },
    hover: { 
      scale: 1.05,
      transition: { 
        duration: 0.2
      }
    }
  };

  if (isExhausted) {
    return (
      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className={cn("flex items-center justify-center", collapsed ? "h-10 w-10" : "gap-3", className)}
      >
        <div className="relative group w-full h-full flex items-center justify-center">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 font-bold text-xl shadow-lg border border-white/10 dark:border-slate-900/10">
            {brandName ? brandName.charAt(0).toUpperCase() : 'S'}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={cn(
        "relative group flex items-center justify-center overflow-hidden transition-all duration-500", 
        collapsed ? "h-10 w-10 rounded-lg" : "h-12 w-12 rounded-xl",
        "bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md",
        className
      )}
    >
      {/* Subtle background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <img 
        src={currentSrc} 
        alt={brandName} 
        onError={handleError}
        className={cn(
          "relative z-10 w-full h-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-110", 
          autoColor ? "brightness-0 dark:invert" : "dark:drop-shadow-none drop-shadow-[0_0_1px_rgba(0,0,0,0.05)]"
        )} 
        {...(noReferrer ? { referrerPolicy: "no-referrer" } : {})}
        crossOrigin="anonymous"
      />
    </motion.div>
  );
};
