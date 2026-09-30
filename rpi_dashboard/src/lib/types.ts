import * as THREE from 'three';
import { DeviceType } from '../components/DeviceNode';

export interface NetworkNode {
  id: string;
  type: DeviceType;
  label: string;
  pos: THREE.Vector3;
  anchor: THREE.Vector3;
  trustScore: number;
  ip: string;
  mac: string;
  isUnderAttack?: boolean;
  attackType?: 'exfil' | 'recon' | 'flood' | null;
  status?: string;
}

export interface MetricData {
  time: string;
  pktRate: number;
  byteRate: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'critical' | 'mitigation';
}

/** Shape returned by both useBackend and useDemoBackend */
export interface BackendHook {
  nodes: NetworkNode[];
  logs: LogEntry[];
  protectionEnabled: boolean;
  toggleProtection: () => void;
  isToggling: boolean;
  clearLogs: () => void;
  // Demo-only (optional so real backend doesn't need them)
  activeAttack?: 'exfil' | 'recon' | 'flood' | null;
  triggerExfil?: () => void;
  triggerRecon?: () => void;
  triggerFlood?: () => void;
  stopAttacks?: () => void;
  isDemoMode?: boolean;
}
