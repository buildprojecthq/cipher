/**
 * mockBackend.ts — Demo-mode backend (no real RPi needed).
 *
 * Exposes `useDemoBackend()` which matches the BackendHook interface.
 * Attack scenarios are fully simulated with timed log streams and
 * automatic mitigation after a configurable delay.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { DeviceType } from '../components/DeviceNode';
import type { NetworkNode, LogEntry, MetricData, BackendHook } from './types';

// Re-export types for components that import from here directly (e.g. LogsPanel)
export type { NetworkNode, LogEntry, MetricData, BackendHook };

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL TOPOLOGY (deterministic for demo)
// ─────────────────────────────────────────────────────────────────────────────

const makeNode = (
  id: string,
  type: DeviceType,
  label: string,
  pos: [number, number, number],
  ip: string,
  mac: string,
  trustScore = 1.0
): NetworkNode => {
  const p = new THREE.Vector3(...pos);
  return {
    id, type, label, ip, mac,
    pos: p,
    anchor: p.clone().normalize().multiplyScalar(2.0),
    trustScore,
    isUnderAttack: false,
    attackType: null,
    status: 'Safe',
  };
};

// Two nodes, both at the equator (y ≈ 0) so they sit sideways on the globe.
// phi = PI/2  →  x = r·cos(theta),  y ≈ 0,  z = r·sin(theta)
// ESP32-CAM on the right (+x side), Laptop on the left (−x side).
const INITIAL_NODES: NetworkNode[] = [
  makeNode('esp32', 'camera', 'ESP32-CAM',  [ 3.1,  0.15,  0.4], '10.42.0.10', 'AA:BB:CC:DD:EE:10', 0.95),
  makeNode('alpha', 'laptop', 'Staff Laptop', [-3.0,  0.10, -0.3], '10.42.0.15', 'AA:BB:CC:DD:EE:15', 1.0),
];

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK SCENARIO SCRIPTS
// Each entry: { ms: delay from trigger, msg, level }
// ─────────────────────────────────────────────────────────────────────────────

type AttackType = 'exfil' | 'recon' | 'flood';

interface LogScript { ms: number; msg: string; level: LogEntry['level'] }

const SCRIPTS: Record<AttackType, LogScript[]> = {
  exfil: [
    { ms:    0, msg: '[!] ALERT: Anomalous outbound traffic from ESP32-CAM (34.120.x.x:443)',             level: 'critical'    },
    { ms:  400, msg: '[!] EXFIL: Large payload burst — 1.2 MB in 3 s (threshold: 200 KB/s)',             level: 'critical'    },
    { ms:  900, msg: '[i] Entropy spike detected — data may be encrypted/compressed',                    level: 'warning'     },
    { ms: 1500, msg: '[i] Rule EXFIL_01 triggered: byte_rate > 200 KB/s for 3 consecutive windows',      level: 'warning'     },
    { ms: 2200, msg: '[!] Threat score → 112 / 150 (CRITICAL threshold: 100)',                           level: 'critical'    },
    { ms: 3000, msg: '[M] MITIGATION: iptables DROP rule installed for 10.42.0.10 → WAN',                level: 'mitigation'  },
    { ms: 3500, msg: '[M] MITIGATION: ESP32-CAM quarantined — DHCP lease revoked',                       level: 'mitigation'  },
    { ms: 4200, msg: '[i] Gateway: outbound exfil channel severed — 0 bytes/s from device',              level: 'info'        },
    { ms: 5000, msg: '[i] Threat score decaying… 112 → 80 → 40 (cooldown active)',                       level: 'info'        },
    { ms: 6500, msg: '[i] Device trust restored after cooldown. Re-admitting to network.',                level: 'info'        },
  ],
  recon: [
    { ms:    0, msg: '[!] ALERT: Port scan detected from ESP32-CAM (10.42.0.10)',                        level: 'critical'    },
    { ms:  300, msg: '[!] RECON: SYN sweep — 512 half-open connections in 4 s',                          level: 'critical'    },
    { ms:  700, msg: '[i] Rule RECON_01 triggered: dst_port_diversity > 50 unique ports/s',              level: 'warning'     },
    { ms: 1200, msg: '[!] Probing services: 22/SSH, 80/HTTP, 443/HTTPS, 3306/MySQL, 5432/PG',           level: 'critical'    },
    { ms: 1800, msg: '[i] Threat score → 95 / 150',                                                      level: 'warning'     },
    { ms: 2500, msg: '[M] MITIGATION: iptables REJECT all outbound SYN from 10.42.0.10',                 level: 'mitigation'  },
    { ms: 3200, msg: '[M] MITIGATION: ARP entry poisoned — routing device to honeypot 10.42.0.200',      level: 'mitigation'  },
    { ms: 4000, msg: '[i] Scan activity dropped to 0 pkts/s. Containment effective.',                    level: 'info'        },
    { ms: 5500, msg: '[i] Threat score decaying… restoring device trust.',                               level: 'info'        },
  ],
  flood: [
    { ms:    0, msg: '[!] ALERT: UDP flood originating from ESP32-CAM',                                   level: 'critical'    },
    { ms:  200, msg: '[!] FLOOD: 4 200 pkts/s — gateway CPU at 91%',                                     level: 'critical'    },
    { ms:  600, msg: '[i] Rule FLOOD_01 triggered: pkt_rate > 2 000 pkts/s for 2 s',                     level: 'warning'     },
    { ms: 1100, msg: '[!] DDoS target: 10.42.0.1:53 (DNS amplification pattern)',                        level: 'critical'    },
    { ms: 1700, msg: '[!] Threat score → 148 / 150 — CRITICAL',                                          level: 'critical'    },
    { ms: 2200, msg: '[M] MITIGATION: Rate-limit rule → 50 pkts/s cap on 10.42.0.10',                   level: 'mitigation'  },
    { ms: 2800, msg: '[M] MITIGATION: MAC blacklist entry added — frames dropped at L2',                  level: 'mitigation'  },
    { ms: 3400, msg: '[M] MITIGATION: hostapd: deauth frame sent to AA:BB:CC:DD:EE:10',                  level: 'mitigation'  },
    { ms: 4200, msg: '[i] Flood subsided — 0 pkts/s from device. Gateway CPU back to 12%.',              level: 'info'        },
    { ms: 5800, msg: '[i] Threat score decaying. Device re-admitted after 6 s isolation.',               level: 'info'        },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOT LOGS
// ─────────────────────────────────────────────────────────────────────────────
const BOOT_LOGS: LogScript[] = [
  { ms:    0, msg: 'SYSTEM START: hostapd — AP Cipher_IoT_Net active on wlan1',           level: 'info' },
  { ms:  300, msg: 'SYSTEM START: dnsmasq DHCP active — pool 10.42.0.10–50',              level: 'info' },
  { ms:  600, msg: 'SYSTEM START: Scapy sniffer running in promiscuous mode on wlan1',    level: 'info' },
  { ms:  900, msg: 'DEVICE JOIN: ESP32-CAM [AA:BB:CC:DD:EE:10] → 10.42.0.10',            level: 'info' },
  { ms: 1200, msg: 'DEVICE JOIN: Staff Laptop [AA:BB:CC:DD:EE:15] → 10.42.0.15',         level: 'info' },
  { ms: 1800, msg: 'GATEWAY: All systems nominal. Threat engine armed.',                   level: 'info' },
];

// Auto-mitigation fires after this many ms once an attack starts
const MITIGATION_DELAY_MS = 6000;

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useDemoBackend(): BackendHook {
  const [nodes, setNodes] = useState<NetworkNode[]>(INITIAL_NODES);
  const [logs, setLogs]   = useState<LogEntry[]>([]);
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [isToggling, setIsToggling]               = useState(false);
  const [activeAttack, setActiveAttack]           = useState<AttackType | null>(null);

  const attackTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mitigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  const addLog = useCallback((message: string, level: LogEntry['level']) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      message, level,
    }, ...prev].slice(0, 60));
  }, []);

  const clearAllTimers = useCallback(() => {
    attackTimers.current.forEach(t => clearTimeout(t));
    attackTimers.current = [];
    if (mitigationTimer.current) clearTimeout(mitigationTimer.current);
    mitigationTimer.current = null;
  }, []);

  /** Mark ESP32-CAM as under attack with the given type */
  const markAttack = useCallback((type: AttackType | null, score: number) => {
    setNodes(prev => prev.map(n =>
      n.id === 'esp32'
        ? { ...n, isUnderAttack: !!type, attackType: type, trustScore: Math.max(0.05, 1 - score / 150) }
        : n
    ));
  }, []);

  /** Reset all nodes to a safe state */
  const resetNodes = useCallback(() => {
    setNodes(INITIAL_NODES.map(n => ({ ...n })));
  }, []);

  // ── boot sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    BOOT_LOGS.forEach(({ ms, msg, level }) => {
      const t = setTimeout(() => addLog(msg, level), ms);
      attackTimers.current.push(t);
    });
    return clearAllTimers;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── attack trigger ────────────────────────────────────────────────────────
  const launchAttack = useCallback((type: AttackType) => {
    clearAllTimers();
    setActiveAttack(type);

    // Immediately mark ESP32 as under attack
    markAttack(type, 60);

    // Schedule log stream
    SCRIPTS[type].forEach(({ ms, msg, level }) => {
      const t = setTimeout(() => addLog(msg, level), ms);
      attackTimers.current.push(t);
    });

    // Ramp threat score over time
    const rampSteps = 8;
    for (let i = 1; i <= rampSteps; i++) {
      const t = setTimeout(() => {
        const score = 60 + (90 / rampSteps) * i; // 60 → 150
        markAttack(type, Math.min(score, 148));
      }, (i * MITIGATION_DELAY_MS) / rampSteps);
      attackTimers.current.push(t);
    }

    // Auto-mitigation
    mitigationTimer.current = setTimeout(() => {
      addLog('[M] AUTO-MITIGATION: Gateway threat engine fired. Device isolated.', 'mitigation');
      setActiveAttack(null);
      // Gradually restore trust
      const decay = [120, 80, 50, 20, 0];
      decay.forEach((score, i) => {
        const t = setTimeout(() => markAttack(null, score), (i + 1) * 600);
        attackTimers.current.push(t);
      });
      setTimeout(() => resetNodes(), (decay.length + 1) * 600);
    }, MITIGATION_DELAY_MS);
  }, [addLog, clearAllTimers, markAttack, resetNodes]);

  // ── stop all attacks ──────────────────────────────────────────────────────
  const stopAttacks = useCallback(() => {
    clearAllTimers();
    setActiveAttack(null);
    addLog('COMMAND: Stop All Attacks. Returning to normal operations.', 'mitigation');
    resetNodes();
  }, [addLog, clearAllTimers, resetNodes]);

  // ── toggle protection ─────────────────────────────────────────────────────
  const toggleProtection = useCallback(() => {
    setIsToggling(true);
    setTimeout(() => {
      setProtectionEnabled(prev => {
        const next = !prev;
        addLog(
          next
            ? 'GATEWAY: Protection ENABLED — iptables rules reloaded'
            : 'GATEWAY: Protection DISABLED — traffic flowing unfiltered ⚠',
          next ? 'mitigation' : 'critical'
        );
        return next;
      });
      setIsToggling(false);
    }, 600);
  }, [addLog]);

  // ── clear logs ────────────────────────────────────────────────────────────
  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    nodes,
    logs,
    protectionEnabled,
    toggleProtection,
    isToggling,
    clearLogs,
    // demo extras
    activeAttack,
    triggerExfil:  () => launchAttack('exfil'),
    triggerRecon:  () => launchAttack('recon'),
    triggerFlood:  () => launchAttack('flood'),
    stopAttacks,
    isDemoMode: true,
  };
}
