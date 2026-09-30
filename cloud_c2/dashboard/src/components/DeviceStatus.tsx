import React from 'react';
import { AttackType } from './AttackControls';

type DeviceState = 'idle' | 'active' | 'blocked';

interface DeviceStatusProps {
  activeAttack: AttackType;
  frameCount: number;
  deviceIp?: string;
  isBlocked?: boolean;
}

const STATUS_DOT: Record<DeviceState, string> = {
  idle: 'bg-white/20',
  active: 'bg-red-500 pulse-red',
  blocked: 'bg-yellow-500 animate-pulse',
};

export const DeviceStatus: React.FC<DeviceStatusProps> = ({ activeAttack, deviceIp, isBlocked }) => {
  const state: DeviceState = isBlocked ? 'blocked' : (activeAttack ? 'active' : 'idle');

  return (
    <div className="relative group">
      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-white pointer-events-none opacity-50" />
      <div className="relative bg-black border border-white/20 px-4 py-2.5 flex items-center justify-between">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase italic text-white/90">ESP32-CAM</span>
            {isBlocked && (
              <span className="text-[7px] font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-1 py-0.2 uppercase font-bold">
                BLOCKED
              </span>
            )}
          </div>
          <span className="text-[8px] font-mono text-white/40 tracking-wider">
            {deviceIp || '10.42.0.x (Cipher_IoT_Net)'}
          </span>
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[state]}`} />
      </div>
    </div>
  );
};
