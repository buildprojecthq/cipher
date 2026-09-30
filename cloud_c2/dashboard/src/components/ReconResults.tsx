import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReconDevice } from '../lib/api';
import { Scan, Cpu, Shield, HelpCircle, Server, Globe } from 'lucide-react';

interface ReconResultsProps {
  devices: ReconDevice[];
  isScanning: boolean;
}

const DEVICE_ICON: Record<string, React.ReactNode> = {
  'Raspberry Pi': <Server size={14} className="text-red-400" />,
  'ESP32': <Cpu size={14} className="text-cyan-400" />,
  'Smart Camera': <Shield size={14} className="text-yellow-400" />,
  'Router': <Globe size={14} className="text-white/60" />,
  'Unknown': <HelpCircle size={14} className="text-white/20" />,
};

export const ReconResults: React.FC<ReconResultsProps> = ({ devices, isScanning }) => {
  return (
    <div className="relative h-full flex flex-col group">
      {/* Offset Shadow */}
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-white pointer-events-none" />

      {/* Main Container */}
      <div className="relative bg-black border border-white/20 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0 bg-white/5">
          <div className="flex items-center gap-3">
            <Scan size={14} className={`text-white/40 ${isScanning ? 'animate-spin' : ''}`} />
            <h3 className="font-black uppercase italic tracking-tighter text-[11px] text-white">NETWORK_TOPOLOGY</h3>
          </div>
          <div className="flex items-center gap-6 font-mono text-[9px]">
            <span className="text-white/20 uppercase tracking-widest font-bold">SUBNET: 10.42.0.0/24</span>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              {isScanning ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 font-bold">SCANNING</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <span className="text-white/30 font-bold">{devices.length} NODES</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {devices.length === 0 && !isScanning ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-white/5">
              <Scan size={48} strokeWidth={1} />
              <p className="font-mono text-[10px] uppercase tracking-[0.5em] font-bold">Topology Unknown</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {devices.map((d, i) => (
                  <motion.div
                    key={d.ip}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Left: device info */}
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-none border border-white/5 bg-white/5 flex items-center justify-center shadow-[1px_1px_0px_white]">
                        {DEVICE_ICON[d.deviceGuess] ?? DEVICE_ICON['Unknown']}
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-white/90">
                          {d.deviceGuess}
                          {d.hostname && <span className="font-mono font-normal text-white/20 ml-2">[{d.hostname}]</span>}
                        </p>
                        <p className="font-mono text-[9px] text-white/40 tracking-widest">{d.ip}</p>
                      </div>
                    </div>

                    {/* Right: ports */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        {d.openPorts.length > 0 ? (
                          d.openPorts.map(p => (
                            <span
                              key={p}
                              className="px-2 py-1 border border-white/5 bg-white/5 text-white/60 font-mono text-[9px] font-bold"
                            >
                              :{p}
                            </span>
                          ))
                        ) : (
                          <span className="font-mono text-[9px] text-white/10 uppercase tracking-tighter">FW_RESTRICTED</span>
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-white/10 border-l border-white/5 pl-4 font-bold">{d.discoveredAt}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Scanning indicator row */}
              {isScanning && (
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="px-5 py-4 font-mono text-[9px] text-cyan-400/40 flex items-center gap-3 bg-cyan-400/5"
                >
                  <div className="flex gap-1.5">
                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                  PROBING_SEQUENCE_ACTIVE: PORTS 22, 80, 443, 554, 8080...
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
