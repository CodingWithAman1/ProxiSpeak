import React from 'react';
import { MapPin } from 'lucide-react';
import { getContainingRoom } from '../utils/spatialGeometry';

export function RoomNavigator({
  player,
  rooms,
  onTeleportToRoom,
}) {
  const currentRoom = getContainingRoom(player, rooms);

  return (
    <div className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl shadow-xl">
      {/* Current Location Badge */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
          <MapPin size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-100">
              {currentRoom ? currentRoom.name : 'Central Corridor & Atrium'}
            </span>
            {currentRoom && (
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: `${currentRoom.color}15`,
                  color: currentRoom.color,
                  borderColor: `${currentRoom.color}35`,
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
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <span className="text-[11px] text-slate-400 font-mono hidden md:inline">Quick Jump:</span>
        {rooms.map((room) => {
          const isHere = currentRoom?.id === room.id;
          return (
            <button
              key={room.id}
              onClick={() => onTeleportToRoom(room)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                isHere
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'glass-card text-slate-300 hover:text-white hover:bg-white/5'
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
