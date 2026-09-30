import React, { useState, useMemo, Suspense, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';


import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Globe } from './components/Globe';
import { NetworkLine } from './components/NetworkLine';
import { DeviceNode } from './components/DeviceNode';
import { ThreatSignal, AttackParticles, PacketFlow } from './components/AttackOverlay';
import { LogsPanel } from './components/LogsPanel';
import { DemoPanel } from './components/DemoPanel';
import {
  Monitor, Shield, X, Globe as GlobeIcon,
  Terminal, Radio
} from 'lucide-react';
import { cn } from './lib/utils';
import { useBackend } from './lib/useBackend';
import { useDemoBackend } from './lib/mockBackend';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

function SceneController({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  useFrame(() => {
    if (!groupRef.current) return;
    const isMobile = window.innerWidth < 768;
    const scale = isMobile ? 0.6 : 0.9;
    groupRef.current.scale.set(scale, scale, scale);
    groupRef.current.position.y = 0;
    
    // Scroll-driven cinematic rotation
    const scrollY = window.scrollY;
    groupRef.current.rotation.x = scrollY * 0.001;
  });
  return null;
}

export default function App() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showNetworkStats, setShowNetworkStats] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (groupRef.current) {
        groupRef.current.visible = entry.isIntersecting;
      }
    });
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) return; // Skip Lenis smooth scroll on mobile to avoid touch scroll lock

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const backend = IS_DEMO ? useDemoBackend() : useBackend();
  const {
    nodes,
    logs,
    protectionEnabled,
    toggleProtection,
    isToggling,
    clearLogs,
    activeAttack,
    triggerExfil,
    stopAttacks,
    isDemoMode,
  } = backend;

  const activeNodeData = useMemo(() =>
    nodes.find(n => n.label === selectedNode),
    [selectedNode, nodes]);

  const attackerNode = useMemo(() => nodes.find(n => n.isUnderAttack), [nodes]);
  const isUnderAttack = !!attackerNode;
  const activeAttackType = attackerNode?.attackType ?? null;

  const maxThreatScore = useMemo(() => {
    if (nodes.length === 0) return 0;
    return Math.max(...nodes.map(n => Math.round((1 - n.trustScore) * 150)));
  }, [nodes]);

  const alertTier = useMemo(() => {
    if (maxThreatScore > 90) return 'critical';
    if (maxThreatScore > 45) return 'warning';
    return 'nominal';
  }, [maxThreatScore]);

  const alertStyles = {
    critical: { border: "border-red-500", text: "text-red-500", bg: "bg-red-500/10", dot: "bg-red-500", shadow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]" },
    warning: { border: "border-amber-500", text: "text-amber-500", bg: "bg-amber-500/10", dot: "bg-amber-500", shadow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]" },
    nominal: {
      border: protectionEnabled ? "border-white/30" : "border-red-500/50",
      text: protectionEnabled ? "text-white/80" : "text-red-500",
      bg: protectionEnabled ? "bg-white/5" : "bg-red-500/5",
      dot: protectionEnabled ? "bg-white" : "bg-red-500",
      shadow: "shadow-none"
    }
  };

  const currentAlert = alertStyles[alertTier];

  return (
    <main className="relative w-full overflow-x-hidden bg-[#020202] text-white font-sans selection:bg-white selection:text-black">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#000_100%)] pointer-events-none -z-10" />

      {/* Hero Section - Static background, normal scroll */}
      <div ref={heroRef} className="relative w-full h-[100dvh] border-b border-white/5 overflow-hidden">
        {/* 3D Scene */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Canvas dpr={[1, 1.5]} style={{ pointerEvents: isMobile ? 'none' : 'auto', touchAction: 'pan-y' }}>
            <SceneController groupRef={groupRef} />
            <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={45} />
            <ambientLight intensity={1} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, 5, -10]} intensity={0.5} color={'#ffffff'} />
            <Suspense fallback={null}>
              <group ref={groupRef}>
                <Globe />
                {attackerNode && <ThreatSignal position={attackerNode.pos} active={isUnderAttack} />}
                {attackerNode && <AttackParticles from={attackerNode.pos} active={isUnderAttack && protectionEnabled} attackType={activeAttackType} />}
                <PacketFlow active={!protectionEnabled} />
                <group>
                  {nodes.map((node) => {
                    const nodeColor = node.isUnderAttack ? '#ff3333' : node.trustScore > 0.7 ? '#ffffff' : node.trustScore > 0.4 ? '#aaaaaa' : '#555555';
                    return (
                      <React.Fragment key={node.id}>
                        <NetworkLine start={node.anchor.clone().multiplyScalar(1.02)} end={node.pos} color={nodeColor} />
                        <DeviceNode position={node.pos} type={node.type} label={node.label} trustScore={node.trustScore} status={node.status} onSelect={setSelectedNode} />
                      </React.Fragment>
                    );
                  })}
                </group>
              </group>
            </Suspense>
            <OrbitControls enableDamping dampingFactor={0.05} enableZoom={false} enablePan={false} touches={{ TWO: THREE.TOUCH.ROTATE }} autoRotate={!selectedNode} autoRotateSpeed={0.3} />
          </Canvas>
        </div>

        {/* HUD Overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Navigation */}
          <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1 z-50">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 bg-white flex items-center justify-center"><GlobeIcon size={18} className="text-black" /></div>
                <div><h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">CIPHER</h1><p className="text-[7px] md:text-[9px] text-gray-500 font-mono tracking-[0.3em] uppercase mt-1">Edge IoT Security Gateway</p></div>
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn("absolute left-1/2 -translate-x-1/2 top-36 md:top-8 px-3 py-1.5 md:px-4 md:py-2 border font-mono text-[8px] md:text-[10px] whitespace-nowrap uppercase tracking-widest flex items-center gap-2 transition-colors duration-500 z-50", currentAlert.border, currentAlert.text, currentAlert.bg, currentAlert.shadow)}>
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", currentAlert.dot)} />
              {isUnderAttack ? (
                <span>{alertTier === 'critical' ? 'CRITICAL' : 'WARNING'} — {activeAttackType?.toUpperCase() || 'ACTIVE THREAT'} DETECTED</span>
              ) : protectionEnabled ? "NETWORK NOMINAL — ALL SECURE" : "WARNING — GATEWAY DISABLED"}
            </div>

            {/* Controls */}
            <div className="flex gap-2 pointer-events-auto z-50 flex-wrap">
              <div className="flex flex-col items-end">
                <button onClick={toggleProtection} disabled={isToggling} className={cn("px-4 py-2 border font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2", protectionEnabled ? "bg-green-500/20 text-green-400 border-green-500 hover:bg-green-500/30" : "bg-red-500/20 text-red-400 border-red-500 hover:bg-red-500/30", isToggling && "opacity-50 cursor-wait")}>
                  <Shield size={13} className={cn(isToggling && "animate-spin")} /> {protectionEnabled ? "GATEWAY: ON" : "GATEWAY: OFF"}
                </button>
                {isToggling && <span className="text-[7px] font-mono text-white/40 mt-1 uppercase tracking-tighter">Updating rules...</span>}
              </div>
              <button onClick={() => setShowNetworkStats(!showNetworkStats)} className={cn("px-4 py-2 border font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2", showNetworkStats ? "bg-white text-black border-white" : "border-white/20 text-white hover:bg-white/10")}><Monitor size={13} /> Devices</button>
              <button onClick={() => setShowLogs(!showLogs)} className={cn("px-4 py-2 border font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2", showLogs ? "bg-white text-black border-white" : "border-white/20 text-white hover:bg-white/10")}><Terminal size={13} /> Logs</button>
            </div>
          </div>

          {/* Panels */}
          <AnimatePresence>
            {showNetworkStats && (
              <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="absolute left-8 top-1/2 -translate-y-1/2 w-64 z-40 space-y-3 pointer-events-auto">
                <div className="bg-black/90 backdrop-blur-md border border-white/20 p-5 shadow-[8px_8px_0px_white]">
                  <h4 className="font-black uppercase italic text-xs mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                    <Radio size={12} className="text-white/70" /> Connected Devices
                    <span className="ml-auto text-[8px] font-mono text-white/30 animate-pulse">wlan0 // Cipher_IoT_Net</span>
                  </h4>
                  <div className="space-y-4">
                    {nodes.map(node => {
                      const score = Math.round((1 - node.trustScore) * 150);
                      const isBlocked = node.status?.includes('Blocked') || score >= 150;
                      const level = score < 50 ? { label: 'GREEN', color: 'text-green-400', bar: 'bg-green-400' } : score < 100 ? { label: 'YELLOW', color: 'text-yellow-400', bar: 'bg-yellow-400' } : score < 150 ? { label: 'RED', color: 'text-red-400', bar: 'bg-red-400' } : { label: 'CRITICAL', color: 'text-red-500', bar: 'bg-red-500' };
                      const statusLabel = isBlocked 
                        ? '⛔ BLOCKED' 
                        : node.isUnderAttack 
                        ? `⚠ ${(node.attackType || 'THREAT').toUpperCase()}` 
                        : level.label;
                      const statusColor = isBlocked ? 'text-red-500 font-black' : level.color;

                      return (
                        <div key={node.id} className="space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{node.label}</span>
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", statusColor)}>{statusLabel}</span>
                          </div>
                          <div className="w-full bg-white/10 h-[2px]"><motion.div animate={{ width: `${Math.min(score / 150, 1) * 100}%` }} transition={{ duration: 0.3 }} className={cn("h-full", isBlocked ? "bg-red-500" : level.bar)} /></div>
                          <div className="flex justify-between text-[8px] font-mono font-bold uppercase tracking-tighter"><span className="opacity-60 text-white/70">{node.ip}</span><span className="opacity-40">Score: {score}/150</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>{showLogs && <LogsPanel logs={logs} onClear={clearLogs} />}</AnimatePresence>

          {/* HUD Accents */}
          <AnimatePresence>
            {isUnderAttack && protectionEnabled && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 140px rgba(255,0,0,0.2)' }} />
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-10 h-10 border-red-500/50`} style={{ borderTopWidth: pos.includes('top') ? 1 : 0, borderBottomWidth: pos.includes('bottom') ? 1 : 0, borderLeftWidth: pos.includes('left') ? 1 : 0, borderRightWidth: pos.includes('right') ? 1 : 0 }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Node Detail */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80 z-20 pointer-events-auto">
                <div className="bg-black/90 backdrop-blur-md border border-white/20 p-8 shadow-[8px_8px_0px_white] relative">
                  <button onClick={() => setSelectedNode(null)} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"><X size={20} strokeWidth={2} /></button>
                  <div className="mb-6">
                    <p className="text-[9px] font-mono text-white/40 mb-1 uppercase tracking-[0.2em]">Hardware Terminal</p>
                    <h3 className="font-black text-xl leading-tight uppercase tracking-tighter text-white italic">{activeNodeData?.label}</h3>
                  </div>
                  <div className="space-y-5">
                    <section>
                      <p className="text-[9px] uppercase font-bold text-white/40 tracking-[0.2em] mb-2">Threat Score</p>
                      <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                        <div className={cn("w-2.5 h-2.5 rounded-full", activeNodeData?.trustScore! > 0.7 ? "bg-white" : "bg-white/30")} />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-white">{`Trust: ${(activeNodeData?.trustScore! * 100).toFixed(0)}%`}</span>
                      </div>
                    </section>
                    <button className="w-full py-3 bg-white text-black font-black text-[10px] uppercase tracking-[0.4em] hover:bg-gray-200 transition-all active:scale-95">Initialize Sync</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom decorators */}
          <div className="absolute bottom-6 left-4 md:bottom-10 md:left-8 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-8 z-40">
            <div className="space-y-1">
              <div className="flex gap-0.5 items-end">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 transition-all duration-300",
                      i < Math.ceil((nodes.reduce((acc, n) => acc + n.trustScore, 0) / nodes.length) * 12)
                        ? "bg-white h-4"
                        : "bg-white/10 h-2"
                    )}
                  />
                ))}
              </div>
              <p className="text-[9px] font-mono text-white/50 uppercase tracking-tighter font-bold">
                Spectral Integrity: {(nodes.reduce((acc, n) => acc + n.trustScore, 0) / nodes.length * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-[9px] text-gray-500 font-mono flex flex-col gap-0.5 uppercase tracking-[0.2em] font-bold">
              <span>Cipher_IoT_Net // 10.42.0.1</span>
              <span className={cn(
                !protectionEnabled || isUnderAttack ? "text-red-500" : "text-white/70"
              )}>
                Gateway: {isUnderAttack ? "BREACH DETECTED" : (protectionEnabled ? "Secure" : "Exposed")}
              </span>
            </div>
          </div>
        </div>

        {/* Demo Attack Panel — only visible in demo/Netlify mode */}
        {isDemoMode && (
          <DemoPanel
            activeAttack={activeAttack}
            triggerExfil={triggerExfil!}
            stopAttacks={stopAttacks!}
            protectionEnabled={protectionEnabled}
          />
        )}
      </div>

      {/* System Intel & Capabilities Section */}
      <section className="relative w-full min-h-[100dvh] bg-[#020202] border-t border-white/5 z-30 flex flex-col justify-center overflow-hidden py-16">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="px-4 md:px-10 max-w-6xl mx-auto w-full space-y-12 md:space-y-16 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-4">
            <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.6em] block">Edge Intelligence Architecture</span>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white">System Core & Capabilities</h2>
            <p className="text-sm text-white/40 leading-relaxed max-w-2xl mx-auto font-medium">A portable edge defender running hostapd and Scapy to detect, score, and mitigate malicious IoT behavior in real-time.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Deep Inspection", desc: "Scapy sniffer extracts pkt_rate and entropy to feed the rule-based scorer." },
              { title: "Threat Scoring", desc: "6-rule engine fires on exfil and floods — escalating response automatically." },
              { title: "Auto-Mitigation", desc: "On threshold breach, the gateway automatically blocks the malicious device at the network level." }
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="p-8 bg-white/[0.02] border border-white/10 space-y-4 hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-white/20 group-hover:bg-white transition-colors" /><h4 className="text-[12px] font-black uppercase italic tracking-widest text-white/90">{item.title}</h4></div>
                <p className="text-[10px] text-white/30 leading-relaxed font-medium uppercase font-mono tracking-tight">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-12 border-t border-white/5">
            {[
              { val: "< 3s", label: "Detection", sub: "Packet to alert" },
              { val: "5", label: "Rules", sub: "Exfil · Flood · Recon" },
              { val: "150+", label: "Threshold", sub: "Auto-mitigation" },
              { val: "500ms", label: "Interval", sub: "Frame capture" },
            ].map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="group">
                <p className="text-4xl font-black italic tracking-tighter text-white mb-1 group-hover:translate-x-1 transition-transform">{m.val}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">{m.label}</p>
                <p className="text-[8px] font-mono text-white/20 uppercase font-medium">{m.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simplified Team Footer */}
      <footer className="bg-[#020202] py-12 px-10 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3">
            <GlobeIcon size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Cipher Edge v1.0.4</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
