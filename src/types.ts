
export interface ModelStats {
  gender: 'Female' | 'Male';
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
  stats?: ModelStats;
  url: string | null;
  type: 'fbx' | null;
}
