import React from 'react';
import {
  X,
  Compass,
  Radio,
  Layers,
  Volume2,
  Cpu,
  ShieldCheck,
  Sparkles,
  Keyboard,
  Activity,
  DoorOpen,
  CloudRain,
} from 'lucide-react';

export function SystemGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} /> PRODUCTION SYSTEM • OPERATIONAL
              </span>
              <span className="text-xs text-slate-400 font-mono">v2.4 Enterprise Build</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              <Compass size={18} className="text-cyan-400" />
              ProxiSpeak Architecture & Spatial Audio Specification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-slate-300">
          {/* Core Architectural Pillars */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Layers size={14} /> Core Architectural Subsystems
            </h3>

            <div className="grid gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between font-semibold text-cyan-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs flex items-center justify-center font-bold font-mono">1</span>
                    Spatial Acoustics & Dynamic Proximity Falloff
                  </span>
                  <span className="text-[11px] font-mono bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">Active</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 ml-7 leading-relaxed">
                  Web Audio API pipeline computing Euclidean distance attenuation with custom earshot zones (Whisper 80px, Normal 160px, Conference 240px, Broadcast 380px) and real-time stereo panning.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between font-semibold text-cyan-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs flex items-center justify-center font-bold font-mono">2</span>
                    Acoustic Wall Occlusion & Low-Pass Filtering
                  </span>
                  <span className="text-[11px] font-mono bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">Active</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 ml-7 leading-relaxed">
                  Ray-Wall geometric intersection detection. When an avatar is separated by closed oak doors or acoustic glass partitions, audio drops by 65% (-9.5dB) and applies a 450Hz Biquad low-pass filter to simulate true physical muffling.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between font-semibold text-cyan-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs flex items-center justify-center font-bold font-mono">3</span>
                    Biophilic 2D Office Map & Restricted Path Physics
                  </span>
                  <span className="text-[11px] font-mono bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">Active</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 ml-7 leading-relaxed">
                  1024×571 orthographic vector environment. Wall collision bounds physically restrict movement. Automated glass gates and hinged doors feature smooth opening animations and sensor-based passage clearing.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between font-semibold text-cyan-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs flex items-center justify-center font-bold font-mono">4</span>
                    Real-Time Geospatial Gateway & WebRTC Voice Mesh
                  </span>
                  <span className="text-[11px] font-mono bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">Active</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 ml-7 leading-relaxed">
                  Socket.io server with sub-15ms broadcast latency. Synchronizes avatar coordinates, room presence, door states, and orchestrates peer-to-peer WebRTC voice channels backed by MongoDB 2dsphere indexing.
                </p>
              </div>
            </div>
          </section>

          {/* Interactive Navigation & Keyboard Controls */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Keyboard size={14} /> Interactive Controls & Navigation
            </h3>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" /> Avatar Navigation
                </div>
                <ul className="space-y-1.5 text-slate-400">
                  <li className="flex justify-between">
                    <span>Move Avatar:</span>
                    <strong className="text-slate-200 font-mono">W / A / S / D or Arrow Keys</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Restricted Walls:</span>
                    <strong className="text-rose-300 font-mono">Solid Collision Barrier</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Quick Teleport:</span>
                    <strong className="text-cyan-300 font-mono">Click Room Bar / Peers</strong>
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <DoorOpen size={14} className="text-emerald-400" /> Interactive Office Features
                </div>
                <ul className="space-y-1.5 text-slate-400">
                  <li className="flex justify-between">
                    <span>Doors & Glass Gates:</span>
                    <strong className="text-emerald-300 font-mono">Click to Open / Close</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Outdoor Windows:</span>
                    <strong className="text-cyan-300 font-mono">Click to Slide Open Rain</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Boardroom Table:</span>
                    <strong className="text-amber-300 font-mono">Click Chair to Take Seat</strong>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Technical Acoustic Specs */}
          <section className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Volume2 size={14} className="text-cyan-400" /> Spatial Acoustic Specifications
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">Sample Rate</div>
                <div className="text-xs font-bold text-slate-200 font-mono mt-0.5">48.0 kHz Stereo</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">Occlusion Filter</div>
                <div className="text-xs font-bold text-cyan-300 font-mono mt-0.5">450 Hz Biquad</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">Wall Attenuation</div>
                <div className="text-xs font-bold text-amber-300 font-mono mt-0.5">-9.5 dB (65%)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">Sync Latency</div>
                <div className="text-xs font-bold text-emerald-300 font-mono mt-0.5">&lt; 15 ms</div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/70">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            Close & Enter Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

// Named and default export for compatibility
export const SOPGuidanceModal = SystemGuideModal;
export default SystemGuideModal;
