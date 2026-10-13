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
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-700/70 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl">
      {/* Mic & Headphones */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} className="animate-pulse" />}
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
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer ${
            isDeafened
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
          }`}
          title={isDeafened ? 'Undeafen headphones' : 'Deafen (mute all peers & ambience)'}
        >
          {isDeafened ? <VolumeX size={16} /> : <Headphones size={16} />}
          <span>{isDeafened ? 'Deafened' : 'Listening'}</span>
        </button>
      </div>

      {/* Hearing Radius Preset Selector */}
      <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
        <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
          <Radio size={13} className="text-cyan-400" /> Radius:
        </span>
        {Object.entries(WORLD_CONFIG.earshotPresets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => setEarshotPreset(key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              earshotPreset === key
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title={preset.desc}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Calm Office & Meeting Quick Amenities */}
      <div className="flex items-center gap-2">
        {/* Ambient Window Rain / Garden Breeze Audio */}
        <button
          onClick={() => setAmbientSoundEnabled(!ambientSoundEnabled)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            ambientSoundEnabled
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle procedural outdoor soundscape (rain & garden breeze through open windows)"
        >
          <CloudRain size={14} className={ambientSoundEnabled ? 'animate-bounce' : ''} />
          <span>{ambientSoundEnabled ? 'Rain Ambience' : 'Ambience Off'}</span>
        </button>

        {/* Meeting Table Join/Leave */}
        <button
          onClick={onSitAtTable}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isSeated
              ? 'bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/25'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
          title="Sit or leave the Executive Boardroom meeting table"
        >
          <Users size={14} />
          <span>{isSeated ? 'Leave Table' : 'Join Table'}</span>
        </button>

        {/* Barista Coffee Brewing */}
        <button
          onClick={onBrewCoffee}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-semibold transition-all shadow-sm cursor-pointer"
          title="Brew fresh espresso at the artisan barista station"
        >
          <Coffee size={14} />
          <span>Brew Coffee</span>
        </button>

        {/* Spatial Audio Ping Test */}
        <button
          onClick={onTestAudioBeep}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          title="Audition 3D spatial panning & distance volume"
        >
          <Sparkles size={14} className="text-cyan-400" />
          <span>Test 3D Audio</span>
        </button>

        <button
          onClick={onResetPositions}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
          title="Reset player to Boardroom entrance"
        >
          <RotateCcw size={15} />
        </button>

        <button
          onClick={onOpenSOPModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
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
