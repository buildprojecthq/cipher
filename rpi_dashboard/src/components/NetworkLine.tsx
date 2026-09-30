import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface NetworkLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
  speed?: number;
}

const CableParticle: React.FC<{ curve: THREE.CubicBezierCurve3; speed: number }> = ({ curve, speed }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const t = (state.clock.getElapsedTime() * speed * 0.4) % 1;
      const pos = curve.getPoint(t);
      meshRef.current.position.copy(pos);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
};

export const NetworkLine: React.FC<NetworkLineProps> = ({ 
  start, 
  end, 
  color = "#ffffff", 
  speed = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const curve = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    
    // More realistic sag proportional to distance
    mid.y -= distance * 0.35; 
    
    const cp1 = new THREE.Vector3().lerpVectors(start, mid, 0.6);
    const cp2 = new THREE.Vector3().lerpVectors(end, mid, 0.6);
    
    // Add some outward curve so they don't just hang straight down
    cp1.x *= 1.2;
    cp1.z *= 1.2;
    cp2.x *= 1.2;
    cp2.z *= 1.2;

    return new THREE.CubicBezierCurve3(start, cp1, cp2, end);
  }, [start, end]);

  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.03, 12, false), [curve]);

  useFrame((state) => {
    if (materialRef.current) {
      const time = state.clock.getElapsedTime();
      const pulse = Math.abs(Math.sin(time * 2 + speed)) > 0.85 ? 1 : 0.4;
      materialRef.current.emissiveIntensity = pulse;
      materialRef.current.emissive.set(color);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
          ref={materialRef}
          color={color} 
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.4} 
          metalness={0.6}
        />
      </mesh>
      
      {/* Connector Heads */}
      <mesh position={start}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={end}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Strain Relief Rings */}
      {[0.1, 0.3, 0.5, 0.7, 0.9].map((t, i) => {
        const p = curve.getPoint(t);
        const tangent = curve.getTangent(t);
        return (
          <mesh key={i} position={p} rotation={new THREE.Euler().setFromVector3(tangent)}>
            <torusGeometry args={[0.045, 0.01, 8, 16]} />
            <meshBasicMaterial color="#111" />
          </mesh>
        );
      })}

      <CableParticle curve={curve} speed={speed} />
    </group>
  );
};
