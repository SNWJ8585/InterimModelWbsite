import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Upload, RotateCw, LogIn, 
  Save, Activity, Users, Info 
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { updateSlot } from '../lib/firebase';
import { SlotConfig, TelemetrySettings } from '../types';
import { normalizeUrl } from '../lib/utils';

interface UIOverlayProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
  hasUrl: boolean;
  selectedSlot: number;
  setSelectedSlot: (val: number) => void;
  user: FirebaseUser | null;
  isLoginInProgress: boolean;
  onLogin: () => void;
  currentSlot: SlotConfig;
  allSlots: SlotConfig[];
  isStatsVisible: boolean;
  setIsStatsVisible: (visible: boolean) => void;
  telemetrySettings: TelemetrySettings;
  setTelemetrySettings: (settings: TelemetrySettings) => void;
}

export default function UIOverlay({ 
  onFileUpload, 
  isLoading, 
  error, 
  hasUrl,
  selectedSlot,
  setSelectedSlot,
  user,
  isLoginInProgress,
  onLogin,
  currentSlot,
  allSlots,
  isStatsVisible,
  setIsStatsVisible,
  telemetrySettings,
  setTelemetrySettings,
}: UIOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const stats = currentSlot.stats;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-10 select-none z-10">
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={`header-${selectedSlot}`}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#a8a2e1] rounded-full" />
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
                {currentSlot.title}
              </h1>
            </div>
            <p className="max-w-md text-xs font-medium text-white/40 leading-relaxed pl-5">
              {currentSlot.description}
            </p>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-col gap-3 pointer-events-auto items-end group"
          initial={false}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          <motion.div 
            animate={{ 
              opacity: (isHeaderHovered || isSettingsOpen || isAdminPanelOpen) ? 1 : 0.7,
              x: (isHeaderHovered || isSettingsOpen || isAdminPanelOpen) ? 0 : 2,
              scale: (isHeaderHovered || isSettingsOpen || isAdminPanelOpen) ? 1 : 0.98
            }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="flex gap-2"
          >
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                if (isAdminPanelOpen) setIsAdminPanelOpen(false);
              }}
              className={`p-3 backdrop-blur-md rounded-xl border shadow-xl transition-colors ${isSettingsOpen ? 'bg-[#a8a2e1]/40 border-[#a8a2e1]/60' : 'bg-white/5 border-white/10 opacity-80'}`}
              title="Telemetry controls"
            >
              <Settings className={`w-5 h-5 ${isSettingsOpen ? 'text-white' : 'text-white/60'}`} />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsStatsVisible(!isStatsVisible)}
              className={`p-3 backdrop-blur-md rounded-xl border shadow-xl transition-colors ${isStatsVisible ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/10 opacity-60'}`}
              title={isStatsVisible ? "Hide telemetry" : "Show telemetry"}
            >
              <Activity className={`w-5 h-5 ${isStatsVisible ? 'text-white' : 'text-white/40'}`} />
            </motion.button>

            {!user ? (
              <motion.button 
                whileHover={isLoginInProgress ? {} : { scale: 1.05 }}
                whileTap={isLoginInProgress ? {} : { scale: 0.95 }}
                onClick={onLogin}
                disabled={isLoginInProgress}
                className={`px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 shadow-xl flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest ${isLoginInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoginInProgress ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {isLoginInProgress ? 'Checking...' : 'Login'}
              </motion.button>
            ) : (
              <div className="flex gap-2">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsAdminPanelOpen(!isAdminPanelOpen);
                    if (isSettingsOpen) setIsSettingsOpen(false);
                  }}
                  className={`p-3 backdrop-blur-md rounded-xl border shadow-xl transition-colors ${isAdminPanelOpen ? 'bg-purple-600/40 border-purple-400' : 'bg-white/10 border-white/20'}`}
                  title="Admin panel"
                >
                  <Users className="w-5 h-5 text-white" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 shadow-xl"
                  title="Upload model"
                >
                  <Upload className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            )}
          </motion.div>
          
          <motion.div
            animate={{ 
              opacity: (isHeaderHovered || isSettingsOpen || isAdminPanelOpen) ? 1 : 0,
              y: (isHeaderHovered || isSettingsOpen || isAdminPanelOpen) ? 0 : 5
            }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {user && (
              <span className="text-[10px] text-white/40 font-mono">Operator: {user.uid.slice(0, 8)}</span>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Middle Content - Stats removed from here, moving to 3D */}
      <div className="flex justify-center items-center h-full pointer-events-none">
        {/* Placeholder for center content if needed */}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".fbx"
        className="hidden" 
      />

      {/* Admin Interface */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="absolute top-24 right-10 w-80 bg-slate-900/90 backdrop-blur-3xl rounded-3xl p-8 shadow-2xl pointer-events-auto border border-white/10 flex flex-col gap-8 text-white z-20"
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-black text-[#a8a2e1] uppercase tracking-widest text-[10px]">Telemetry settings</span>
                <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Visual tuning</span>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-white/40 hover:text-white font-bold">×</button>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Data density</label>
                <span className="text-[11px] font-mono text-[#a8a2e1] font-bold">{Math.round(telemetrySettings.spread * 100)}%</span>
              </div>
              <div className="relative h-6 flex items-center px-1">
                <input 
                  type="range" 
                  min="0.2" 
                  max="2" 
                  step="0.05"
                  value={telemetrySettings.spread}
                  onChange={(e) => setTelemetrySettings({ ...telemetrySettings, spread: parseFloat(e.target.value) })}
                  className="w-full accent-[#a8a2e1] bg-white/10 h-2 rounded-full appearance-none cursor-pointer touch-none hover:bg-white/20 transition-colors"
                />
              </div>
              <div className="flex justify-between px-2 text-[8px] text-white/20 font-black uppercase tracking-tighter">
                <span>Tight</span>
                <span>Loose</span>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Vertical offset</label>
                <span className="text-[11px] font-mono text-[#a8a2e1] font-bold">{Math.round(telemetrySettings.height * 100)}%</span>
              </div>
              <div className="relative h-6 flex items-center px-1">
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.5" 
                  step="0.05"
                  value={telemetrySettings.height}
                  onChange={(e) => setTelemetrySettings({ ...telemetrySettings, height: parseFloat(e.target.value) })}
                  className="w-full accent-[#a8a2e1] bg-white/10 h-2 rounded-full appearance-none cursor-pointer touch-none hover:bg-white/20 transition-colors"
                />
              </div>
              <div className="flex justify-between px-2 text-[8px] text-white/20 font-black uppercase tracking-tighter">
                <span>Compress</span>
                <span>Raise</span>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Label scale</label>
                <span className="text-[11px] font-mono text-[#a8a2e1] font-bold">{Math.round(telemetrySettings.fontSize * 100)}%</span>
              </div>
              <div className="relative h-6 flex items-center px-1">
                <input 
                  type="range" 
                  min="0.3" 
                  max="3" 
                  step="0.1"
                  value={telemetrySettings.fontSize}
                  onChange={(e) => setTelemetrySettings({ ...telemetrySettings, fontSize: parseFloat(e.target.value) })}
                  className="w-full accent-[#a8a2e1] bg-white/10 h-2 rounded-full appearance-none cursor-pointer touch-none hover:bg-white/20 transition-colors"
                />
              </div>
              <div className="flex justify-between px-2 text-[8px] text-white/20 font-black uppercase tracking-tighter">
                <span>Min</span>
                <span>Max</span>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3 text-[#a8a2e1]" />
                <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Tip</span>
              </div>
              <p className="text-[9px] leading-relaxed text-white/40 font-medium">
                Adjusting density changes how telemetry points cluster around the model core.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Remote model URI</label>
                <input 
                  id={`settings-path-${selectedSlot}`}
                  key={`settings-path-${selectedSlot}`}
                  defaultValue={currentSlot.modelPath}
                  placeholder="Paste an .fbx direct URL or local path..."
                  className="w-full px-4 py-3 bg-white/10 rounded-xl font-mono text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-[#a8a2e1]/40 border border-white/5"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "rgba(168, 162, 225, 0.6)" }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  const inputPath = (document.getElementById(`settings-path-${selectedSlot}`) as HTMLInputElement)?.value;
                  const path = inputPath?.trim() || '';
                  
                  if (!user) {
                    alert('Please log in to save permanently. Preview updated for this session only.');
                    return;
                  }

                  try {
                    await updateSlot({ ...currentSlot, modelPath: path });
                    alert('Upload succeeded.');
                  } catch (e) {
                    alert('Upload rejected (insufficient permissions).');
                  }
                }}
                className="w-full py-3 bg-[#a8a2e1]/40 hover:bg-[#a8a2e1]/60 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-[#a8a2e1]/30"
              >
                <Save className="w-4 h-4" />
                Apply URI override
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminPanelOpen && user && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-24 right-10 w-80 bg-white/95 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl pointer-events-auto border border-white/20 flex flex-col gap-6"
          >
            <div className="flex justify-between items-center text-slate-800">
              <span className="font-black text-[#a8a2e1] uppercase tracking-widest text-xs">Slot {selectedSlot} data</span>
              <button onClick={() => setIsAdminPanelOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Name</label>
              <input 
                id={`slot-title-${selectedSlot}`}
                defaultValue={currentSlot.title}
                className="w-full px-5 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#a8a2e1]/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Source URI (.fbx URL or local path)</label>
              <input 
                id={`slot-path-${selectedSlot}`}
                key={`path-${selectedSlot}-${currentSlot.modelPath}`}
                defaultValue={currentSlot.modelPath}
                placeholder="https://example.com/model.fbx"
                className="w-full px-5 py-3 bg-slate-100 rounded-xl font-mono text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#a8a2e1]/20"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                const title = (document.getElementById(`slot-title-${selectedSlot}`) as HTMLInputElement)?.value;
                const inputPath = (document.getElementById(`slot-path-${selectedSlot}`) as HTMLInputElement)?.value;
                const path = inputPath?.trim() || '';

                try {
                  await updateSlot({
                    ...currentSlot,
                    title: title || currentSlot.title,
                    modelPath: path
                  });
                  alert('Synced to cloud.');
                } catch (e) {
                  alert('Authorization failed.');
                }
              }}
              className="mt-2 w-full py-4 bg-[#a8a2e1] hover:bg-[#9790d1] text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
            >
              <Save className="w-5 h-5" />
              Submit changes
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal Nav - Responsive Auto Layout */}
      <div className="absolute bottom-10 left-10 right-10 flex flex-wrap justify-center gap-3 pointer-events-auto max-h-[30vh] overflow-y-auto pr-2 scrollbar-hide">
        {allSlots.map((slot, index) => {
          const slotNum = index + 1;
          const isActive = selectedSlot === slotNum;
          const shortTitle = slot.title || `Entity ${slotNum}`;
          
          return (
            <motion.button
              key={slot.id}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedSlot(slotNum)}
              className={`flex-shrink-0 min-w-[120px] px-6 py-4 rounded-2xl border transition-all duration-500 flex flex-col items-center justify-center gap-0.5
                ${isActive 
                  ? 'bg-white shadow-[0_15px_30px_-5px_rgba(168,162,225,0.3)] border-white' 
                  : 'bg-white/10 backdrop-blur-md border-white/10 hover:bg-white/20 text-white/60'
                }`}
            >
              <span className={`text-[8px] font-black uppercase tracking-[.2em] ${isActive ? 'text-[#a8a2e1]' : 'text-white/30'}`}>
                Item {slotNum}
              </span>
              <span className={`text-xs font-black truncate max-w-[100px] ${isActive ? 'text-slate-900' : 'text-white'}`}>
                {shortTitle}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Visual Messaging */}
      <AnimatePresence>
        {(error || isLoading) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-44 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            {error && (
              <div className="px-8 py-5 bg-red-600/90 backdrop-blur-2xl text-white rounded-[2rem] shadow-3xl flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{error}</span>
              </div>
            )}
            {isLoading && !error && (
              <div className="px-8 py-5 bg-white/95 backdrop-blur-2xl text-slate-900 rounded-[2rem] shadow-3xl flex items-center gap-4 border border-white/40">
                <RotateCw className="w-5 h-5 animate-spin text-[#a8a2e1]" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Materializing...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export {} // End of file
