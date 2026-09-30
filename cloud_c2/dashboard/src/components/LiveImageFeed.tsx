import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageFrame } from '../lib/api';
import { AttackType } from './AttackControls';
import { Camera } from 'lucide-react';

interface LiveImageFeedProps {
  frames: ImageFrame[];
  latencyMs: number | null;
  activeAttack: AttackType;
}

export const LiveImageFeed: React.FC<LiveImageFeedProps> = ({ frames, latencyMs, activeAttack }) => {
  const [fiveSecCount, setFiveSecCount] = useState(0);
  const latestFrame = frames[0] ?? null;

  useEffect(() => {
    const now = Date.now();
    const count = frames.filter(f => now - f.timestamp < 5000).length;
    setFiveSecCount(count);
  }, [frames]);

  return (
    <div className="relative h-full flex flex-col group">
      {/* Offset Shadow */}
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-white pointer-events-none" />

      {/* Main Container */}
      <div className="relative bg-black border border-white/20 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <Camera size={14} className="text-white/40" />
            <h3 className="font-black uppercase italic tracking-tighter text-[11px] text-white">EXFIL_STREAM</h3>
          </div>
          <div className="flex items-center gap-6 font-mono text-[9px]">
            {latencyMs !== null && (
              <span className="text-white/20 uppercase tracking-widest font-bold">
                LAT: <span className="text-white">{latencyMs}MS</span>
              </span>
            )}
            <span className="text-white/20 uppercase tracking-widest font-bold">
              FPS: <span className="text-white">{(fiveSecCount / 5).toFixed(1)}</span>
            </span>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <span className={`w-1.5 h-1.5 rounded-full ${activeAttack === 'exfil' ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`} />
              <span className={activeAttack === 'exfil' ? 'text-red-400 font-bold' : 'text-white/20'}>
                {activeAttack === 'exfil' ? 'ACTIVE' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Image Container */}
        <div className="relative flex-1 bg-[#050505] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout">
            {latestFrame ? (
              <motion.img
                key={latestFrame.name}
                src={latestFrame.url}
                alt="Telemetry frame"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="w-full h-full object-contain rotate-180"
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 text-white/5"
              >
                <div className="w-16 h-16 border border-white/5 flex items-center justify-center">
                  <Camera size={32} strokeWidth={1} />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.5em] font-bold">Signal Encrypted</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay metadata */}
          {latestFrame && (
            <div className="absolute bottom-6 left-6 right-6 flex justify-between font-mono text-[9px] text-white/40 bg-black/80 backdrop-blur-md px-4 py-2 border border-white/10 shadow-[2px_2px_0px_white]">
              <div className="flex gap-6 font-bold">
                <span>TIMESTAMP: {latestFrame.time}</span>
                <span>SIZE: {(latestFrame.size / 1024).toFixed(1)} KB</span>
              </div>
              <span className="font-bold">FRAME_SEQ: #{frames.length.toString().padStart(4, '0')}</span>
            </div>
          )}

          {/* Corner Accents */}
          <div className="absolute top-6 left-6 w-6 h-6 border-l-2 border-t-2 border-white/10" />
          <div className="absolute top-6 right-6 w-6 h-6 border-r-2 border-t-2 border-white/10" />
          <div className="absolute bottom-6 left-6 w-6 h-6 border-l-2 border-b-2 border-white/10" />
          <div className="absolute bottom-6 right-6 w-6 h-6 border-r-2 border-b-2 border-white/10" />
        </div>
      </div>
    </div>
  );
};
