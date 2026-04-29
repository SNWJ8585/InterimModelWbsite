import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useFBX, PerspectiveCamera, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Compass, TrendingUp, Users, ChevronRight } from 'lucide-react';
import { ModelStats, TelemetrySettings } from '../types';

interface ModelProps {
  url: string;
  onLoaded: () => void;
  onError?: (reason: string) => void;
  stats?: ModelStats;
  showStats?: boolean;
  settings: TelemetrySettings;
}

const ErrorDisplay = ({ message }: { message: string }) => (
  <Html center>
    <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/40 p-6 rounded-2xl text-center max-w-xs shadow-2xl">
      <div className="w-12 h-12 bg-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
        <Activity className="text-red-400 w-6 h-6" />
      </div>
      <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2">Model Link Failure</h3>
      <p className="text-red-200/70 text-[10px] leading-relaxed mb-4">
        {message.includes('404') 
          ? "The requested neural map was not found. Please upload the .fbx file named exactly as shown below to the project's models folder."
          : message}
      </p>
      <div className="text-[10px] font-mono text-white/40 bg-black/20 p-2 rounded border border-white/5 break-all">
        MISSING_FILE: {message.split('/').pop()?.split('?')[0] || "Unknown"}
      </div>
    </div>
  </Html>
);

class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: string) => void },
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

const FBXModel = ({ url, onLoaded, stats, showStats, settings }: { url: string; onLoaded: () => void; stats?: ModelStats; showStats?: boolean; settings: TelemetrySettings }) => {
  const fbx = useFBX(url);
  
  // Normalize model scale and offset on load to ensure consistent display
  const { model, normalization } = React.useMemo(() => {
    const cloned = fbx.clone();
    
    // Compute bounding box
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Target height around 2.4 units for a standard human scale framing
    const targetScale = 2.4 / (size.y || 1);
    
    return {
      model: cloned,
      normalization: {
        scale: targetScale,
        offset: [
          -center.x * targetScale,
          -box.min.y * targetScale, // Stand precisely on the ground plane
          -center.z * targetScale
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
      { id: 'gender', label: 'Identity', value: stats.gender, pos: [-0.8 * spread, 2.2 * height, 0.4 * spread] }, // Near head
      { id: 'age', label: 'Chronology', value: stats.age.toString(), pos: [0.8 * spread, 2.0 * height, -0.4 * spread] }, // Near shoulder
      { id: 'mentality', label: 'Mentality', value: stats.mentality.final.split(/[\s\n(]/)[0], pos: [1.0 * spread, 1.5 * height, 0.6 * spread] }, // Mid torso
      { id: 'direction', label: 'Direction', value: stats.direction.final.split(/[\s\n(]/)[0], pos: [-1.1 * spread, 1.3 * height, -0.7 * spread] }, // Waist
      { id: 'motivation', label: 'Motivation', value: stats.motivation.final.split(/[\s\n(]/)[0], pos: [0.9 * spread, 0.8 * height, 0.8 * spread] }, // Hips/Thighs
      { id: 'social', label: 'Social', value: stats.social.final.split(/[\s\n(]/)[0], pos: [-0.8 * spread, 0.4 * height, 0.5 * spread] }, // Knees
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

export default function ModelViewer({ url, onLoaded, onError, stats, showStats, settings }: ModelProps) {
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
        
        <Suspense fallback={null}>
          <ModelErrorBoundary onError={onError || (() => {})}>
            <group position={[0, -0.6, 0]}>
              {url ? (
                <FBXModel url={url} onLoaded={onLoaded} stats={stats} showStats={showStats} settings={settings} />
              ) : (
                <Placeholder text="No Model" onLoaded={() => {}} />
              )}
            </group>
          </ModelErrorBoundary>
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
