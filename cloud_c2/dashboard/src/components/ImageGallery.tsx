import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageFrame } from '../lib/api';

interface ImageGalleryProps {
  frames: ImageFrame[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ frames }) => {
  return (
    <div className="bg-black border border-white/10 shadow-[8px_8px_0px_white]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h3 className="font-black uppercase italic tracking-widest text-sm">Captured Frames</h3>
        <span className="font-mono text-[9px] text-white/40">
          Total: <span className="text-red-400 font-black">{frames.length}</span>
        </span>
      </div>

      {frames.length === 0 ? (
        <div className="p-8 text-center font-mono text-[10px] text-white/20 uppercase tracking-widest">
          No captures yet — start exfil to populate gallery
        </div>
      ) : (
        <div className="flex gap-3 p-4 overflow-x-auto">
          <AnimatePresence initial={false}>
            {frames.map((frame, i) => (
              <motion.div
                key={frame.name}
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className="flex-shrink-0 group relative"
              >
                <div className="w-28 h-20 border border-white/10 overflow-hidden bg-white/5 group-hover:border-red-500/50 transition-colors">
                  <img
                    src={frame.url}
                    alt={frame.name}
                    className="w-full h-full object-cover rotate-180"
                  />
                </div>
                <div className="mt-1 space-y-0.5 font-mono text-[7px] text-white/30">
                  <p>{frame.time.split(',')[1]?.trim() ?? frame.time}</p>
                  <p>{(frame.size / 1024).toFixed(1)} KB</p>
                </div>
                {/* Frame index badge */}
                <div className="absolute top-1 left-1 bg-black/80 px-1 font-mono text-[7px] text-red-400">
                  #{frames.length - i}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
