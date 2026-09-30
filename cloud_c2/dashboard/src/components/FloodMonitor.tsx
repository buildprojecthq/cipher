import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { Activity, BarChart3 } from 'lucide-react';

interface FloodMonitorProps {
  isFlooding: boolean;
  floodMetrics: { time: string; pktRate: number }[];
}

export const FloodMonitor: React.FC<FloodMonitorProps> = ({ isFlooding, floodMetrics }) => {
  const peakPkt = Math.max(...floodMetrics.map(m => m.pktRate), 0);

  return (
    <div className="relative h-full flex flex-col group">
      {/* Offset Shadow */}
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-white pointer-events-none" />

      {/* Main Container */}
      <div className="relative bg-black border border-white/20 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <Activity size={14} className="text-white/40" />
            <h3 className="font-black uppercase italic tracking-tighter text-[11px] text-white">TRAFFIC_ANALYSIS</h3>
          </div>
          <div className="flex items-center gap-6 font-mono text-[9px]">
            <span className="text-white/20 uppercase tracking-widest font-bold">
              PEAK: <span className="text-white">{peakPkt}/S</span>
            </span>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <span className={`w-1.5 h-1.5 rounded-full ${isFlooding ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`} />
              <span className={isFlooding ? 'text-red-400 font-bold' : 'text-white/20'}>
                {isFlooding ? 'STRESS_TEST' : 'NOMINAL'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 flex-1 flex flex-col">
          {floodMetrics.length < 2 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/5">
              <BarChart3 size={48} strokeWidth={1} />
              <p className="font-mono text-[10px] uppercase tracking-[0.5em] font-bold">No Telemetry</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={floodMetrics}>
                    <defs>
                      <linearGradient id="colorPkt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', borderRadius: '0px', boxShadow: '2px 2px 0px white' }}
                      itemStyle={{ color: '#fff', padding: '0px' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pktRate"
                      stroke={isFlooding ? "#ef4444" : "#ffffff"}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPkt)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-4 gap-8 mt-10 pt-10 border-t border-white/5 font-mono text-[10px]">
                {[
                  { label: 'INGRESS_RATE', val: `${floodMetrics[floodMetrics.length - 1]?.pktRate ?? 0}/S` },
                  { label: 'PEAK_VELOCITY', val: `${peakPkt}/S` },
                  { label: 'PROTOCOL', val: 'UDP/DGRAM' },
                  { label: 'ENDPOINT_IP', val: '10.42.0.1:8080' },
                ].map(s => (
                  <div key={s.label} className="space-y-2">
                    <p className="text-white/20 uppercase tracking-tighter font-bold">{s.label}</p>
                    <p className="text-white font-black">{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
