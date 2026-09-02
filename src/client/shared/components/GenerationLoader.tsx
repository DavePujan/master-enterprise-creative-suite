import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export interface GenerationLoaderProps {
  title: string;
  subtitle?: string;
  icon?: any;
}

export const GenerationLoader: React.FC<GenerationLoaderProps> = ({ 
  title, 
  subtitle, 
  icon: Icon = Sparkles 
}) => (
  <div className="flex flex-col items-center gap-8 py-12">
    <div className="relative">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="w-32 h-32 rounded-full border border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-slate-900 dark:text-white"
        >
          <Icon size={32} />
        </motion.div>
      </div>
      
      {/* Scanning effect */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-slate-900/20 dark:via-white/20 to-transparent absolute top-0 left-0 animate-scan" />
      </div>
    </div>
    
    <div className="space-y-3 text-center max-w-sm">
      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-light text-slate-900 dark:text-white tracking-tight"
      >
        {title}
      </motion.h3>
      {subtitle && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 dark:text-slate-400 text-sm font-light leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}
      
      <div className="flex justify-center gap-1.5 pt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
            className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full"
          />
        ))}
      </div>
    </div>
  </div>
);
