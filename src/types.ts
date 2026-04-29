
export interface ModelStats {
  gender: string;
  age: number;
  mentality: { initial: string; final: string };
  direction: { initial: string; final: string };
  motivation: { initial: string; final: string };
  social: { initial: string; final: string };
  description: string;
}

export interface TelemetrySettings {
  fontSize: number;
  spread: number;
  height: number;
}

export interface SlotConfig {
  id: string;
  title: string;
  description: string;
  modelPath: string;
  /**
   * Local (same-origin) fallback model URL. Not intended to be persisted to Firestore.
   */
  fallbackUrl?: string;
  stats?: ModelStats;
  url: string | null;
  type: 'fbx' | null;
  updatedAt?: any;
}
