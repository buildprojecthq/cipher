import React from 'react';
import { motion } from 'motion/react';
import { Zap, StopCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface DemoPanelProps {
  activeAttack: 'exfil' | 'recon' | 'flood' | null | undefined;
  triggerExfil:  () => void;
  stopAttacks:   () => void;
  protectionEnabled: boolean;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({
  activeAttack,
  triggerExfil,
  stopAttacks,
}) => {
  const isAttacking = !!activeAttack;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="fixed bottom-6 right-8 z-50 flex items-center gap-2 pointer-events-auto"
    >
      {!isAttacking ? (
        <button
          onClick={triggerExfil}
          className="flex items-center gap-2 px-4 py-2 border border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/25 font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
        >
          <Zap size={12} />
          Simulate Attack
        </button>
      ) : (
        <button
          onClick={stopAttacks}
          className={cn(
            'flex items-center gap-2 px-4 py-2 border border-white text-white hover:bg-white/10 font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95',
          )}
        >
          <StopCircle size={12} className="animate-pulse text-red-400" />
          Stop Attack
        </button>
      )}
      <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">demo</span>
    </motion.div>
  );
};
