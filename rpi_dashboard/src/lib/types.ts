import * as THREE from 'three';
import { DeviceType } from '../components/DeviceNode';

export interface AttackerLocation {
  ip: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  isp?: string;
  sourceZone?: string;
}

export const DEFAULT_C2_LOCATION: AttackerLocation = {
  ip: '35.212.229.239',
  city: 'The Dalles',
  country: 'United States',
  countryCode: 'US',
  lat: 45.5945,
  lon: -121.1786,
  isp: 'Google Cloud (us-west1) · AS43515'
};

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
  attackerLocation?: AttackerLocation | null;
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
  attackerLocation?: AttackerLocation | null;
  // Demo-only (optional so real backend doesn't need them)
  activeAttack?: 'exfil' | 'recon' | 'flood' | null;
  triggerExfil?: () => void;
  triggerRecon?: () => void;
  triggerFlood?: () => void;
  stopAttacks?: () => void;
  isDemoMode?: boolean;
}

