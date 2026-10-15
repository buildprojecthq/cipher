import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { type AttackerLocation, DEFAULT_C2_LOCATION } from '../lib/types';

export type DeviceType = 'laptop' | 'phone' | 'tablet' | 'fridge' | 'camera';

interface DeviceNodeProps {
  position: THREE.Vector3;
  type: DeviceType;
  label: string;
  trustScore: number;
  status?: string;
  isUnderAttack?: boolean;
  attackType?: string | null;
  attackerLocation?: AttackerLocation | null;
  onSelect: (label: string) => void;
}

export const DeviceNode: React.FC<DeviceNodeProps> = ({ 
  position, 
  type, 
  label, 
  trustScore, 
  status, 
  isUnderAttack = false,
  attackType = 'exfil',
  attackerLocation = null,
  onSelect 
}) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Group>(null);
  const isOffline = status === 'Offline';
  const isBlocked = status?.includes('Blocked') || status?.includes('Quarantined') || trustScore <= 0.15;
  const isAttacked = isUnderAttack || isBlocked || (type === 'camera' && trustScore < 0.5);
  const attackerLoc = attackerLocation || DEFAULT_C2_LOCATION;

  const getStatusColor = () => {
    if (isOffline) return "#222222";
    if (isBlocked || isAttacked) return "#ef4444"; // Red for blocked/quarantined/attacked
    if (label.includes('Hacker') || label.includes('C2')) return "#ef4444"; // Red for attacker
    if (trustScore > 0.7) return "#ffffff"; // White
    if (trustScore > 0.4) return "#f59e0b"; // Amber for suspicious
    return "#ef4444"; // Red
  };

  const statusColor = getStatusColor();

  useFrame((state) => {
    if (meshRef.current && !isOffline) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  const renderOutline = (args: [number, number, number], pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0]) => (
    <mesh position={pos} rotation={rot} visible={!isOffline}>
      <boxGeometry args={[args[0] + 0.04, args[1] + 0.04, args[2] + 0.04]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.BackSide} />
    </mesh>
  );

  const renderModel = () => {
    switch (type) {
      case 'laptop':
        return (
          <group scale={0.6}>
            {/* Outline Shells */}
            {renderOutline([0.7, 0.45, 0.02], [0, 0.25, -0.05], [-Math.PI / 12, 0, 0])}
            {renderOutline([0.75, 0.05, 0.6], [0, 0.01, 0.2])}
            {/* Screen */}
            <mesh position={[0, 0.25, -0.05]} rotation={[-Math.PI / 12, 0, 0]}>
              <boxGeometry args={[0.7, 0.45, 0.02]} />
              <meshStandardMaterial 
                color={hovered ? "#ffffff" : statusColor} 
                roughness={0} 
              />
            </mesh>
            {/* Screen Bezel */}
            <mesh position={[0, 0.25, -0.06]} rotation={[-Math.PI / 12, 0, 0]}>
              <boxGeometry args={[0.75, 0.5, 0.01]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Base */}
            <mesh position={[0, 0.01, 0.2]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.75, 0.05, 0.6]} />
              <meshStandardMaterial color="#111111" roughness={1} />
            </mesh>
            {/* Keyboard Detail */}
            <mesh position={[0, 0.04, 0.2]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.65, 0.01, 0.4]} />
              <meshStandardMaterial color={statusColor} metalness={1} roughness={0} />
            </mesh>
          </group>
        );
      case 'camera':
        return (
          <group scale={1.4}>
            {renderOutline([0.4, 0.5, 0.1])}
            
            {/* PCB Base (Dark Green) */}
            <mesh>
              <boxGeometry args={[0.35, 0.45, 0.05]} />
              <meshStandardMaterial color="#062e14" />
            </mesh>
            
            {/* Main Camera Body (White) */}
            <mesh position={[0, 0, 0.05]}>
              <boxGeometry args={[0.25, 0.3, 0.1]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>

            {/* Large Lens Barrel (White) */}
            <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.1, 32]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>

            {/* Lens Optic (Black/Reflective) */}
            <mesh position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.01, 32]} />
              <meshStandardMaterial color="#000000" metalness={1} roughness={0.1} />
            </mesh>

            {/* Antenna (ESP32 style) */}
            <mesh position={[0.15, 0.15, 0.025]}>
              <cylinderGeometry args={[0.01, 0.01, 0.3, 8]} />
              <meshStandardMaterial color="#111111" />
            </mesh>

            {/* Flash LED */}
            <mesh position={[-0.08, 0.1, 0.105]}>
              <boxGeometry args={[0.04, 0.04, 0.01]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
            </mesh>

            {/* Small Status Light */}
            <mesh position={[0.06, -0.08, 0.175]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshBasicMaterial color={statusColor} />
            </mesh>
          </group>
        );
      case 'phone':
        return (
          <group scale={1.0}>
            {renderOutline([0.18, 0.35, 0.03])}
            {/* White Frame/Backing */}
            <mesh>
              <boxGeometry args={[0.2, 0.37, 0.04]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Phone Body */}
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[0.18, 0.35, 0.03]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Front Screen */}
            <mesh position={[0, -0.01, 0.026]}>
              <boxGeometry args={[0.16, 0.3, 0.002]} />
              <meshStandardMaterial color={hovered ? "#ffffff" : statusColor} />
            </mesh>
          </group>
        );
      case 'fridge':
        return (
          <group scale={0.55}>
            {renderOutline([0.5, 1.2, 0.5], [0, 0.5, 0])}
            {/* Body */}
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.5, 1.2, 0.5]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Detail Panel */}
            <mesh position={[0, 0.7, 0.26]}>
              <boxGeometry args={[0.3, 0.3, 0.01]} />
              <meshStandardMaterial 
                color={hovered ? "#ffffff" : statusColor} 
              />
            </mesh>
            {/* Handle */}
            <mesh position={[0.2, 0.6, 0.27]}>
              <boxGeometry args={[0.02, 0.7, 0.03]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.05}>
      <group 
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onSelect(label)}
      >
        <group ref={meshRef}>
          {renderModel()}
        </group>

        {/* Top Balloon UI for Attacked Device showing C2 Geolocation details */}
        {isAttacked ? (
          <Html position={[0, 1.45, 0]} center distanceFactor={8}>
            <div className="flex flex-col items-center pointer-events-auto select-none">
              {/* Balloon Box */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(label);
                }}
                className="cursor-pointer bg-black/95 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.7),4px_4px_0px_#ef4444] backdrop-blur-md px-3 py-2 font-mono text-left min-w-[210px] max-w-[260px] transition-transform active:scale-95"
              >
                {/* Balloon Header */}
                <div className="flex items-center justify-between gap-2 border-b border-red-500/40 pb-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                    <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">
                      ATTACKER LOCATION
                    </span>
                  </div>
                  <span className="text-[7.5px] bg-red-500/25 text-red-300 border border-red-500/50 px-1 py-0.2 uppercase font-bold tracking-wider">
                    {attackType?.toUpperCase() || 'EXFIL'}
                  </span>
                </div>

                {/* Balloon Details Grid */}
                <div className="space-y-1 text-[8px] leading-tight font-mono">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-white/40 uppercase text-[7px] tracking-wider">Adversary C2:</span>
                    <span className="text-white font-bold tracking-tight text-right">
                      {attackerLoc.city}, {attackerLoc.countryCode}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-white/40 uppercase text-[7px] tracking-wider">WAN IP:</span>
                    <span className="text-red-400 font-bold tracking-tight text-right">
                      {attackerLoc.ip}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-white/40 uppercase text-[7px] tracking-wider">Coordinates:</span>
                    <span className="text-white/80 text-[7px] text-right">
                      {attackerLoc.lat ? `${attackerLoc.lat.toFixed(2)}°N, ${attackerLoc.lon.toFixed(2)}°E` : '45.59°N, -121.18°W'}
                    </span>
                  </div>

                  {attackerLoc.isp && (
                    <div className="flex justify-between items-baseline gap-2 border-t border-white/10 pt-1 mt-1">
                      <span className="text-white/40 uppercase text-[6.5px] tracking-wider">Host:</span>
                      <span className="text-white/60 text-[6.5px] truncate max-w-[130px] text-right">
                        {attackerLoc.isp}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Balloon Downward Pointer Stem */}
              <div className="flex flex-col items-center">
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-red-500 -mt-[1px]" />
                <div className="w-[1.5px] h-3.5 bg-red-500 shadow-[0_0_8px_#ef4444]" />
              </div>
            </div>
          </Html>
        ) : (
          <>
            {/* Mobile HTML tap badge button */}
            <Html position={[0, 0.8, 0]} center zIndexRange={[100, 0]}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(label);
                }}
                className="md:hidden bg-black/90 backdrop-blur-md text-white border border-white/20 shadow-[4px_4px_0px_white] px-3 py-1.5 font-black uppercase tracking-widest text-[9px] whitespace-nowrap pointer-events-auto select-none active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {label}
              </button>
            </Html>

            {/* Desktop Hover Label */}
            {hovered && (
              <Html position={[0, 1, 0]} center>
                <div className="hidden md:flex items-center gap-2 bg-black/90 backdrop-blur-md text-white border border-white/20 shadow-[8px_8px_0px_white] px-4 py-2 font-black uppercase tracking-widest text-[11px] whitespace-nowrap pointer-events-none select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>{label}</span>
                </div>
              </Html>
            )}
          </>
        )}
      </group>
    </Float>
  );
};
