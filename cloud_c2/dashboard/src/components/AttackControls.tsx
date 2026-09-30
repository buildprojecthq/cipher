import React from 'react';
import { motion } from 'motion/react';
import { Zap, Scan, Waves, Square, Loader, LucideIcon } from 'lucide-react';

export type AttackType = 'exfil' | 'recon' | 'flood' | null;

interface AttackControlsProps {
  activeAttack: AttackType;
  onExfil: () => void;
  onRecon: () => void;
  onFlood: () => void;
  onStop: () => void;
  isLoading: boolean;
}

interface BtnConfig {
  key: AttackType;
  label: string;
  activeLabel: string;
  Icon: LucideIcon;
  onClick: () => void;
}

export const AttackControls: React.FC<AttackControlsProps> = ({
  activeAttack, onExfil, onRecon, onFlood, onStop, isLoading,
}) => {
  const buttons: BtnConfig[] = [
    {
      key: 'exfil',
      label: 'Image Exfil',
      activeLabel: '● EXFILTRATING',
      Icon: Zap,
      onClick: onExfil,
    },
    {
      key: 'recon',
      label: 'Network Recon',
      activeLabel: '● SCANNING',
      Icon: Scan,
      onClick: onRecon,
    },
    {
      key: 'flood',
      label: 'Packet Flood',
      activeLabel: '● FLOODING',
      Icon: Waves,
      onClick: onFlood,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        {buttons.map(btn => {
          const isActive = activeAttack === btn.key;
          const isDisabled = activeAttack !== null || isLoading;
          return (
            <motion.button
              key={btn.key as string}
              whileTap={{ scale: 0.98 }}
              onClick={btn.onClick}
              disabled={isDisabled}
              className={`
                w-full py-3 px-4 font-black uppercase tracking-widest text-[10px]
                flex items-center justify-between transition-all border
                ${isActive 
                  ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[2px_2px_0px_#ef4444]' 
                  : isDisabled 
                    ? 'opacity-20 cursor-not-allowed bg-transparent border-white/5 text-white/40' 
                    : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/[0.05] hover:border-white/20 shadow-[1px_1px_0px_rgba(255,255,255,0.1)]'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {isLoading && isActive ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  <btn.Icon size={12} className={isActive ? 'animate-pulse' : ''} />
                )}
                <span>{isActive ? btn.activeLabel : btn.label}</span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            </motion.button>
          );
        })}

        {/* STOP */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onStop}
          disabled={!activeAttack || isLoading}
          className={`
            w-full py-3 px-4 font-black uppercase tracking-[0.2em] text-[10px]
            flex items-center justify-center gap-3 transition-all border mt-1
            ${!activeAttack || isLoading
              ? 'bg-transparent border-white/5 text-white/10 cursor-not-allowed border-dashed'
              : 'bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-[1px_1px_0px_white]'
            }
          `}
        >
          <Square size={12} />
          ABORT MISSION
        </motion.button>
      </div>
    </div>
  );
};
