/**
 * SpatialAuditHUD — Real-time Acoustic & Geospatial Diagnostic Overlay
 * Visualizes distance falloff, low-pass filter cutoff frequencies, stereo azimuth, and occlusion.
 */
import React from 'react';

export function SpatialAuditHUD({ isOpen, onClose, activeAcoustics = new Map(), selfUser }) {
  if (!isOpen) return null;

  const entries = Array.from(activeAcoustics.entries());

  return (
    <div className="fixed bottom-24 right-6 z-40 w-96 max-h-[380px] bg-slate-950/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl shadow-2xl p-4 flex flex-col font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-emerald-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold tracking-wider uppercase text-[11px]">Acoustic Telemetry HUD</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white p-1 rounded transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Self Pos */}
      <div className="py-2 border-b border-slate-800/80 text-slate-400 text-[10px] flex justify-between">
        <span>LISTENER (YOU): [{selfUser?.x?.toFixed(1)}, {selfUser?.y?.toFixed(1)}]</span>
        <span>EARSHOT: {selfUser?.earshotRadius}m</span>
      </div>

      {/* Peers List */}
      <div className="flex-1 overflow-y-auto py-2 space-y-2.5">
        {entries.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-[11px]">
            No peers currently in earshot radius.
            <br />
            Walk closer to participants or spawn bots to view live acoustic telemetry.
          </div>
        ) : (
          entries.map(([peerId, profile]) => (
            <div
              key={peerId}
              className={`p-2.5 rounded-xl border ${
                profile.isOccluded
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5 font-bold text-[11px]">
                <span className="text-white">{profile.peerName || peerId}</span>
                <span className={profile.isOccluded ? 'text-amber-400' : 'text-emerald-400'}>
                  {profile.isOccluded ? 'OCCLUDED (WALL)' : 'LINE-OF-SIGHT'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400">
                <div>
                  Distance: <span className="text-slate-100">{profile.distance}m</span>
                </div>
                <div>
                  Gain: <span className="text-blue-400">{(profile.gain * 100).toFixed(0)}%</span>
                </div>
                <div>
                  Cutoff: <span className={profile.isOccluded ? 'text-amber-400 font-bold' : 'text-slate-100'}>{profile.cutoffFreq} Hz</span>
                </div>
                <div>
                  Stereo Pan: <span className="text-slate-100">{profile.pan > 0 ? `R +${profile.pan}` : `L ${profile.pan}`}</span>
                </div>
              </div>

              {/* Proximity volume bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    profile.isOccluded ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, profile.gain * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SpatialAuditHUD;
