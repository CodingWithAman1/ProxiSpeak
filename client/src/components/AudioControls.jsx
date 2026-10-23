/**
 * AudioControls — Floating Bottom Dock for ProxiSpeak
 * Controls mic mute, deafen, earshot radius, simulation bots, and diagnostics HUD.
 */
import React from 'react';

export function AudioControls({
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  earshotRadius,
  onChangeEarshotRadius,
  onSpawnBots,
  onClearBots,
  botCount = 0,
  showAuditHUD,
  onToggleAuditHUD,
  micLevel = 0,
}) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 px-5 py-3 rounded-2xl shadow-2xl shadow-black/80">
      {/* Microphone Toggle Button */}
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Unmute Microphone (M)' : 'Mute Microphone (M)'}
        className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
          isMuted
            ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30'
        }`}
      >
        {/* Dynamic mic level ring if speaking */}
        {!isMuted && micLevel > 0.05 && (
          <span
            className="absolute inset-0 rounded-xl border-2 border-blue-400 animate-ping opacity-60"
            style={{ transform: `scale(${1 + micLevel * 0.4})` }}
          />
        )}
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isMuted ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          )}
        </svg>
      </button>

      {/* Deafen Toggle Button */}
      <button
        onClick={onToggleDeafen}
        title={isDeafened ? 'Undeafen (D)' : 'Deafen Audio (D)'}
        className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
          isDeafened
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isDeafened ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M16 9l6 6m0-6l-6 6"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          )}
        </svg>
      </button>

      {/* Earshot Range Slider */}
      <div className="flex flex-col gap-1 px-3 py-1 bg-slate-800/60 rounded-xl border border-slate-800">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>EARSHOT RANGE</span>
          <span className="text-blue-400 font-semibold">{earshotRadius}m</span>
        </div>
        <input
          type="range"
          min="8"
          max="35"
          value={earshotRadius}
          onChange={(e) => onChangeEarshotRadius(Number(e.target.value))}
          className="w-28 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="w-[1px] h-8 bg-slate-800" />

      {/* Autonomous Bot Simulation Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onSpawnBots}
          title="Spawn autonomous acoustic bots to demo proximity voice and wall muffling"
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-xs font-semibold transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span>Spawn Bots</span>
        </button>

        {botCount > 0 && (
          <button
            onClick={onClearBots}
            title="Clear simulated bots"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Engineer Spatial HUD Toggle */}
      <button
        onClick={onToggleAuditHUD}
        title="Toggle Real-Time Acoustic & Spatial Diagnostics HUD"
        className={`p-2.5 rounded-xl border transition ${
          showAuditHUD
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </button>
    </div>
  );
}

export default AudioControls;
