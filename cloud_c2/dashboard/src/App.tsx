import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Terminal, Shield, Cpu, Activity, Zap } from 'lucide-react';
import { triggerAttack, getGallery, getReconResults, getMetrics, getDevices, ImageFrame, ReconDevice } from './lib/api';
import { useLiveFeed } from './lib/useLiveFeed';
import { AttackControls, AttackType } from './components/AttackControls';
import { DeviceStatus } from './components/DeviceStatus';
import { LiveImageFeed } from './components/LiveImageFeed';
import { ReconResults } from './components/ReconResults';
import { FloodMonitor } from './components/FloodMonitor';
import { EventLog, EventLogEntry } from './components/EventLog';

export default function App() {
  const [activeAttack, setActiveAttack] = useState<AttackType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [triggerTime, setTriggerTime] = useState<number | null>(null);
  const [galleryFrames, setGalleryFrames] = useState<ImageFrame[]>([]);
  const [reconDevices, setReconDevices] = useState<ReconDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [floodMetrics, setFloodMetrics] = useState<{ time: string; pktRate: number }[]>([]);
  const [log, setLog] = useState<EventLogEntry[]>([]);
  const [rpiStatus, setRpiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [deviceIp, setDeviceIp] = useState<string>('');
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [gatewayUrl, setGatewayUrl] = useState<string>('');

  const floodInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevFrameCount = useRef(0);

  const { frames: liveFrames, latencyMs, isConnected } = useLiveFeed(triggerTime);

  const allFrames = React.useMemo(() => {
    const seen = new Set(liveFrames.map((f: ImageFrame) => f.name));
    return [...liveFrames, ...galleryFrames.filter(f => !seen.has(f.name))]
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [liveFrames, galleryFrames]);

  const addLog = useCallback((message: string, level: EventLogEntry['level']) => {
    setLog((prev: EventLogEntry[]) => [
      { id: Math.random().toString(36).slice(2), timestamp: new Date().toLocaleTimeString(), message, level },
      ...prev,
    ].slice(0, 80));
  }, []);

  // Boot & Device Status Polling
  useEffect(() => {
    addLog('C2 dashboard online — awaiting commands', 'info');
    getGallery()
      .then(imgs => { setGalleryFrames(imgs); if (imgs.length) addLog(`${imgs.length} cached frames loaded`, 'info'); })
      .catch(() => addLog('Backend unreachable — running offline', 'error'));

    const pollDevices = async () => {
      try {
        const { devices, gatewayUrl: gwUrl } = await getDevices();
        if (gwUrl) {
          setRpiStatus('online');
          setGatewayUrl(gwUrl);
        }
        if (devices && devices.length > 0) {
          const esp = devices.find(d => d.ip.endsWith('.151') || d.ip.endsWith('.10')) || devices[0];
          if (esp) {
            setDeviceIp(esp.ip);
            setIsBlocked(esp.status.includes('Blocked') || esp.threatScore >= 150);
          }
        }
      } catch {
        // silent
      }
    };
    pollDevices();
    const interval = setInterval(pollDevices, 2000);
    return () => clearInterval(interval);
  }, [addLog]);

  // Latency
  useEffect(() => {
    if (latencyMs !== null) addLog(`First frame received — latency: ${latencyMs}ms`, 'received');
  }, [latencyMs, addLog]);

  // Frame counter
  useEffect(() => {
    if (liveFrames.length > prevFrameCount.current && liveFrames.length > 0) {
      addLog(`Frame #${liveFrames.length} — ${(liveFrames[0].size / 1024).toFixed(1)} KB`, 'received');
    }
    prevFrameCount.current = liveFrames.length;
  }, [liveFrames.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAll = useCallback(() => {
    if (floodInterval.current) { clearInterval(floodInterval.current); floodInterval.current = null; }
    if (reconInterval.current) { clearInterval(reconInterval.current); reconInterval.current = null; }
    setIsScanning(false);
    setActiveAttack(null);
    setTriggerTime(null);
  }, []);

  // ── EXFIL ──
  const handleExfil = useCallback(async () => {
    stopAll();
    setIsLoading(true);
    setActiveAttack('exfil');
    setTriggerTime(Date.now());
    addLog('start_exfil → esp32cam', 'command');

    try {
      const res = await triggerAttack('start_exfil', 'esp32cam');
      if (res.error) { addLog(`Error: ${res.error}`, 'error'); setRpiStatus('offline'); }
      else { addLog('ESP32-CAM exfil started', 'received'); setRpiStatus('online'); }
    } catch { addLog('Backend unreachable', 'error'); }
    setIsLoading(false);
  }, [addLog, stopAll]);

  // ── RECON ──
  const handleRecon = useCallback(async () => {
    stopAll();
    setIsLoading(true);
    setActiveAttack('recon');
    setIsScanning(true);
    setReconDevices([]);
    addLog('start_recon → scanning 10.42.0.0/24', 'command');

    try {
      const res = await triggerAttack('start_recon', 'esp32cam');
      if (res.error) { addLog(`Error: ${res.error}`, 'error'); setRpiStatus('offline'); }
      else { setRpiStatus('online'); }
    } catch { addLog('Backend unreachable', 'error'); }

    reconInterval.current = setInterval(async () => {
      const results = await getReconResults().catch(() => []);
      if (results.length > 0) {
        setReconDevices(results);
        if (reconInterval.current) clearInterval(reconInterval.current);
        setIsScanning(false);
        addLog(`${results.length} hosts discovered`, 'received');
      }
    }, 2000);
    setIsLoading(false);
  }, [addLog, stopAll]);

  // ── FLOOD ──
  const handleFlood = useCallback(async () => {
    stopAll();
    setIsLoading(true);
    setActiveAttack('flood');
    setFloodMetrics([]);
    addLog('start_flood → UDP → 10.42.0.1:8080', 'command');

    try {
      const res = await triggerAttack('start_flood', 'esp32cam');
      if (res.error) { addLog(`Error: ${res.error}`, 'error'); setRpiStatus('offline'); }
      else { setRpiStatus('online'); }
    } catch { addLog('Backend unreachable', 'error'); }

    floodInterval.current = setInterval(async () => {
      try {
        const metrics = await getMetrics();
        if (metrics && typeof metrics === 'object') {
          const targetKey = deviceIp && (metrics as any)[deviceIp] ? deviceIp : Object.keys(metrics)[0];
          if (targetKey) {
            const deviceHistory = (metrics as any)[targetKey];
            if (Array.isArray(deviceHistory)) {
              setFloodMetrics(deviceHistory.slice(-30));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      }
    }, 1000);

    setIsLoading(false);
  }, [addLog, stopAll]);

  // ── STOP ──
  const handleStop = useCallback(async () => {
    setIsLoading(true);
    addLog(`stop → ${activeAttack}`, 'command');
    try { await triggerAttack('stop'); addLog('Attack stopped', 'info'); }
    catch { addLog('Stop failed', 'error'); }
    stopAll();
    setIsLoading(false);
  }, [addLog, activeAttack, stopAll]);

  return (
    <main className="min-h-[100dvh] md:h-screen bg-[#020202] text-white font-sans flex flex-col md:overflow-hidden selection:bg-white selection:text-black">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#000_100%)] pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-white/10 px-4 md:px-8 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-shrink-0 backdrop-blur-md bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <Zap size={18} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none italic text-white">SHADOW</h1>
            <p className="text-[9px] text-white/40 font-mono tracking-[0.4em] uppercase mt-0.5">Command &amp; Control Center</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-10 w-full md:w-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 px-4 py-1.5 border border-white/20 bg-white/10">
            <span className={`w-2 h-2 rounded-full ${activeAttack ? 'bg-red-500 animate-pulse' : 'bg-white/40'}`} />
            <span className="text-white/60">SYSTEM STATUS:</span>
            <span className={activeAttack ? 'text-red-400 font-black' : 'text-white/80'}>
              {activeAttack === 'exfil' ? 'ACTIVE_EXFIL' :
               activeAttack === 'recon' ? 'SCANNING_SUBNET' :
               activeAttack === 'flood' ? 'UDP_FLOOD_INIT' :
               'NOMINAL'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 font-mono text-[10px] text-white/40">
            <div className="flex items-center gap-2 md:border-l border-white/10 md:pl-6">
              <Shield size={12} />
              <span className="opacity-40">RPi:</span>
              <span className={rpiStatus === 'online' ? 'text-white font-bold' : rpiStatus === 'offline' ? 'text-red-500 font-bold' : 'text-white/20'}>
                {rpiStatus === 'online' ? 'ONLINE' : rpiStatus === 'offline' ? 'OFFLINE' : '—'}
              </span>
              {gatewayUrl && (
                <span className="text-[8px] text-white/40 hidden lg:inline truncate max-w-[130px]" title={gatewayUrl}>
                  ({gatewayUrl.replace(/^https?:\/\//, '')})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-6">
              <Activity size={12} />
              <span className="opacity-40">LINK:</span>
              <span className={isConnected ? 'text-white font-bold' : 'text-red-500 font-bold'}>
                {isConnected ? 'STABLE' : 'DROPPED'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[340px_1fr_340px] gap-0 md:overflow-hidden">

        {/* Left: Controls */}
        <div className="border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 bg-white/[0.01]">
          <div className="flex flex-col gap-6">
            <DeviceStatus 
              activeAttack={activeAttack} 
              frameCount={allFrames.length} 
              deviceIp={deviceIp}
              isBlocked={isBlocked}
            />
            <AttackControls
              activeAttack={activeAttack}
              onExfil={handleExfil}
              onRecon={handleRecon}
              onFlood={handleFlood}
              onStop={handleStop}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Center: Context panel */}
        <div className="min-h-[400px] md:min-h-0 md:overflow-hidden flex flex-col bg-white/[0.03] p-4 md:p-6">
          {activeAttack === 'exfil' || (!activeAttack && allFrames.length > 0) ? (
            <div className="h-full">
              <LiveImageFeed frames={allFrames} latencyMs={latencyMs} activeAttack={activeAttack} />
            </div>
          ) : activeAttack === 'recon' ? (
            <div className="h-full">
              <ReconResults devices={reconDevices} isScanning={isScanning} />
            </div>
          ) : activeAttack === 'flood' ? (
            <div className="h-full">
              <FloodMonitor isFlooding={true} floodMetrics={floodMetrics} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-white/10">
              <Terminal size={64} strokeWidth={0.5} />
              <p className="font-mono text-[11px] uppercase tracking-[0.6em]">Authorize Connection To Edge Device</p>
            </div>
          )}
        </div>

        {/* Right: Log */}
        <div className="border-t md:border-t-0 md:border-l border-white/10 p-4 md:p-6 md:overflow-hidden bg-white/[0.01]">
          <EventLog entries={log} />
        </div>
      </div>

      {/* Compact Footer */}
      <footer className="bg-black border-t border-white/10 px-4 md:px-8 py-4 md:py-2 flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Cpu size={14} className="text-black" />
            </div>
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-[0.3em] font-bold">IoT Anomaly Detector // C2 Architecture v1.0.4</span>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8 text-[8px] md:text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">
        
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {['Harshith C', 'Yashas R', 'Vijay Kumar', 'Vinay KS'].map((name, i) => (
              <span key={i} className="text-white/60 hover:text-white transition-colors cursor-default border-b border-transparent hover:border-white/20 pb-0.5">{name}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
