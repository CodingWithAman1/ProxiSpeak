import React from 'react';
import {
  Users,
  Volume2,
  VolumeX,
  ShieldAlert,
  Compass,
  Navigation,
  Play,
  CloudRain,
  Sun,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import {
  calculateDistance,
  pixelsToMeters,
  calculateProximityGain,
  calculateStereoPan,
  checkWallOcclusion,
} from '../utils/spatialGeometry';

export function PeersPanel({
  player,
  peers,
  walls,
  windows,
  furniture,
  earshotRadius,
  onTeleportToPeer,
  onPlayPeerChirp,
  onToggleWindow,
  onSitChair,
}) {
  const inRangePeersCount = peers.filter(
    (p) => calculateDistance(player, p) <= earshotRadius
  ).length;

  return (
    <div className="w-80 flex flex-col bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-4 shadow-2xl h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Users size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Live Spatial Mesh</h2>
            <p className="text-[11px] text-slate-400">Boardroom & Pod Presence</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 font-semibold">{inRangePeersCount}</span>
          <span className="text-slate-400">/ {peers.length} active</span>
        </div>
      </div>

      {/* Main Peers List */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 pr-1 custom-scrollbar">
        {peers.map((peer) => {
          const distance = calculateDistance(player, peer);
          const inRange = distance <= earshotRadius;
          const isOccluded = checkWallOcclusion(player, peer, walls);
          const gain = inRange
            ? calculateProximityGain(distance, earshotRadius, isOccluded)
            : 0;
          const pan = calculateStereoPan(player, peer, earshotRadius);
          const volumePct = Math.round(gain * 100);

          return (
            <div
              key={peer.id}
              className={`p-3 rounded-xl border transition-all ${
                inRange
                  ? isOccluded
                    ? 'bg-amber-950/20 border-amber-500/30 shadow-sm'
                    : 'bg-slate-800/60 border-cyan-500/30 shadow-md shadow-cyan-950/20'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-90'
              }`}
            >
              {/* Avatar & Role Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 shadow"
                    style={{ backgroundColor: peer.color }}
                  >
                    {peer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{peer.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">{peer.role}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPlayPeerChirp(peer, pan, gain, isOccluded)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-[10px] transition-all cursor-pointer"
                    title="Audition peer's voice tone via Web Audio"
                  >
                    <Play size={12} />
                  </button>
                  <button
                    onClick={() => onTeleportToPeer(peer)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-[10px] transition-all cursor-pointer"
                    title="Walk directly towards this peer"
                  >
                    <Navigation size={12} />
                  </button>
                </div>
              </div>

              {/* Status Tag Chip */}
              <div className="mb-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800 text-slate-300">
                  {peer.statusTag || 'Active'}
                </span>
              </div>

              {/* Distance & Earshot Badges */}
              <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                <div className="flex items-center gap-1 text-slate-400">
                  <Compass size={12} className="text-slate-500" />
                  <span>{pixelsToMeters(distance)}m away</span>
                </div>
                <div>
                  {inRange ? (
                    isOccluded ? (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <ShieldAlert size={11} /> Muffled (Glass)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <Volume2 size={11} /> In Earshot
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded">
                      <VolumeX size={11} /> Out of Range
                    </span>
                  )}
                </div>
              </div>

              {/* Proximity Gain Meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Proximity Gain</span>
                  <span className={inRange ? 'text-cyan-300 font-mono font-bold' : 'text-slate-500 font-mono'}>
                    {volumePct}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-150 ${
                      isOccluded ? 'bg-amber-400' : inRange ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-slate-700'
                    }`}
                    style={{ width: `${volumePct}%` }}
                  />
                </div>
              </div>

              {/* Stereo Panning Visualizer */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Pan: L</span>
                <div className="w-20 bg-slate-900 h-1.5 rounded-full relative border border-slate-800">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-cyan-400 absolute top-1/2 -translate-y-1/2 shadow-sm"
                    style={{ left: `calc(${(pan + 1) / 2 * 100}% - 5px)` }}
                  />
                </div>
                <span>R</span>
              </div>
            </div>
          );
        })}

        {/* Panoramic Windows & Outdoor Soundscape Card */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <CloudRain size={13} className="text-cyan-400" /> Panoramic Windows
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Interactable</span>
          </div>
          <div className="space-y-1.5">
            {windows.map((win) => (
              <div
                key={win.id}
                onClick={() => onToggleWindow(win.id)}
                className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                  win.isOpen
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <p className="font-semibold">{win.name}</p>
                  <p className="text-[10px] opacity-80">{win.soundLabel}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                    win.isOpen ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {win.isOpen ? 'OPEN 🌧️' : 'CLOSED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default PeersPanel;
