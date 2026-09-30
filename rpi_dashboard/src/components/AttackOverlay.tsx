import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
// FLOATING PACKET — small glowing cube flying outward
// ─────────────────────────────────────────────────────────────
interface PacketProps {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  speed: number;
  color: string;
  size?: number;
}

const FloatingPacket: React.FC<PacketProps> = ({ startPos, endPos, speed, color, size = 0.04 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(Math.random());

  useFrame((_, delta) => {
    progress.current = (progress.current + delta * speed) % 1;
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(startPos, endPos, progress.current);
      meshRef.current.rotation.x += delta * 2;
      meshRef.current.rotation.y += delta * 3;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
};

// ─────────────────────────────────────────────────────────────
// GATEWAY SHIELD — pulsing defensive ring around globe
// ─────────────────────────────────────────────────────────────
export const GatewayShield: React.FC<{ active: boolean; underAttack: boolean }> = ({ active, underAttack }) => {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * (underAttack ? 4 : 1.5));

    if (ring1.current) {
      (ring1.current.material as THREE.MeshBasicMaterial).opacity = active
        ? (underAttack ? 0.15 + pulse * 0.25 : 0.08 + pulse * 0.06)
        : 0;
      ring1.current.rotation.z += 0.003;
    }
    if (ring2.current) {
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = active
        ? (underAttack ? 0.1 + pulse * 0.18 : 0.04 + pulse * 0.04)
        : 0;
      ring2.current.rotation.z -= 0.002;
    }
    if (ring3.current) {
      (ring3.current.material as THREE.MeshBasicMaterial).opacity = active
        ? (underAttack ? 0.07 + pulse * 0.12 : 0.02 + pulse * 0.02)
        : 0;
    }
  });

  const color = underAttack ? '#ff3333' : '#00ff88';

  return (
    <group>
      {/* Inner shield ring */}
      <mesh ref={ring1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.55, 0.006, 8, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>
      {/* Mid shield ring */}
      <mesh ref={ring2} rotation={[Math.PI / 3, 0.3, 0]}>
        <torusGeometry args={[2.7, 0.004, 8, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>
      {/* Outer aura */}
      <mesh ref={ring3} rotation={[Math.PI / 6, 0.6, 0]}>
        <torusGeometry args={[2.85, 0.002, 8, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>
    </group>
  );
};

// ─────────────────────────────────────────────────────────────
// ATTACK BEAM — red laser from attacker to globe
// ─────────────────────────────────────────────────────────────
export const ThreatSignal: React.FC<{ position: THREE.Vector3; active: boolean }> = ({ position, active }) => {
  const haloRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Smooth linear ripple that resets seamlessly
    const ripple = (t * 1.2) % 1;
    const shimmer = 0.8 + 0.2 * Math.sin(t * 30);

    if (haloRef.current) {
      // Linear expansion from 0.8 to 1.8
      haloRef.current.scale.setScalar(0.8 + ripple * 1.2);
      // Fade out as it expands
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = active ? (1 - ripple) * 0.5 : 0;
    }
    
    if (coreRef.current) {
      // Soft high-frequency shimmer instead of hard glitch
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = active ? 0.15 * shimmer : 0;
      coreRef.current.rotation.y = t * 0.5;
    }
  });

  if (!active) return null;

  return (
    <group position={position}>
      {/* Seamless Ripple Halo */}
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.015, 8, 48]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* Soft Shimmering Aura */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshBasicMaterial color="#ff0000" wireframe transparent opacity={0} />
      </mesh>
    </group>
  );
};

// ─────────────────────────────────────────────────────────────
// INSTANCED PACKETS — highly optimized for performance
// ─────────────────────────────────────────────────────────────
interface InstancedPacketsProps {
  count: number;
  active: boolean;
  type: 'ambient' | 'attack';
  from?: THREE.Vector3;
}

const InstancedPackets: React.FC<InstancedPacketsProps> = ({ count, active, type, from }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colors = type === 'attack' ? ['#ff0000', '#ff4400', '#cc0000'] : ['#00ffff', '#ff00ff', '#ffff00', '#00ff88', '#ff8800'];
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      let startPos, endPos;
      if (type === 'ambient') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 2.2;
        startPos = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
        endPos = startPos.clone().multiplyScalar(4 + Math.random() * 3);
      } else {
        const globeCenter = new THREE.Vector3(0, 0, 0);
        const spread = 0.5;
        startPos = from!.clone();
        endPos = globeCenter.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
          )
        );
      }

      temp.push({
        startPos,
        endPos,
        speed: type === 'attack' ? 0.4 + Math.random() * 0.5 : 0.15 + Math.random() * 0.3,
        color: new THREE.Color(colors[Math.floor(Math.random() * colors.length)]),
        size: type === 'attack' ? 0.03 + Math.random() * 0.03 : 0.025 + Math.random() * 0.04,
        progress: Math.random()
      });
    }
    return temp;
  }, [count, type, from]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;

    particles.forEach((p, i) => {
      p.progress = (p.progress + delta * p.speed) % 1;
      const pos = new THREE.Vector3().lerpVectors(p.startPos, p.endPos, p.progress);
      
      dummy.position.copy(pos);
      dummy.rotation.x += delta * 2;
      dummy.rotation.y += delta * 3;
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, p.color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0.85} />
    </instancedMesh>
  );
};

// ─────────────────────────────────────────────────────────────
// PACKET FLOW — free-floating packets when gateway is OFF
// ─────────────────────────────────────────────────────────────
export const PacketFlow: React.FC<{ active: boolean }> = ({ active }) => {
  return <InstancedPackets count={40} active={active} type="ambient" />;
};

// ─────────────────────────────────────────────────────────────
// ATTACK PARTICLES — red packets streaming from attacker node
// ─────────────────────────────────────────────────────────────
export const AttackParticles: React.FC<{
  from: THREE.Vector3;
  active: boolean;
  attackType: string | null;
}> = ({ from, active, attackType }) => {
  const count = attackType === 'flood' ? 30 : attackType === 'exfil' ? 15 : 20;
  return <InstancedPackets count={count} active={active} type="attack" from={from} />;
};

