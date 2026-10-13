import React from 'react';
import { MapPin, Radio, Compass } from 'lucide-react';
import { getContainingRoom } from '../utils/spatialGeometry';

export function RoomNavigator({
  player,
  rooms,
  onTeleportToRoom,
}) {
  const currentRoom = getContainingRoom(player, rooms);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-xl">
      {/* Current Location Badge */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <MapPin size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-100">
              {currentRoom ? currentRoom.name : 'Open Atrium / Corridor'}
            </span>
            {currentRoom && (
              <span
                className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border"
                style={{
                  backgroundColor: `${currentRoom.color}20`,
                  color: currentRoom.color,
                  borderColor: `${currentRoom.color}40`,
                }}
              >
                {currentRoom.code}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Coordinates: <span className="font-mono text-cyan-300">X: {Math.round(player.x)}, Y: {Math.round(player.y)}</span>
          </p>
        </div>
      </div>

      {/* Quick Teleport Room Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        <span className="text-[11px] text-slate-400 font-mono hidden md:inline">Quick Jump:</span>
        {rooms.map((room) => {
          const isHere = currentRoom?.id === room.id;
          return (
            <button
              key={room.id}
              onClick={() => onTeleportToRoom(room)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                isHere
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: room.color }}
              />
              <span>{room.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default RoomNavigator;
