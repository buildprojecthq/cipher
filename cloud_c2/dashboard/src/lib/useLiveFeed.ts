import { useState, useEffect, useRef } from 'react';
import { ImageFrame } from './api';

interface LiveFeedState {
  frames: ImageFrame[];
  latencyMs: number | null;
  isConnected: boolean;
}

// Demo mode: simulate incoming frames when backend is not available
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_FRAMES: ImageFrame[] = [
  { name: 'capture_demo1.jpg', url: 'https://picsum.photos/seed/esp1/320/240', time: new Date().toLocaleString(), timestamp: Date.now() - 8000, size: 14200 },
  { name: 'capture_demo2.jpg', url: 'https://picsum.photos/seed/esp2/320/240', time: new Date().toLocaleString(), timestamp: Date.now() - 5500, size: 13800 },
  { name: 'capture_demo3.jpg', url: 'https://picsum.photos/seed/esp3/320/240', time: new Date().toLocaleString(), timestamp: Date.now() - 3000, size: 15100 },
];

export function useLiveFeed(triggerTime: number | null): LiveFeedState {
  const [frames, setFrames] = useState<ImageFrame[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const latencyRecorded = useRef(false);
  const demoInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset latency tracking when a new attack is triggered
  useEffect(() => {
    if (triggerTime !== null) {
      latencyRecorded.current = false;
      setLatencyMs(null);
    }
  }, [triggerTime]);

  useEffect(() => {
    if (DEMO_MODE) {
      // Demo: seed with existing frames, then add new ones periodically
      setFrames(DEMO_FRAMES);
      setIsConnected(true);
      return;
    }

    const es = new EventSource('/api/feed');

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.addEventListener('new_image', (e: MessageEvent) => {
      const frame: ImageFrame = JSON.parse(e.data);
      // Record latency on first frame after attack trigger
      if (triggerTime !== null && !latencyRecorded.current) {
        setLatencyMs(Date.now() - triggerTime);
        latencyRecorded.current = true;
      }
      setFrames(prev => [frame, ...prev].slice(0, 100));
    });

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo mode: simulate frames arriving during attack
  const startDemoStream = () => {
    if (!DEMO_MODE) return;
    let i = 4;
    demoInterval.current = setInterval(() => {
      const frame: ImageFrame = {
        name: `capture_demo${i}.jpg`,
        url: `https://picsum.photos/seed/esp${i}/320/240`,
        time: new Date().toLocaleString(),
        timestamp: Date.now(),
        size: Math.floor(12000 + Math.random() * 5000),
      };
      if (triggerTime !== null && !latencyRecorded.current) {
        setLatencyMs(Date.now() - triggerTime);
        latencyRecorded.current = true;
      }
      setFrames(prev => [frame, ...prev].slice(0, 100));
      i++;
    }, 500);
  };

  const stopDemoStream = () => {
    if (demoInterval.current) clearInterval(demoInterval.current);
  };

  return { frames, latencyMs, isConnected };
}
