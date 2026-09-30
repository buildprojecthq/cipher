import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon } from 'lucide-react';

export interface EventLogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'command' | 'received' | 'error';
}

interface EventLogProps {
  entries: EventLogEntry[];
}

const LEVEL_STYLES: Record<EventLogEntry['level'], string> = {
  info: 'border-white/10 text-white/40',
  command: 'border-red-500/30 text-red-400 bg-red-500/5',
  received: 'border-green-500/30 text-green-400 bg-green-500/5',
  error: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5',
};

export const EventLog: React.FC<EventLogProps> = ({ entries }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="relative h-full flex flex-col group">
      {/* Offset Shadow */}
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-white pointer-events-none" />

      {/* Main Container */}
      <div className="relative bg-black border border-white/20 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0 bg-white/5">
          <div className="flex items-center gap-3">
            <TerminalIcon size={14} className="text-white/40" />
            <h3 className="font-black uppercase italic tracking-tighter text-[11px] text-white">COMMAND_LOG</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest font-bold">Live_Feed</span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-5 space-y-2 font-mono text-[9px] uppercase tracking-wide"
        >
          <AnimatePresence initial={false}>
            {entries.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-2 border-l ${LEVEL_STYLES[entry.level]}`}
              >
                <div className="flex justify-between mb-0.5 opacity-40 text-[7px] font-bold">
                  <span>[{entry.timestamp}]</span>
                  <span>{entry.level.toUpperCase()}</span>
                </div>
                <div className="leading-relaxed font-medium">{entry.message}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
