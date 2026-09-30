import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from '../lib/types';
import { cn } from '../lib/utils';
import { Terminal } from 'lucide-react';

interface LogsPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ logs, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top only when new logs arrive (since they are prepended)
  useEffect(() => {
    if (containerRef.current && logs.length > 0) {
      containerRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }
  }, [logs.length]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute right-8 top-1/2 -translate-y-1/2 w-80 z-40 bg-black/90 backdrop-blur-md border border-white/20 p-5 shadow-[8px_8px_0px_white] pointer-events-auto"
    >
      <h4 className="font-black uppercase italic text-xs text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
        <Terminal size={12} className="text-white/70" />
        <span>Mitigation Logs</span>
        <span className="ml-auto text-[8px] font-mono text-white/30 animate-pulse mr-4">wlan1 // SEC_MONITOR</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={onClear}
            className="text-[8px] font-mono text-white/40 hover:text-white transition-colors uppercase tracking-widest border border-white/10 px-2 py-0.5 bg-white/5 hover:bg-white/10"
          >
            Clear
          </button>
          <span className="animate-pulse text-red-500">REC</span>
        </div>
      </h4>
      <div 
        ref={containerRef}
        className="h-[320px] overflow-y-auto pr-2 space-y-2 font-mono text-[9px] uppercase tracking-wider scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pointer-events-auto"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-2 border-l-2",
                log.level === 'info' ? "border-white/50 text-white/70" :
                log.level === 'warning' ? "border-yellow-500 text-yellow-500 bg-yellow-500/10" :
                log.level === 'critical' ? "border-red-500 text-red-500 bg-red-500/10" :
                "border-purple-500 text-purple-400 bg-purple-500/10"
              )}
            >
              {log.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
