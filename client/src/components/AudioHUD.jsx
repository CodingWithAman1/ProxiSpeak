import React from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Coffee,
  CloudRain,
  Users,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { WORLD_CONFIG } from '../data/worldData';

export function AudioHUD({
  isMuted,
  setIsMuted,
  isDeafened,
  setIsDeafened,
  earshotPreset,
  setEarshotPreset,
  ambientSoundEnabled,
  setAmbientSoundEnabled,
  onSitAtTable,
  onBrewCoffee,
  onResetPositions,
  onTestAudioBeep,
  micDecibels,
  onOpenSOPModal,
  isSeated,
}) {
  return (
    <div className="glass-panel flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl shadow-2xl">
      {/* Mic & Headphones */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            isMuted
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 shadow-sm'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={15} /> : <Mic size={15} className="animate-pulse" />}
          <span>{isMuted ? 'Muted' : 'Mic Live'}</span>
          {!isMuted && (
            <div className="flex items-end gap-0.5 h-3 ml-1">
              <span
                className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(20, micDecibels * 100)}%` }}
              />
              <span
                className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(40, micDecibels * 120)}%` }}
              />
              <span
                className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(15, micDecibels * 80)}%` }}
              />
            </div>
          )}
        </button>

        <button
          onClick={() => setIsDeafened(!isDeafened)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            isDeafened
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
              : 'glass-card text-slate-200 hover:text-white hover:bg-slate-800/80'
          }`}
          title={isDeafened ? 'Undeafen headphones' : 'Deafen (mute all peers & ambience)'}
        >
          {isDeafened ? <VolumeX size={15} /> : <Headphones size={15} />}
          <span>{isDeafened ? 'Deafened' : 'Listening'}</span>
        </button>
      </div>

      {/* Hearing Radius Preset Selector */}
      <div className="flex items-center gap-1.5 glass-card px-2 py-1.5 rounded-xl">
        <span className="text-[11px] font-mono text-slate-400 px-1.5 flex items-center gap-1.5">
          <Radio size={13} className="text-cyan-400" /> Range:
        </span>
        {Object.entries(WORLD_CONFIG.earshotPresets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => setEarshotPreset(key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              earshotPreset === key
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title={preset.desc}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Calm Office Quick Amenities */}
      <div className="flex items-center gap-2">
        {/* Ambient Window Rain / Garden Breeze Audio */}
        <button
          onClick={() => setAmbientSoundEnabled(!ambientSoundEnabled)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            ambientSoundEnabled
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
              : 'glass-card text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle procedural outdoor soundscape (rain & garden breeze through open windows)"
        >
          <CloudRain size={14} className={ambientSoundEnabled ? 'animate-bounce' : ''} />
          <span>{ambientSoundEnabled ? 'Rain Ambience' : 'Ambience Off'}</span>
        </button>

        {/* Meeting Table Join/Leave */}
        <button
          onClick={onSitAtTable}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            isSeated
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-md shadow-purple-500/20'
              : 'glass-card text-slate-200 hover:text-white hover:bg-slate-800/80'
          }`}
          title="Sit or leave the Executive Boardroom meeting table"
        >
          <Users size={14} />
          <span>{isSeated ? 'Leave Table' : 'Join Table'}</span>
        </button>

        {/* Barista Coffee Brewing */}
        <button
          onClick={onBrewCoffee}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 text-xs font-semibold transition-all shadow-sm cursor-pointer"
          title="Brew fresh espresso at the artisan barista station"
        >
          <Coffee size={14} />
          <span>Brew Coffee</span>
        </button>

        {/* Spatial Audio Ping Test */}
        <button
          onClick={onTestAudioBeep}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-semibold transition-all cursor-pointer"
          title="Audition 3D spatial panning & distance volume"
        >
          <Sparkles size={14} className="text-cyan-400" />
          <span>Test 3D Audio</span>
        </button>

        <button
          onClick={onResetPositions}
          className="p-2 rounded-xl glass-card text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer"
          title="Reset player to Boardroom entrance"
        >
          <RotateCcw size={15} />
        </button>

        <button
          onClick={onOpenSOPModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          title="View Infotact SOP Guidelines & Review Milestones"
        >
          <FileText size={14} />
          <span>SOP v1.1</span>
        </button>
      </div>
    </div>
  );
}
export default AudioHUD;
