/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import ModelViewer from './components/ModelViewer';
import UIOverlay from './components/UIOverlay';
import { subscribeToSlots, auth, googleProvider, testConnection } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { SlotConfig, ModelStats, TelemetrySettings } from './types';

export default function App() {
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [user, setUser] = useState<User | null>(null);

  const [slots, setSlots] = useState<SlotConfig[]>([
    { 
      id: '1',
      url: null, 
      type: 'fbx', 
      title: 'Pressure Pivot',
      description: 'The moment of intense structural adaptation.',
      modelPath: '',
      stats: {
        gender: 'Female',
        age: 34,
        mentality: { initial: '-0.1', final: '0.1' },
        direction: { initial: '0.75', final: '1.0' },
        motivation: { initial: '0.4', final: '0.8' },
        social: { initial: '-0.3', final: '-0.1' },
        description: 'High Pressure Turning Point'
      }
    },
    { 
      id: '2',
      url: null, 
      type: 'fbx', 
      title: 'Crisis Threshold',
      description: 'Navigating the shadowed boundary of mid-life.',
      modelPath: '',
      stats: {
        gender: 'Male',
        age: 36,
        mentality: { initial: '-0.45', final: '-0.2' },
        direction: { initial: '0.85', final: '-0.4' },
        motivation: { initial: '0.2', final: '-0.2' },
        social: { initial: '-0.5', final: '-0.2' },
        description: 'Early Mid-life Crisis'
      }
    },
    { 
      id: '3',
      url: null, 
      type: 'fbx', 
      title: 'Resilient Core',
      description: 'The foundation of central strength and stability.',
      modelPath: '',
      stats: {
        gender: 'Female',
        age: 42,
        mentality: { initial: '0.55', final: '0.9' },
        direction: { initial: '0.9', final: '1.0' },
        motivation: { initial: '0.6', final: '0.6' },
        social: { initial: '0.45', final: '0.5' },
        description: 'Backbone Strength'
      }
    },
    { 
      id: '4',
      url: null, 
      type: 'fbx', 
      title: 'Golden Horizon',
      description: 'Transitioning towards a state of seasoned equilibrium.',
      modelPath: '',
      stats: {
        gender: 'Male',
        age: 58,
        mentality: { initial: '0.75', final: '0.85' },
        direction: { initial: '0.5', final: '1.0' },
        motivation: { initial: '0.4', final: '0.6' },
        social: { initial: '0.65', final: '0.7' },
        description: 'Pre-retirement Transition'
      }
    },
    { 
      id: '5',
      url: null, 
      type: 'fbx', 
      title: 'Evergreen Vitality',
      description: 'The harmonious dance of experience and joy.',
      modelPath: '',
      stats: {
        gender: 'Female',
        age: 65,
        mentality: { initial: '0.9', final: '0.95' },
        direction: { initial: '0.3', final: '0.1' },
        motivation: { initial: '0.25', final: '0.0' },
        social: { initial: '0.8', final: '0.9' },
        description: 'Late Life Vitality'
      }
    },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync with Firebase
  useEffect(() => {
    testConnection();
    const unsubscribe = subscribeToSlots((fbSlots) => {
      setSlots(prevSlots => {
        const newSlots = [...prevSlots];
        fbSlots.forEach(s => {
          const index = parseInt(s.id) - 1;
          if (index >= 0 && index < 5) {
            // Keep local upload url if it exists, otherwise use remote
            newSlots[index] = { 
              ...newSlots[index],
              url: newSlots[index].url || s.modelPath,
              title: s.title || newSlots[index].title,
              // Merge stats if they come from firebase, though they are usually fixed in App.tsx
            };
          }
        });
        return newSlots;
      });
    });

    const unauth = onAuthStateChanged(auth, (u) => setUser(u));

    return () => {
      unsubscribe();
      unauth();
    };
  }, []);

  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [telemetrySettings, setTelemetrySettings] = useState<TelemetrySettings>({
    fontSize: 0.8, // Default smaller as requested
    spread: 0.6,   // Default more concentrated as requested
    height: 1.0,   // Default height
  });

  const handleLogin = async () => {
    if (isLoginInProgress) return;
    setIsLoginInProgress(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError("Popup blocked by browser. Please allow popups for this site.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // This can happen if another popup was opened or the previous one didn't finish
        setError("Login was interrupted. Please try again.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Don't necessarily show a big error for user-initiated close, but maybe a toast
        console.log('User closed the login popup.');
      } else {
        setError(err.message || "An error occurred during login.");
      }
    } finally {
      setIsLoginInProgress(false);
    }
  };

  // Clear error and loading when switching slots
  useEffect(() => {
    setError(null);
    setIsLoading(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
  }, [selectedSlot]);

  const handleFileUpload = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileSizeInMB = file.size / (1024 * 1024);

    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    
    loadingTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setError("Loading took too long. The file might be too large or corrupted.");
    }, 45000); 

    if (fileSizeInMB > 150) {
      setError(`File is too large (${Math.round(fileSizeInMB)}MB). Max 150MB.`);
      setIsLoading(false);
      return;
    }
    
    if (extension === 'fbx') {
      try {
        const url = URL.createObjectURL(file);
        const newSlots = [...slots];
        newSlots[selectedSlot - 1] = { 
          ...newSlots[selectedSlot - 1],
          url, 
          type: 'fbx' 
        };
        setSlots(newSlots);
      } catch (err) {
        setError("Failed to create file URL.");
        setIsLoading(false);
      }
    } else {
      setError(`Unsupported file type: .${extension}. Please use .fbx.`);
      setIsLoading(false);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    }
  }, [selectedSlot, slots]);

  const handleModelLoaded = useCallback(() => {
    setIsLoading(false);
    setError(null);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, []);

  const handleModelError = useCallback((reason: string) => {
    setIsLoading(false);
    setError(reason);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, []);

  const currentSlotPayload = slots[selectedSlot - 1];

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <ModelViewer 
          url={currentSlotPayload.url || ''} 
          onLoaded={handleModelLoaded}
          onError={handleModelError}
          stats={currentSlotPayload.stats}
          showStats={isStatsVisible}
          settings={telemetrySettings}
        />
      </div>

      {/* UI Overlay */}
      <UIOverlay 
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        error={error}
        hasUrl={!!currentSlotPayload.url}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        user={user}
        isLoginInProgress={isLoginInProgress}
        onLogin={handleLogin}
        currentSlot={currentSlotPayload}
        allSlots={slots}
        isStatsVisible={isStatsVisible}
        setIsStatsVisible={setIsStatsVisible}
        telemetrySettings={telemetrySettings}
        setTelemetrySettings={setTelemetrySettings}
      />

      {/* Soft background glow elements */}
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-white/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-300/20 blur-[100px] rounded-full pointer-events-none" />
    </main>
  );
}
