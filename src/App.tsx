/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import ModelViewer from './components/ModelViewer';
import UIOverlay from './components/UIOverlay';
import { auth, googleProvider, subscribeToSlots, testConnection, updateSlot, uploadModel } from './lib/firebase';
import { normalizeUrl } from './lib/utils';
import { SlotConfig, TelemetrySettings } from './types';

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const DEFAULT_SLOTS: SlotConfig[] = [
  {
    id: '1',
    url: '/models/NO2FBX.fbx',
    type: 'fbx',
    title: 'Neural Pivot 01',
    description: 'Early structural adaptation stage; neural connections are being established.',
    modelPath: '/models/NO2FBX.fbx',
    fallbackUrl: '/models/NO2FBX.fbx',
    stats: {
      gender: 'Female',
      age: 28,
      mentality: { initial: '0.1', final: '0.4' },
      direction: { initial: '0.5', final: '0.8' },
      motivation: { initial: '0.6', final: '0.9' },
      social: { initial: '0.2', final: '0.5' },
      description: 'Model NO2FBX - Initial adaptation',
    },
  },
  {
    id: '2',
    url: '/models/NO4FBX.fbx',
    type: 'fbx',
    title: 'Neural Pivot 02',
    description: 'Secondary refinement and growth; system stability improves.',
    modelPath: '/models/NO4FBX.fbx',
    fallbackUrl: '/models/NO4FBX.fbx',
    stats: {
      gender: 'Male',
      age: 32,
      mentality: { initial: '0.3', final: '0.6' },
      direction: { initial: '0.4', final: '0.7' },
      motivation: { initial: '0.5', final: '0.8' },
      social: { initial: '0.3', final: '0.6' },
      description: 'Model NO4FBX - Refinement stage',
    },
  },
  {
    id: '3',
    url: '/models/NO5FBX.fbx',
    type: 'fbx',
    title: 'Neural Pivot 03',
    description: 'Integration peak; the neural network reaches high synergy.',
    modelPath: '/models/NO5FBX.fbx',
    fallbackUrl: '/models/NO5FBX.fbx',
    stats: {
      gender: 'Female',
      age: 38,
      mentality: { initial: '0.5', final: '0.8' },
      direction: { initial: '0.6', final: '0.9' },
      motivation: { initial: '0.7', final: '0.95' },
      social: { initial: '0.5', final: '0.75' },
      description: 'Model NO5FBX - Integration peak',
    },
  },
  {
    id: '4',
    url: '/models/NO8FBX.fbx',
    type: 'fbx',
    title: 'Neural Pivot 04',
    description: 'Framework stabilizes; the system enters long-term operation.',
    modelPath: '/models/NO8FBX.fbx',
    fallbackUrl: '/models/NO8FBX.fbx',
    stats: {
      gender: 'Male',
      age: 45,
      mentality: { initial: '0.7', final: '0.9' },
      direction: { initial: '0.8', final: '0.95' },
      motivation: { initial: '0.6', final: '0.8' },
      social: { initial: '0.7', final: '0.85' },
      description: 'Model NO8FBX - Consolidation stage',
    },
  },
  {
    id: '5',
    url: '/models/NO9FBX.fbx',
    type: 'fbx',
    title: 'Neural Pivot 05',
    description: 'Long-term balance and accumulated experience yield high stability.',
    modelPath: '/models/NO9FBX.fbx',
    fallbackUrl: '/models/NO9FBX.fbx',
    stats: {
      gender: 'Female',
      age: 55,
      mentality: { initial: '0.85', final: '0.98' },
      direction: { initial: '0.9', final: '1.0' },
      motivation: { initial: '0.5', final: '0.7' },
      social: { initial: '0.8', final: '0.95' },
      description: 'Model NO9FBX - Mature balance',
    },
  },
];

export default function App() {
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [user, setUser] = useState<User | null>(null);
  const [slots, setSlots] = useState<SlotConfig[]>(DEFAULT_SLOTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [telemetrySettings, setTelemetrySettings] = useState<TelemetrySettings>({
    fontSize: 0.8,
    spread: 0.6,
    height: 1.0,
  });

  const loadingTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentWindow = window as IdleWindow;
    const enableCloudSync = () => setIsCloudSyncEnabled(true);

    if (currentWindow.requestIdleCallback) {
      const idleId = currentWindow.requestIdleCallback(enableCloudSync, { timeout: 3000 });
      return () => currentWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(enableCloudSync, 1500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isCloudSyncEnabled) return;

    testConnection();
    const unsubscribe = subscribeToSlots((fbSlots) => {
      console.log(`Neural Uplink: Received ${fbSlots.length} components.`);
      setSlots(prevSlots => {
        const nextSlots = [...prevSlots];

        fbSlots.forEach(slot => {
          let index = nextSlots.findIndex(item => item.id === slot.id);
          if (index === -1) {
            const numericId = slot.id.match(/\d+/)?.[0];
            if (numericId) index = parseInt(numericId, 10) - 1;
          }

          if (index < 0 || index >= nextSlots.length) return;

          const existing = nextSlots[index];
          const rawPath = slot.modelPath || '';
          const remotePath = normalizeUrl(rawPath);
          const shouldKeepLocal =
            typeof existing.url === 'string' &&
            existing.url.startsWith('/models/') &&
            typeof remotePath === 'string' &&
            remotePath.startsWith('http');

          nextSlots[index] = {
            ...existing,
            title: slot.title || existing.title,
            description: slot.description || existing.description,
            modelPath: rawPath,
            fallbackUrl: existing.fallbackUrl || existing.url || existing.modelPath,
            url: existing.url?.startsWith('blob:')
              ? existing.url
              : (shouldKeepLocal ? existing.url : remotePath),
            stats: slot.stats ? { ...existing.stats, ...slot.stats } : existing.stats,
            type: slot.type || existing.type || 'fbx',
          };
        });

        return nextSlots;
      });
    });

    const unauth = onAuthStateChanged(auth, (nextUser) => setUser(nextUser));

    return () => {
      unsubscribe();
      unauth();
    };
  }, [isCloudSyncEnabled]);

  useEffect(() => {
    setError(null);
    setIsLoading(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
  }, [selectedSlot]);

  const handleLogin = async () => {
    if (isLoginInProgress) return;

    setIsLoginInProgress(true);
    setError(null);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please allow popups for this site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Login was interrupted. Please try again.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'An error occurred during login.');
      }
    } finally {
      setIsLoginInProgress(false);
    }
  };

  const handleFileUpload = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);

    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileSizeInMB = file.size / (1024 * 1024);

    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    loadingTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setError('Loading took too long. The file might be too large or corrupted.');
    }, 45000);

    if (fileSizeInMB > 150) {
      setError(`File is too large (${Math.round(fileSizeInMB)}MB). Max 150MB.`);
      setIsLoading(false);
      return;
    }

    if (extension !== 'fbx') {
      setError(`Unsupported file type: .${extension}. Please use .fbx.`);
      setIsLoading(false);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      return;
    }

    const currentSlot = slots[selectedSlot - 1];

    const performUpload = async () => {
      try {
        const downloadUrl = await uploadModel(file, currentSlot.id);

        await updateSlot({
          ...currentSlot,
          modelPath: downloadUrl,
        });

        const nextSlots = [...slots];
        nextSlots[selectedSlot - 1] = {
          ...nextSlots[selectedSlot - 1],
          url: downloadUrl,
          modelPath: downloadUrl,
          type: 'fbx',
        };
        setSlots(nextSlots);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err.message || 'Upload failed. Make sure Storage is activated in Firebase Console.');
        setIsLoading(false);
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      }
    };

    void performUpload();
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
      <div className="absolute inset-0">
        <ModelViewer
          url={currentSlotPayload.url || ''}
          fallbackUrl={currentSlotPayload.fallbackUrl || ''}
          onLoaded={handleModelLoaded}
          onError={handleModelError}
          stats={currentSlotPayload.stats}
          showStats={isStatsVisible}
          settings={telemetrySettings}
        />
      </div>

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

      <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-white/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-purple-300/20 blur-[100px] pointer-events-none" />
    </main>
  );
}
