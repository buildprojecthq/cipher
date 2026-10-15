import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { AttackerLocation } from '../lib/types';

// Technical world map projection to create dotted continents
export const Globe: React.FC<{ targetLocation?: AttackerLocation | null }> = ({ targetLocation }) => {
  const globeRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (globeRef.current) {
      if (targetLocation) {
        // Smoothly rotate globe so that targetLocation beacon faces the front (+Z toward camera)
        const lon = targetLocation.lon;
        const theta = (lon + 180) * (Math.PI / 180);
        const desiredRotationY = Math.PI / 2 - theta;
        
        // Compute shortest angular difference
        const currentY = globeRef.current.rotation.y;
        const diff = ((desiredRotationY - currentY + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        globeRef.current.rotation.y += diff * 0.04;
      } else {
        // Very slow idle rotation
        globeRef.current.rotation.y += 0.0005;
      }
    }
  });

  return (
    <group ref={globeRef}>
      {/* Dark silhouette core */}
      <Sphere args={[1.9, 64, 64]}>
        <meshBasicMaterial color="#000000" />
      </Sphere>

      {/* Cybertech Geography Shell */}
      <WorldDotMap radius={2.05} />

      {/* Target Location Beacon (when under active attack) */}
      {targetLocation && (
        <TargetBeacon location={targetLocation} radius={2.05} />
      )}

      {/* Equator Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.15, 0.003, 8, 128]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.3} 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>
    </group>
  );
};

const TargetBeacon: React.FC<{ location: AttackerLocation; radius: number }> = ({ location, radius }) => {
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const tipRef = useRef<THREE.Mesh>(null);

  const pos = useMemo(() => {
    const lat = location.lat;
    const lon = location.lon;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }, [location.lat, location.lon, radius]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const ripple1 = (t * 1.5) % 1;
    const ripple2 = ((t * 1.5) + 0.5) % 1;

    if (ringRef1.current) {
      ringRef1.current.scale.setScalar(0.4 + ripple1 * 2.8);
      (ringRef1.current.material as THREE.MeshBasicMaterial).opacity = (1 - ripple1) * 0.9;
    }
    if (ringRef2.current) {
      ringRef2.current.scale.setScalar(0.4 + ripple2 * 2.8);
      (ringRef2.current.material as THREE.MeshBasicMaterial).opacity = (1 - ripple2) * 0.7;
    }
    if (coreRef.current) {
      const pulse = 0.75 + 0.25 * Math.sin(t * 8);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
    if (beamRef.current) {
      const shimmer = 0.7 + 0.3 * Math.sin(t * 12);
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = shimmer * 0.85;
    }
    if (tipRef.current) {
      const scale = 1.0 + 0.2 * Math.sin(t * 10);
      tipRef.current.scale.setScalar(scale);
    }
  });

  const quaternion = useMemo(() => {
    const normal = pos.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [pos]);

  return (
    <group position={pos} quaternion={quaternion}>
      {/* Expanding Radar Wave 1 */}
      <mesh ref={ringRef1} position={[0, 0, 0.01]}>
        <ringGeometry args={[0.08, 0.14, 32]} />
        <meshBasicMaterial 
          color="#ff1111" 
          transparent 
          opacity={0.8} 
          side={THREE.DoubleSide} 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>

      {/* Expanding Radar Wave 2 */}
      <mesh ref={ringRef2} position={[0, 0, 0.015]}>
        <ringGeometry args={[0.08, 0.14, 32]} />
        <meshBasicMaterial 
          color="#ff3333" 
          transparent 
          opacity={0.6} 
          side={THREE.DoubleSide} 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>

      {/* Surface Base Glow Core */}
      <mesh ref={coreRef} position={[0, 0, 0.02]}>
        <circleGeometry args={[0.09, 24]} />
        <meshBasicMaterial 
          color="#ff2222" 
          transparent 
          opacity={0.95} 
          side={THREE.DoubleSide} 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>

      {/* Inner White Core Pin */}
      <mesh position={[0, 0, 0.025]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical Luminous Targeting Beam (Extends 0.65 units outward) */}
      <mesh ref={beamRef} position={[0, 0, 0.325]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.028, 0.65, 16]} />
        <meshBasicMaterial 
          color="#ff2222" 
          transparent 
          opacity={0.85} 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>

      {/* Inner Bright Core Beam */}
      <mesh position={[0, 0, 0.325]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.009, 0.65, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>

      {/* Glowing Beacon Head / Tip Sphere */}
      <mesh ref={tipRef} position={[0, 0, 0.66]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial 
          color="#ff0000" 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>
      <mesh position={[0, 0, 0.66]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 3D Floating Cybernetic Callout Tag */}
      <Html position={[0, 0, 0.85]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center select-none pointer-events-none transform -translate-y-2">
          <div className="px-3 py-1.5 bg-black/95 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)] backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-black text-red-400 tracking-wider uppercase">
                  ADVERSARY C2: {location.city.toUpperCase()}, {location.countryCode}
                </span>
              </div>
              <div className="text-[8px] font-mono text-white/90 flex items-center gap-2 font-bold">
                <span>IP: {location.ip}</span>
                <span className="text-white/40">•</span>
                <span className="text-red-300">{location.lat.toFixed(1)}°N, {location.lon.toFixed(1)}°E</span>
              </div>
            </div>
          </div>
          {/* Vertical Leader Stalk */}
          <div className="w-0.5 h-4 bg-gradient-to-b from-red-500 to-transparent shadow-[0_0_8px_#ff0000]" />
        </div>
      </Html>
    </group>
  );
};

const WorldDotMap: React.FC<{ radius: number }> = ({ radius }) => {
  const matRef = useRef<THREE.PointsMaterial>(null);
  const lastScale = useRef<number>(0);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>(new THREE.BufferGeometry());
  
  useFrame((state) => {
    if (matRef.current) {
      const parent = matRef.current.parent;
      if (parent) {
        let root = parent;
        while (root.parent && root.parent.type !== 'Scene') {
          root = root.parent;
        }
        // Only update if scale changed significantly to save cycles
        if (Math.abs(root.scale.x - lastScale.current) > 0.001) {
          matRef.current.size = root.scale.x * 0.08;
          lastScale.current = root.scale.x;
        }
      }
    }
  });

  useEffect(() => {
    // Load image asynchronously to not block React render
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg';
    
    img.onload = () => {
      // Downscale heavily for performance! 256x128 is plenty for checking regions
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const w = 256;
      const h = 128;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      
      const tempPoints = [];
      const count = 10000;

      for (let i = 0; i < count; i++) {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        
        const u = 1 - (theta / (2 * Math.PI) % 1);
        const v = phi / Math.PI;
        
        const xPix = Math.floor(u * (w - 1));
        const yPix = Math.floor(v * (h - 1));
        
        const pixelIndex = (yPix * w + xPix) * 4;
        const intensity = imageData.data[pixelIndex];

        // Only place dot if it passes the intensity check (creates the continents pattern)
        if (intensity > 15) {
          const x = radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.cos(phi);
          const z = radius * Math.sin(phi) * Math.sin(theta);
          tempPoints.push(new THREE.Vector3(x, y, z));
        }
      }
      setGeometry(new THREE.BufferGeometry().setFromPoints(tempPoints));
    };
  }, [radius]);

  return (
    <points geometry={geometry}>
      <pointsMaterial 
        ref={matRef}
        size={0.014} 
        color="#ffffff" 
        transparent 
        opacity={1} 
        sizeAttenuation={true} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
