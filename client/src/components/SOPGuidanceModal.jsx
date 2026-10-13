import React from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  GitBranch,
  Award,
  ListTodo,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export function SOPGuidanceModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                INFOTACT SOLUTIONS SOP v1.1
              </span>
              <span className="text-xs text-slate-400 font-mono">Project 1 • Month 1</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1">
              ProxiSpeak Implementation Roadmap & Compliance
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-slate-300">
          {/* Multi-Step Breakdown Section */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <ListTodo size={14} /> Multi-Step Development Progress
            </h3>

            <div className="grid gap-2.5">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <div className="flex items-center justify-between font-semibold text-cyan-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs flex items-center justify-center font-bold">1</span>
                    Step 1: Frontend UI Base & 2D Spatial Audio Map (Active)
                  </span>
                  <span className="text-[11px] font-mono bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">Completed Base</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 ml-7">
                  Interactive 2D Canvas world with rooms, acoustic walls, player movement, earshot bubbles, proximity volume falloff, stereo pan indicators, and Web Audio API simulation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center font-bold">2</span>
                    Step 2: Backend Foundations & Geospatial Data Layer
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Next Step</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 ml-7">
                  Express app, MongoDB connection, 2dsphere indexes for rooms and presence, seed scripts, and REST health endpoints.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center font-bold">3</span>
                    Step 3: Real-Time Presence & Proximity Engine
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Upcoming</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 ml-7">
                  Socket.io gateway, presence lifecycle, client position broadcasts, and spatial queries.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center font-bold">4</span>
                    Step 4: WebRTC Voice Mesh & Spatial Audio Engine
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Upcoming</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 ml-7">
                  Peer connections, WebRTC signaling mesh, Web Audio API distance crossfade, and wall occlusion filter.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center font-bold">5</span>
                    Step 5: Client Hardening, Testing & Review Demo
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Final</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 ml-7">
                  End-to-end multi-user testing, load tests, presentation demo script, and final packaging.
                </p>
              </div>
            </div>
          </section>

          {/* Infotact Review & Evaluation Summary */}
          <section className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Calendar size={14} className="text-cyan-400" /> Review Deadlines
              </h4>
              <ul className="text-xs space-y-1.5 text-slate-400">
                <li className="flex justify-between">
                  <span>Mid Review:</span>
                  <strong className="text-slate-200">20th – 27th (Month 1)</strong>
                </li>
                <li className="flex justify-between">
                  <span>Final Review:</span>
                  <strong className="text-slate-200">5th – 10th (Month 2)</strong>
                </li>
                <li className="flex justify-between">
                  <span>Commit Days Req (Mid):</span>
                  <strong className="text-cyan-300">10 distinct days</strong>
                </li>
                <li className="flex justify-between">
                  <span>Commit Days Req (Final):</span>
                  <strong className="text-cyan-300">20 distinct days (no gaps)</strong>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Award size={14} className="text-amber-400" /> Evaluation Scoring (70 Marks)
              </h4>
              <ul className="text-xs space-y-1.5 text-slate-400">
                <li className="flex justify-between">
                  <span>Implementation (Week 1–4):</span>
                  <strong className="text-slate-200">40% (28 marks)</strong>
                </li>
                <li className="flex justify-between">
                  <span>GitHub Discipline:</span>
                  <strong className="text-slate-200">30% (21 marks)</strong>
                </li>
                <li className="flex justify-between">
                  <span>Code Quality & Docs:</span>
                  <strong className="text-slate-200">20% (14 marks)</strong>
                </li>
                <li className="flex justify-between">
                  <span>Min Stipend Eligibility:</span>
                  <strong className="text-emerald-400 font-bold">45 / 70 (64.3%)</strong>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md"
          >
            Got it, continue with UI
          </button>
        </div>
      </div>
    </div>
  );
}
export default SOPGuidanceModal;
