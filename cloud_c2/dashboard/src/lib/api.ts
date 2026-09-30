// -------------------------------------------------------
// Types
// -------------------------------------------------------
export interface ImageFrame {
  name: string;
  url: string;
  time: string;
  timestamp: number;
  size: number;
}

export interface ReconDevice {
  ip: string;
  mac?: string;
  openPorts: number[];
  hostname?: string;
  deviceGuess: string;
  discoveredAt: string;
}

export interface TriggerResponse {
  status: string;
  relay_response?: unknown;
  error?: string;
}

export type AttackAction =
  | 'start_exfil'
  | 'start_recon'
  | 'start_flood'
  | 'stop';

// -------------------------------------------------------
// API calls
// -------------------------------------------------------

export async function triggerAttack(
  action: AttackAction,
  target = 'esp32cam'
): Promise<TriggerResponse> {
  const res = await fetch('/api/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, action }),
  });
  return res.json();
}

export async function getGallery(): Promise<ImageFrame[]> {
  const res = await fetch('/api/gallery');
  if (!res.ok) throw new Error('Gallery fetch failed');
  return res.json();
}

export async function getReconResults(): Promise<ReconDevice[]> {
  const res = await fetch('/api/recon');
  if (!res.ok) return [];
  return res.json();
}

export async function getMetrics(ip?: string): Promise<{ time: string; pktRate: number; threatScore: number }[]> {
  const url = ip ? `/api/metrics?ip=${ip}` : '/api/metrics';
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export interface DiscoveredDevice {
  ip: string;
  pktRate: number;
  threatScore: number;
  status: string;
}

export async function getDevices(): Promise<{ devices: DiscoveredDevice[]; gatewayUrl: string }> {
  const res = await fetch('/api/devices');
  if (!res.ok) return { devices: [], gatewayUrl: '' };
  return res.json();
}

export async function setGatewayUrl(url: string): Promise<{ status: string; gatewayUrl?: string; error?: string }> {
  const res = await fetch('/api/gateway/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return res.json();
}
