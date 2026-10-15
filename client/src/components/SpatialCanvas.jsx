import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  calculateDistance,
  pixelsToMeters,
  calculateProximityGain,
  checkWallOcclusion,
  getContainingRoom,
} from '../utils/spatialGeometry';

export function SpatialCanvas({
  player,
  setPlayer,
  peers,
  rooms,
  walls,
  doors,
  windows,
  plants,
  furniture,
  earshotRadius,
  isMicActive,
  micDecibels,
  onToggleDoor,
  onToggleWindow,
  onInteractPlant,
  onBrewCoffee,
  onDrinkWater,
  onToggleWhiteboard,
  onSitChair,
  onPeerClick,
  onCanvasClick,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const targetPosRef = useRef({ x: player.x, y: player.y });
  const isDraggingPlayer = useRef(false);
  const [mapImageLoaded, setMapImageLoaded] = useState(false);
  const mapImageRef = useRef(null);

  // Preload the stylized office background map
  useEffect(() => {
    const img = new Image();
    img.src = '/office_map.jpg';
    img.onload = () => {
      mapImageRef.current = img;
      setMapImageLoaded(true);
    };
  }, []);

  // Sync target pos if teleported or seated
  useEffect(() => {
    if (Math.abs(targetPosRef.current.x - player.x) > 30 || Math.abs(targetPosRef.current.y - player.y) > 30) {
      targetPosRef.current = { x: player.x, y: player.y };
    }
  }, [player.x, player.y]);

  // Keyboard movement
  useEffect(() => {
    const keysDown = new Set();

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keysDown.add(key);
      }
    };

    const handleKeyUp = (e) => {
      keysDown.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const stepInterval = setInterval(() => {
      if (keysDown.size === 0) return;
      let dx = 0;
      let dy = 0;
      const speed = 5.5;

      if (keysDown.has('w') || keysDown.has('arrowup')) dy -= speed;
      if (keysDown.has('s') || keysDown.has('arrowdown')) dy += speed;
      if (keysDown.has('a') || keysDown.has('arrowleft')) dx -= speed;
      if (keysDown.has('d') || keysDown.has('arrowright')) dx += speed;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      setPlayer((prev) => {
        const nextX = Math.max(25, Math.min(1000, prev.x + dx));
        const nextY = Math.max(25, Math.min(550, prev.y + dy));
        targetPosRef.current = { x: nextX, y: nextY };
        return { ...prev, x: nextX, y: nextY, isSeated: false };
      });
    }, 20);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(stepInterval);
    };
  }, [setPlayer]);

  // Click & Drag Interaction Handler
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. Check Doors Click
    for (const door of doors) {
      if (
        clickX >= door.x - 10 &&
        clickX <= door.x + door.w + 10 &&
        clickY >= door.y - 10 &&
        clickY <= door.y + door.h + 10
      ) {
        if (onToggleDoor) onToggleDoor(door.id);
        return;
      }
    }

    // 2. Check Windows Click
    for (const win of windows) {
      if (
        clickX >= win.x &&
        clickX <= win.x + win.w &&
        clickY >= win.y - 12 &&
        clickY <= win.y + win.h + 16
      ) {
        if (onToggleWindow) onToggleWindow(win.id);
        return;
      }
    }

    // 3. Check Chairs (Boardroom Table & Desks)
    const table = furniture.conferenceTable;
    for (const chair of table.chairs) {
      if (Math.hypot(clickX - chair.x, clickY - chair.y) <= 18) {
        if (onSitChair) onSitChair(chair);
        return;
      }
    }

    // 4. Check Coffee Machine
    const coffee = furniture.coffeeMachine;
    if (Math.hypot(clickX - coffee.x, clickY - coffee.y) <= 22) {
      if (onBrewCoffee) onBrewCoffee();
      return;
    }

    // 5. Check Water Coolers
    for (const cooler of furniture.waterCoolers) {
      if (Math.hypot(clickX - cooler.x, clickY - cooler.y) <= cooler.radius + 8) {
        if (onDrinkWater) onDrinkWater(cooler);
        return;
      }
    }

    // 6. Check Whiteboard
    const wb = furniture.whiteboard;
    if (
      clickX >= wb.x &&
      clickX <= wb.x + wb.w &&
      clickY >= wb.y &&
      clickY <= wb.y + wb.h
    ) {
      if (onToggleWhiteboard) onToggleWhiteboard();
      return;
    }

    // 7. Check Plants
    for (const plant of plants) {
      if (Math.hypot(clickX - plant.x, clickY - plant.y) <= plant.radius + 10) {
        if (onInteractPlant) onInteractPlant(plant);
        return;
      }
    }

    // 8. Check Peers Click
    for (const peer of peers) {
      if (Math.hypot(clickX - peer.x, clickY - peer.y) < 24) {
        if (onPeerClick) onPeerClick(peer);
        return;
      }
    }

    // 9. Walk to location
    targetPosRef.current = { x: clickX, y: clickY };
    isDraggingPlayer.current = true;
    if (onCanvasClick) onCanvasClick({ x: clickX, y: clickY });
  }, [doors, windows, furniture, plants, peers, onToggleDoor, onToggleWindow, onSitChair, onBrewCoffee, onDrinkWater, onToggleWhiteboard, onInteractPlant, onPeerClick, onCanvasClick]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingPlayer.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    targetPosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingPlayer.current = false;
  }, []);

  // Main 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const render = () => {
      time += 0.025;

      // Smooth avatar lerp
      setPlayer((prev) => {
        if (prev.isSeated) return prev;
        const tx = targetPosRef.current.x;
        const ty = targetPosRef.current.y;
        const dist = Math.hypot(tx - prev.x, ty - prev.y);
        if (dist > 1.2) {
          const lerp = 0.16;
          return {
            ...prev,
            x: prev.x + (tx - prev.x) * lerp,
            y: prev.y + (ty - prev.y) * lerp,
          };
        }
        return prev;
      });

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- 1. Draw Stylized Office Base Map ---
      if (mapImageRef.current && mapImageLoaded) {
        ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback clean architectural floor
        ctx.fillStyle = '#0c121e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // --- 2. Interactive Windows Overlay & Outdoor Weather Light ---
      windows.forEach((win) => {
        ctx.save();
        if (win.isOpen) {
          // Open Window: Atmospheric sun/rain light cone flooding into the room
          const lightGrad = ctx.createLinearGradient(win.x, win.y, win.x, win.y + (win.y < 100 ? 55 : -55));
          lightGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          lightGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
          ctx.fillStyle = lightGrad;
          ctx.fillRect(win.x, win.y + (win.y < 100 ? win.h : -55), win.w, 55);

          // Flowing breeze wave lines
          const waveShift = (time * 20) % 30;
          ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          const waveY = win.y + (win.y < 100 ? 10 + waveShift : -waveShift);
          ctx.moveTo(win.x + 15, waveY);
          ctx.lineTo(win.x + win.w - 15, waveY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Interactive Open Window Pill
          ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
          ctx.beginPath();
          ctx.roundRect(win.x + win.w / 2 - 45, win.y + (win.y < 100 ? 12 : -20), 90, 18, 9);
          ctx.fill();
          ctx.fillStyle = '#f0fdf4';
          ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🌧️ OPEN (Click)', win.x + win.w / 2, win.y + (win.y < 100 ? 24 : -8));
        } else {
          // Closed Window: Subtle specular glass shine
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(win.x + 10, win.y + 4);
          ctx.lineTo(win.x + 35, win.y + win.h - 4);
          ctx.stroke();
        }
        ctx.restore();
      });

      // --- 3. Interactive Doors (Open / Closed State & Acoustic Barriers) ---
      doors.forEach((door) => {
        ctx.save();
        if (door.isOpen) {
          // OPEN DOOR: Green open walkway indicator & swung door panel
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.beginPath();
          ctx.roundRect(door.x, door.y, door.w, door.h, 4);
          ctx.fill();

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Swung open door leaf
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(door.x, door.y + door.h / 2);
          ctx.lineTo(door.x - 12, door.y - 14);
          ctx.stroke();

          // Door status tag
          ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
          ctx.beginPath();
          ctx.roundRect(door.x + door.w / 2 - 32, door.y - 14, 64, 15, 7);
          ctx.fill();
          ctx.fillStyle = '#6ee7b7';
          ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('OPEN (Walk In)', door.x + door.w / 2, door.y - 4);
        } else {
          // CLOSED DOOR: Solid barrier with acoustic lock & brass handle
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 8;
          ctx.fillStyle = door.type.includes('glass') ? 'rgba(56, 189, 248, 0.75)' : '#78350f';
          ctx.beginPath();
          ctx.roundRect(door.x, door.y, door.w, door.h, 3);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = door.type.includes('glass') ? '#38bdf8' : '#b45309';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Door Handle
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(door.x + door.w - 6, door.y + door.h / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Closed Door Tag
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(door.x + door.w / 2 - 30, door.y - 14, 60, 15, 7);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.stroke();
          ctx.fillStyle = '#cbd5e1';
          ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('DOOR CLOSED', door.x + door.w / 2, door.y - 4);
        }
        ctx.restore();
      });

      // --- 4. Interactive Chairs Overlay & Sit Indicators ---
      const table = furniture.conferenceTable;
      table.chairs.forEach((chair) => {
        const isPlayerHere = player.isSeated && Math.hypot(player.x - chair.x, player.y - chair.y) < 10;
        const isOccupied = chair.occupant || isPlayerHere;

        if (!isOccupied) {
          // Subtle glowing "Sit" pulse for empty chairs
          ctx.save();
          const chairPulse = Math.sin(time * 3 + chair.x) * 0.3 + 0.7;
          ctx.strokeStyle = `rgba(56, 189, 248, ${chairPulse * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(chair.x, chair.y, 11, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(15, 23, 42, 0.7)`;
          ctx.beginPath();
          ctx.roundRect(chair.x - 14, chair.y - 7, 28, 14, 5);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SIT', chair.x, chair.y + 3);
          ctx.restore();
        }
      });

      // --- 5. Interactive Coffee Machine Animated Steam ---
      const coffee = furniture.coffeeMachine;
      ctx.save();
      const steamY = coffee.y - 8 - ((time * 20) % 20);
      const steamAlpha = Math.max(0, 1 - (coffee.y - 8 - steamY) / 20);
      ctx.fillStyle = `rgba(254, 243, 199, ${steamAlpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(coffee.x + Math.sin(time * 3) * 2, steamY, 3 + (1 - steamAlpha) * 4, 0, Math.PI * 2);
      ctx.fill();

      // Click to brew prompt
      ctx.fillStyle = 'rgba(120, 53, 15, 0.85)';
      ctx.beginPath();
      ctx.roundRect(coffee.x - 22, coffee.y + 16, 44, 13, 6);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 7px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☕ BREW', coffee.x, coffee.y + 25);
      ctx.restore();

      // --- 6. Interactive Whiteboard Banner ---
      const wb = furniture.whiteboard;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(wb.x - 10, wb.y + wb.h + 2, wb.w + 20, 16, 6);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`📋 ${wb.slides[wb.slideIndex].slice(0, 26)}...`, wb.x + wb.w / 2, wb.y + wb.h + 13);
      ctx.restore();

      // --- 7. Spatial Mesh Audio Connection Beams ---
      // Combine walls and CLOSED doors for acoustic sound occlusion
      const activeAcousticWalls = [...walls];
      doors.forEach((door) => {
        if (!door.isOpen) {
          activeAcousticWalls.push({
            id: `wall-closed-${door.id}`,
            start: { x: door.x, y: door.y + door.h / 2 },
            end: { x: door.x + door.w, y: door.y + door.h / 2 },
          });
        }
      });

      peers.forEach((peer) => {
        const dist = calculateDistance(player, peer);
        const inRange = dist <= earshotRadius;
        const isOccluded = checkWallOcclusion(player, peer, activeAcousticWalls);

        if (inRange) {
          const gain = calculateProximityGain(dist, earshotRadius, isOccluded);
          ctx.save();
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -time * 20;

          if (isOccluded) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)'; // Muffled through closed door/wall
            ctx.lineWidth = 2;
          } else {
            const grad = ctx.createLinearGradient(player.x, player.y, peer.x, peer.y);
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.9)');
            grad.addColorStop(1, peer.color);
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(1.8, gain * 4);
          }

          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(peer.x, peer.y);
          ctx.stroke();

          // Midpoint distance & volume badge
          const midX = (player.x + peer.x) / 2;
          const midY = (player.y + peer.y) / 2;
          const volPercent = Math.round(gain * 100);

          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(11, 16, 26, 0.92)';
          ctx.beginPath();
          const tagW = isOccluded ? 134 : 96;
          ctx.roundRect(midX - tagW / 2, midY - 10, tagW, 20, 6);
          ctx.fill();
          ctx.strokeStyle = isOccluded ? '#f59e0b' : '#38bdf8';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = isOccluded ? '#fbbf24' : '#38bdf8';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (isOccluded) {
            ctx.fillText(`MUFFLED • ${volPercent}% • ${pixelsToMeters(dist)}m`, midX, midY);
          } else {
            ctx.fillText(`VOL ${volPercent}% • ${pixelsToMeters(dist)}m`, midX, midY);
          }
          ctx.restore();
        }
      });

      // --- 8. Local Player Earshot / Hearing Radius Bubble ---
      ctx.save();
      const pulse = Math.sin(time * 2.5) * 3;
      const effectiveRadius = earshotRadius + pulse;

      const radialGrad = ctx.createRadialGradient(
        player.x,
        player.y,
        effectiveRadius * 0.2,
        player.x,
        player.y,
        effectiveRadius
      );
      radialGrad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      radialGrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.05)');
      radialGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, effectiveRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer boundary ring
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, effectiveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // --- 9. Remote Peers Avatars ---
      peers.forEach((peer) => {
        ctx.save();
        const dist = calculateDistance(player, peer);
        const inRange = dist <= earshotRadius;

        // Speaking Ripple
        if (peer.isSpeaking) {
          const rippleRadius = 18 + ((time * 22 + peer.speechCycle * 8) % 18);
          const alpha = 1 - (rippleRadius - 18) / 18;
          ctx.strokeStyle = `${peer.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(peer.x, peer.y, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Avatar Body with Drop Shadow
        ctx.shadowColor = peer.color;
        ctx.shadowBlur = inRange ? 14 : 4;
        ctx.fillStyle = peer.color;
        ctx.beginPath();
        ctx.arc(peer.x, peer.y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(peer.name.charAt(0), peer.x, peer.y);

        // Nameplate Badge
        ctx.fillStyle = 'rgba(11, 16, 26, 0.9)';
        ctx.beginPath();
        const nameW = 100;
        ctx.roundRect(peer.x - nameW / 2, peer.y + 18, nameW, 18, 6);
        ctx.fill();
        ctx.strokeStyle = inRange ? peer.color : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = inRange ? '#f8fafc' : '#94a3b8';
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(peer.name, peer.x, peer.y + 27);

        if (peer.statusTag) {
          ctx.fillStyle = '#64748b';
          ctx.font = '8px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(peer.statusTag, peer.x, peer.y + 44);
        }
        ctx.restore();
      });

      // --- 10. Local Player Avatar ---
      ctx.save();
      if (isMicActive && micDecibels > 0.05) {
        const micRipple = 18 + micDecibels * 30;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, micRipple, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Player Glowing Ring
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Inner Core
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('YOU', player.x, player.y);

      // Nameplate & Room Badge
      const currentRoom = getContainingRoom(player, rooms);
      ctx.fillStyle = 'rgba(8, 47, 73, 0.95)';
      ctx.beginPath();
      const tagW = 106;
      ctx.roundRect(player.x - tagW / 2, player.y + 20, tagW, 20, 6);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#f0fdf4';
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(player.isSeated ? 'Seated at Table 👥' : player.name, player.x, player.y + 30);

      if (currentRoom) {
        ctx.fillStyle = currentRoom.color;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`[${currentRoom.name.split(' ')[0]}]`, player.x, player.y + 48);
      }
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [player, peers, rooms, walls, doors, windows, plants, furniture, earshotRadius, isMicActive, micDecibels, mapImageLoaded, setPlayer]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl glass-panel shadow-2xl flex items-center justify-center bg-slate-950">
      <canvas
        ref={canvasRef}
        width={1024}
        height={571}
        className="w-full h-auto max-h-[70vh] aspect-[1024/571] cursor-pointer block object-contain"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      {/* Interactive Controls Overlay Pill */}
      <div className="absolute top-4 left-4 glass-card px-3.5 py-2 text-xs text-slate-300 flex items-center gap-3 pointer-events-none shadow-xl rounded-xl">
        <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Click <strong className="text-cyan-300">Doors</strong> to Open/Close • Click <strong className="text-emerald-300">Windows</strong> for rain audio • Click <strong className="text-amber-300">Chairs</strong> to Sit</span>
      </div>
    </div>
  );
}
export default SpatialCanvas;
