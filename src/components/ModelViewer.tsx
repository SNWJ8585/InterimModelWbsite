import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useFBX, PerspectiveCamera, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Compass, TrendingUp, Users, ChevronRight } from 'lucide-react';
import { ModelStats, TelemetrySettings } from '../types';

interface ModelProps {
  url: string;
  fallbackUrl?: string;
  onLoaded: () => void;
  onError?: (reason: string) => void;
  stats?: ModelStats;
  showStats?: boolean;
  settings: TelemetrySettings;
}

const ErrorDisplay = ({ message }: { message: string }) => {
  const isGithubError = message.includes('github.com') || message.includes('raw.githubusercontent.com');
  const is404 = message.includes('404');
  const isFbxParseError =
    message.includes('FBXLoader') &&
    (message.includes('Unknown property type') ||
      message.includes('Unable to parse') ||
      message.includes('Invalid file format'));

  return (
    <Html center>
      <div className="bg-red-950/80 backdrop-blur-2xl border border-red-500/50 p-8 rounded-3xl text-center max-w-sm shadow-[0_0_50px_rgba(239,68,68,0.2)]">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 animate-pulse">
          <Activity className="text-red-400 w-8 h-8" />
        </div>
        <h3 className="text-white font-black text-sm uppercase tracking-[0.3em] mb-4">Neural Map unreachable</h3>
        
        <div className="space-y-4 mb-6 text-left">
          <p className="text-red-200/90 text-xs leading-relaxed">
            {is404 
              ? "The system encountered a 404 error at the specified path." 
              : "Authentication or connection failure during neural fetch."}
          </p>
          
          {isFbxParseError && (
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
              <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider">FBX Parse Troubleshooting:</p>
              <ul className="text-[10px] text-red-200/60 list-disc pl-4 space-y-2">
                <li>FBX parse errors usually mean the file is corrupted or not raw binary data.</li>
                <li>Re-export or re-download the .fbx (do not use GitHub “blob” page URLs).</li>
                <li>If hosted on GitHub: use the Raw URL and ensure the repo is public.</li>
                <li>Prefer glTF/GLB when possible (more stable, smaller).</li>
              </ul>
            </div>
          )}
          
          {isGithubError && is404 && (
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
              <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider">Neural Troubleshooting:</p>
              <ul className="text-[10px] text-red-200/60 list-disc pl-4 space-y-2">
                <li>Repo Visibility: Must be <span className="text-red-300 font-bold underline">Public</span></li>
                <li>Branch Check: Is it <span className="text-red-300">master</span> instead of <span className="text-red-300">main</span>?</li>
                <li>Path Integrity: Do not omit "public" if it's in your GitHub path</li>
                <li>Case Check: <span className="text-red-300">.fbx</span> vs <span className="text-red-300">.FBX</span> must match exactly</li>
                <li>URL Source: Use the "Raw" button on GitHub to verify the link works in a browser</li>
              </ul>
            </div>
          )}
        </div>

        <div className="text-[9px] font-mono text-white/30 bg-black/40 p-2.5 rounded-lg border border-white/5 break-all max-h-24 overflow-y-auto mb-4">
          {message}
        </div>

        {is404 && (
          <a 
            href={message.split(': ').pop()?.trim()} 
            target="_blank" 
            referrerPolicy="no-referrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-xl text-[10px] text-red-200 font-bold uppercase tracking-widest transition-all"
          >
            Open RAW link to verify
          </a>
        )}
      </div>
    </Html>
  );
};

class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: string) => void; resetKey?: string },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMessage: error?.message || "Internal Load Failure" };
  }

  componentDidCatch(error: any) {
    this.props.onError(this.state.errorMessage);
  }

  componentDidUpdate(prevProps: Readonly<{ children: React.ReactNode; onError: (error: string) => void; resetKey?: string }>) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay message={this.state.errorMessage} />;
    }
    return this.props.children;
  }
}

const CLAY_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  roughness: 0.35, // Further reduced roughness for more specular highlights
  metalness: 0.1,
  emissive: '#222222', // Subtle emissive to pop the white
  emissiveIntensity: 0.2,
});

const TelemetryLabel = ({ label, value, position, settings }: { label: string; value: string; position: [number, number, number]; settings: TelemetrySettings }) => {
  const groupRef = useRef<THREE.Group>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useFrame(({ camera }) => {
    if (!groupRef.current || !wrapperRef.current) return;
    
    // Get world position of the point
    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);
    
    // Distance to camera
    const distance = camera.position.distanceTo(worldPos);
    
    // Sharper, non-linear opacity mapping for clear depth stratification
    // Near (distance < 7): 1.0
    // Mid (distance 7-15): Fades quickly
    // Far (distance > 15): Very faint
    const normalizedDistance = Math.max(0, (distance - 6) / 12);
    const opacity = Math.max(0.02, Math.min(1.0, Math.pow(1 - normalizedDistance, 1.5)));
    
    // Also scale slightly based on distance to enhance depth perception
    const scale = Math.max(0.6, Math.min(1.0, 1 - normalizedDistance * 0.4));
    
    wrapperRef.current.style.opacity = opacity.toString();
    wrapperRef.current.style.transform = `scale(${scale})`;
  });

  return (
    <group ref={groupRef} position={position}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Html 
          center 
          distanceFactor={10} 
          occlude 
          className="pointer-events-none"
        >
          <div 
            ref={wrapperRef}
            className="flex flex-col items-center pointer-events-auto transition-opacity duration-300"
          >
            <span className="text-white uppercase tracking-[0.2em] mb-0.5" style={{ fontSize: `${5 * settings.fontSize}px`, fontWeight: 'bold' }}>
              {label}
            </span>
            <span className="text-white whitespace-nowrap" style={{ fontSize: `${8 * settings.fontSize}px`, fontWeight: '900' }}>
              {value}
            </span>
          </div>
        </Html>
      </Float>
    </group>
  );
};

const ModelLoadingIndicator = () => (
  <Html center>
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#a8a2e1]/20 border-t-[#a8a2e1] rounded-full animate-spin" />
      <span className="text-[10px] font-black text-[#a8a2e1] uppercase tracking-[0.2em] animate-pulse">
        Syncing...
      </span>
    </div>
  </Html>
);

const FBXModel = ({ url, onLoaded, stats, showStats, settings, onError }: { url: string; onLoaded: () => void; stats?: ModelStats; showStats?: boolean; settings: TelemetrySettings; onError?: (msg: string) => void }) => {
  if (!url || url === '') return null;
  
  const fbx = useFBX(url);
  
  const { model, normalization } = React.useMemo(() => {
    if (!fbx) return { model: null, normalization: { scale: 1, offset: [0, 0, 0] as [number, number, number] } };
    const cloned = fbx.clone();
    
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Safety check for size
    const height = size.y || 1;
    const targetScale = 2.4 / height;
    
    return {
      model: cloned,
      normalization: {
        scale: isFinite(targetScale) ? targetScale : 1,
        offset: [
          -center.x * (isFinite(targetScale) ? targetScale : 1),
          -box.min.y * (isFinite(targetScale) ? targetScale : 1),
          -center.z * (isFinite(targetScale) ? targetScale : 1)
        ] as [number, number, number]
      }
    };
  }, [fbx]);
  
  // Memoize stat positions relative to normalized scale
  // Based on a target height of ~2.4 units
  const telemetryPoints = useMemo(() => {
    if (!stats) return [];
    const spread = settings.spread;
    const height = settings.height;
    return [
      { id: 'gender', label: 'Gender', value: stats.gender, pos: [-0.8 * spread, 2.2 * height, 0.4 * spread] },
      { id: 'age', label: 'Age', value: stats.age.toString(), pos: [0.8 * spread, 2.0 * height, -0.4 * spread] },
      { id: 'mentality', label: 'Mindset', value: stats.mentality.final.split(/[\\s\\n(]/)[0], pos: [1.0 * spread, 1.5 * height, 0.6 * spread] },
      { id: 'direction', label: 'Direction', value: stats.direction.final.split(/[\\s\\n(]/)[0], pos: [-1.1 * spread, 1.3 * height, -0.7 * spread] },
      { id: 'motivation', label: 'Motivation', value: stats.motivation.final.split(/[\\s\\n(]/)[0], pos: [0.9 * spread, 0.8 * height, 0.8 * spread] },
      { id: 'social', label: 'Social', value: stats.social.final.split(/[\\s\\n(]/)[0], pos: [-0.8 * spread, 0.4 * height, 0.5 * spread] },
    ];
  }, [stats, settings.spread, settings.height]);

  // Apply clay material
  React.useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = CLAY_MATERIAL;
      }
    });
    // Trigger onLoaded after material and initial state is ready
    onLoaded();
  }, [model, onLoaded]);

  return (
    <group>
      <group scale={normalization.scale} position={normalization.offset}>
        <primitive object={model} />
      </group>
      
      <AnimatePresence>
        {showStats && telemetryPoints.map((point) => (
          <TelemetryLabel 
            key={point.id}
            label={point.label}
            value={point.value}
            position={point.pos as [number, number, number]}
            settings={settings}
          />
        ))}
      </AnimatePresence>
    </group>
  );
};

const Placeholder = ({ text, onLoaded }: { text: string; onLoaded: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onLoaded, 500);
    return () => clearTimeout(timer);
  }, [onLoaded]);

  return (
    <mesh material={CLAY_MATERIAL} castShadow>
      <torusKnotGeometry args={[0.5, 0.15, 128, 32]} />
    </mesh>
  );
};

export default function ModelViewer({ url, fallbackUrl, onLoaded, onError, stats, showStats, settings }: ModelProps) {
  const [activeUrl, setActiveUrl] = React.useState(url);
  const [didFallback, setDidFallback] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);
  const debugEnabled = React.useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).has('debug');
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    setActiveUrl(url);
    setDidFallback(false);
  }, [url]);

  // If the chosen URL stalls (common when a domain is blocked), fall back after a short timeout.
  React.useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const hasFallback = !!fallbackUrl && fallbackUrl !== '' && fallbackUrl !== activeUrl;
    if (!activeUrl || didFallback || !hasFallback) return;

    timeoutRef.current = window.setTimeout(() => {
      setDidFallback(true);
      setActiveUrl(fallbackUrl!);
    }, 8000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activeUrl, didFallback, fallbackUrl]);

  const handleBoundaryError = React.useCallback((msg: string) => {
    const hasFallback = !!fallbackUrl && fallbackUrl !== '' && fallbackUrl !== activeUrl;
    if (!didFallback && hasFallback) {
      setDidFallback(true);
      setActiveUrl(fallbackUrl!);
      return;
    }
    onError?.(msg);
  }, [activeUrl, didFallback, fallbackUrl, onError]);

  return (
    <div className="w-full h-full relative bg-transparent">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[0, 1.5, 6]} fov={30} />
        
        {/* Multi-directional lighting setup for maximum brightness & clarity */}
        <ambientLight intensity={0.8} />
        <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#b0a8ff" />
        
        {/* Main Key Light (Front Right) */}
        <directionalLight 
          position={[5, 8, 5]} 
          intensity={1.8} 
          castShadow 
          shadow-mapSize={2048}
        />
        
        {/* Fill Light (Front Left) */}
        <directionalLight 
          position={[-5, 5, 5]} 
          intensity={1.2} 
          color="#fdfaff"
        />
        
        {/* Rim Light (Back Top) */}
        <spotLight 
          position={[0, 10, -5]} 
          angle={0.4} 
          penumbra={1} 
          intensity={3} 
          color="#ffffff"
        />

        {/* Bottom Uplight to remove dark spots */}
        <pointLight position={[0, -5, 2]} intensity={0.6} color="#ffffff" />
        
        {/* Top Down tight light */}
        <pointLight position={[0, 12, 0]} intensity={1.5} distance={25} />
        
        <Suspense fallback={<ModelLoadingIndicator />}>
          <ModelErrorBoundary onError={handleBoundaryError} resetKey={activeUrl}>
            <group position={[0, -0.6, 0]}>
              {activeUrl ? (
                <FBXModel url={activeUrl} onLoaded={onLoaded} stats={stats} showStats={showStats} settings={settings} onError={onError} />
              ) : (
                <Placeholder text="No Model" onLoaded={() => {}} />
              )}
            </group>
          </ModelErrorBoundary>

          {debugEnabled && (
            <Html fullscreen>
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[10px] text-white/70">
                <div>source: {activeUrl || '(empty)'}</div>
                <div>fallback: {didFallback ? 'yes' : 'no'}</div>
              </div>
            </Html>
          )}
          <ContactShadows 
            resolution={1024} 
            scale={20} 
            blur={3} 
            opacity={0.4} 
            far={10} 
            color="#7b74c2" 
            position={[0, -1.2, 0]}
          />
        </Suspense>

        <OrbitControls 
          enablePan={true} 
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.DOLLY
          }}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
          }}
          enableZoom={true} 
          minDistance={2} 
          maxDistance={12}
          autoRotate={!!url} 
          autoRotateSpeed={0.8}
          makeDefault
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 1.75}
        />
      </Canvas>
    </div>
  );
}
