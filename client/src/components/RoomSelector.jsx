/**
 * RoomSelector — Top Navigation Bar & Space Switcher
 */
import React, { useState } from 'react';

export function RoomSelector({ currentRoom, rooms = [], onSelectRoom, userCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed top-4 left-6 z-40 flex items-center gap-3">
        {/* Brand Pill */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-4 py-2.5 rounded-2xl shadow-xl shadow-black/40">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-white tracking-tight">ProxiSpeak</h1>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono font-semibold">
                PROD
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Geospatial Proximity Audio</p>
          </div>
        </div>

        {/* Room Switcher Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-slate-700 px-3.5 py-2.5 rounded-2xl shadow-xl transition"
        >
          <div className="text-left">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active Space</div>
            <div className="text-xs font-bold text-slate-200">{currentRoom?.name || 'Loading...'}</div>
          </div>
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800 text-slate-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{userCount}</span>
          </div>
          <svg className="w-4 h-4 text-slate-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Room Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Switch Spatial Environment</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-3">
              {rooms.map((r) => {
                const isActive = r.slug === currentRoom?.slug;
                return (
                  <button
                    key={r.slug}
                    onClick={() => {
                      onSelectRoom(r.slug);
                      setIsOpen(false);
                    }}
                    className={`flex flex-col text-left p-4 rounded-xl border transition ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-100">{r.name}</span>
                      {isActive && (
                        <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{r.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-slate-400">
                      <span>Dimensions: {r.dimensions?.width}m × {r.dimensions?.height}m</span>
                      <span>Default Earshot: {r.earshotDefault}m</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RoomSelector;
