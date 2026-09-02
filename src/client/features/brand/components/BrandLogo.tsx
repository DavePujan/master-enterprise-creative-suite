import React, { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BrandLogoProps {
  className?: string;
  collapsed?: boolean;
  customLogo?: string;
  brandName?: string;
  noReferrer?: boolean;
  autoColor?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className, 
  collapsed = false, 
  customLogo, 
  brandName = "STUDIO AI",
  noReferrer = true,
  autoColor = false
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [customLogo, brandName]);

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

  const hasLogo = Boolean(customLogo && customLogo.trim() && !imgError);

  if (!hasLogo) {
    return (
      <motion.div 
        variants={containerVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        className={cn("flex items-center justify-center", collapsed ? "h-10 w-10" : "gap-3", className)}
      >
        <div className="relative group w-full h-full flex items-center justify-center">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
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
        src={customLogo} 
        alt={brandName} 
        onError={() => setImgError(true)}
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
