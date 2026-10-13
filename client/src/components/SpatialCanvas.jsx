import React, { useRef, useEffect, useCallback } from 'react';
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
  windows,
  plants,
  furniture,
  earshotRadius,
  isMicActive,
  micDecibels,
  onToggleWindow,
  onInteractPlant,
  onBrewCoffee,
  onSitChair,
  onPeerClick,
  onCanvasClick,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const targetPosRef = useRef({ x: player.x, y: player.y });
  const isDraggingPlayer = useRef(false);

  // Sync target pos if teleported or seated
  useEffect(() => {
    if (Math.abs(targetPosRef.current.x - player.x) > 40 || Math.abs(targetPosRef.current.y - player.y) > 40) {
      targetPosRef.current = { x: player.x, y: player.y };
    }
  }, [player.x, player.y]);

  // Handle keyboard movement (WASD & Arrow Keys)
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
      const speed = 6;

      if (keysDown.has('w') || keysDown.has('arrowup')) dy -= speed;
      if (keysDown.has('s') || keysDown.has('arrowdown')) dy += speed;
      if (keysDown.has('a') || keysDown.has('arrowleft')) dx -= speed;
      if (keysDown.has('d') || keysDown.has('arrowright')) dx += speed;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      setPlayer((prev) => {
        const nextX = Math.max(30, Math.min(1150, prev.x + dx));
        const nextY = Math.max(30, Math.min(730, prev.y + dy));
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

  // Canvas click / mouse events
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. Check window click
    for (const win of windows) {
      if (
        clickX >= win.x &&
        clickX <= win.x + win.w &&
        clickY >= win.y - 10 &&
        clickY <= win.y + win.h + 15
      ) {
        if (onToggleWindow) onToggleWindow(win.id);
        return;
      }
    }

    // 2. Check plant click
    for (const plant of plants) {
      if (Math.hypot(clickX - plant.x, clickY - plant.y) <= plant.radius + 12) {
        if (onInteractPlant) onInteractPlant(plant);
        return;
      }
    }

    // 3. Check conference table chairs
    const table = furniture.conferenceTable;
    for (const chair of table.chairs) {
      if (Math.hypot(clickX - chair.x, clickY - chair.y) <= 18) {
        if (onSitChair) onSitChair(chair);
        return;
      }
    }

    // 4. Check coffee bar click
    const bar = furniture.espressoBar;
    if (
      clickX >= bar.x &&
      clickX <= bar.x + bar.w &&
      clickY >= bar.y &&
      clickY <= bar.y + bar.h
    ) {
      if (onBrewCoffee) onBrewCoffee();
      return;
    }

    // 5. Check peer click
    for (const peer of peers) {
      if (Math.hypot(clickX - peer.x, clickY - peer.y) < 26) {
        if (onPeerClick) onPeerClick(peer);
        return;
      }
    }

    // 6. Normal click-to-walk
    targetPosRef.current = { x: clickX, y: clickY };
    isDraggingPlayer.current = true;
    if (onCanvasClick) onCanvasClick({ x: clickX, y: clickY });
  }, [windows, plants, furniture, peers, onToggleWindow, onInteractPlant, onSitChair, onBrewCoffee, onPeerClick, onCanvasClick]);

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

  // Main 60fps render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const render = () => {
      time += 0.03;

      // Smooth avatar lerp
      setPlayer((prev) => {
        if (prev.isSeated) return prev;
        const tx = targetPosRef.current.x;
        const ty = targetPosRef.current.y;
        const dist = Math.hypot(tx - prev.x, ty - prev.y);
        if (dist > 1.2) {
          const lerp = 0.14;
          return {
            ...prev,
            x: prev.x + (tx - prev.x) * lerp,
            y: prev.y + (ty - prev.y) * lerp,
          };
        }
        return prev;
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- 1. Base Flooring (Warm architectural slate) ---
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- 2. Draw Rooms with Architectural Materials ---
      rooms.forEach((room) => {
        ctx.save();
        if (room.floorType === 'wood') {
          // Warm Biophilic Oak Slats
          ctx.fillStyle = '#111822';
          ctx.fillRect(room.x, room.y, room.w, room.h);
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.07)';
          ctx.lineWidth = 1;
          for (let y = room.y + 16; y < room.y + room.h; y += 22) {
            ctx.beginPath();
            ctx.moveTo(room.x, y);
            ctx.lineTo(room.x + room.w, y);
            ctx.stroke();
          }
        } else if (room.floorType === 'carpet') {
          // Executive Charcoal Acoustic Carpet
          ctx.fillStyle = '#0e1420';
          ctx.fillRect(room.x, room.y, room.w, room.h);
          // Subtle circular conference rug under table
          const rugGrad = ctx.createRadialGradient(290, 230, 20, 290, 230, 160);
          rugGrad.addColorStop(0, 'rgba(6, 182, 212, 0.06)');
          rugGrad.addColorStop(1, 'rgba(6, 182, 212, 0.01)');
          ctx.fillStyle = rugGrad;
          ctx.beginPath();
          ctx.ellipse(290, 230, 150, 100, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Soft terrazzo / felt tile
          ctx.fillStyle = '#0d121c';
          ctx.fillRect(room.x, room.y, room.w, room.h);
        }

        // Room subtle boundary glow
        ctx.strokeStyle = room.borderTint;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(room.x, room.y, room.w, room.h);

        // Room Nameplate Chip
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(room.x + 12, room.y + 12, 180, 24);
        ctx.strokeStyle = room.borderTint;
        ctx.lineWidth = 1;
        ctx.strokeRect(room.x + 12, room.y + 12, 180, 24);

        ctx.fillStyle = room.color;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(room.code, room.x + 18, room.y + 27);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText(room.name, room.x + 72, room.y + 27);

        ctx.restore();
      });

      // --- 3. Draw Conference Table & Meeting Chairs ---
      const table = furniture.conferenceTable;
      ctx.save();
      // Walnut Table Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      // Tabletop
      ctx.fillStyle = '#261b17';
      ctx.beginPath();
      ctx.roundRect(table.x, table.y, table.w, table.h, 24);
      ctx.fill();

      // Brass Inlay Trim
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(table.x + 6, table.y + 6, table.w - 12, table.h - 12, 18);
      ctx.stroke();

      // Tabletop Meeting Topic Watermark
      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MEETING TABLE • 6 SEATS', table.x + table.w / 2, table.y + table.h / 2);

      // Chairs around the table
      table.chairs.forEach((chair) => {
        const isPlayerHere = player.isSeated && Math.hypot(player.x - chair.x, player.y - chair.y) < 10;
        const isOccupied = chair.occupant || isPlayerHere;

        ctx.save();
        ctx.fillStyle = isPlayerHere ? '#06b6d4' : isOccupied ? '#334155' : '#1e293b';
        ctx.strokeStyle = isPlayerHere ? '#22d3ee' : 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(chair.x, chair.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Chair armrests
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(chair.x, chair.y, 14, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();

        if (!isOccupied) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 8px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SIT', chair.x, chair.y + 3);
        }
        ctx.restore();
      });
      ctx.restore();

      // --- 4. Interactive Presentation Whiteboard ---
      const wb = furniture.whiteboard;
      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(wb.x, wb.y, wb.w, wb.h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);

      // Marker tray
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(wb.x - 2, wb.y + wb.h - 8, 4, 12);

      // Floating Whiteboard Label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(wb.x + 14, wb.y + 10, 160, 48);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.strokeRect(wb.x + 14, wb.y + 10, 160, 48);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillText('BOARDROOM WHITEBOARD', wb.x + 20, wb.y + 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px system-ui, sans-serif';
      ctx.fillText('• Web Audio API & Gain Panner', wb.x + 20, wb.y + 36);
      ctx.fillText('• Wall Occlusion Filter (450Hz)', wb.x + 20, wb.y + 48);
      ctx.restore();

      // --- 5. Barista Coffee Station & Steam ---
      const bar = furniture.espressoBar;
      ctx.save();
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(bar.x, bar.y, bar.w, bar.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Espresso Machine
      ctx.fillStyle = '#44403c';
      ctx.fillRect(bar.x + 15, bar.y + 15, 45, 40);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bar.x + 22, bar.y + 22, 10, 5); // display

      // Steam animation
      const steamY1 = bar.y + 12 - ((time * 20) % 18);
      const steamAlpha1 = Math.max(0, 1 - (bar.y + 12 - steamY1) / 18);
      ctx.fillStyle = `rgba(254, 243, 199, ${steamAlpha1 * 0.6})`;
      ctx.beginPath();
      ctx.arc(bar.x + 26, steamY1, 4 + (1 - steamAlpha1) * 4, 0, Math.PI * 2);
      ctx.fill();

      // Coffee Bar Label
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillText('☕ BARISTA STATION', bar.x + 65, bar.y + 32);
      ctx.fillStyle = '#a8a29e';
      ctx.font = '8px system-ui, sans-serif';
      ctx.fillText('Click to Brew', bar.x + 65, bar.y + 46);
      ctx.restore();

      // --- 6. Draw Biophilic Potted Plants (Monstera, Fiddle-Leaf, Bonsai) ---
      plants.forEach((plant) => {
        ctx.save();
        const sway = Math.sin(time * 2 + plant.x) * 1.5;

        // Pot Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        // Ceramic Pot
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(plant.x, plant.y, plant.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Soil
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(plant.x, plant.y, plant.radius * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Lush Leaves
        const leafCount = plant.type === 'monstera' ? 6 : plant.type === 'bamboo' ? 5 : 7;
        for (let i = 0; i < leafCount; i++) {
          const angle = (i * (Math.PI * 2)) / leafCount + sway * 0.1;
          const leafLen = plant.radius * (0.8 + (i % 2) * 0.3);
          const lx = plant.x + Math.cos(angle) * leafLen;
          const ly = plant.y + Math.sin(angle) * leafLen;

          ctx.fillStyle = i % 2 === 0 ? plant.color : '#059669';
          ctx.beginPath();
          ctx.ellipse(lx, ly, plant.radius * 0.35, plant.radius * 0.18, angle, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // --- 7. Draw Interactive Panoramic Windows with Outdoor Sound FX ---
      windows.forEach((win) => {
        ctx.save();
        // Window Frame
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(win.x, win.y, win.w, win.h);

        if (win.isOpen) {
          // Open Window: Cyan breeze glow & ripples
          ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
          ctx.fillRect(win.x, win.y, win.w, win.h);

          // Breeze wave lines drifting into the room
          const waveShift = (time * 25) % 30;
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(win.x + 20, win.y + (win.y < 200 ? waveShift : -waveShift));
          ctx.lineTo(win.x + win.w - 20, win.y + (win.y < 200 ? waveShift : -waveShift));
          ctx.stroke();
          ctx.setLineDash([]);

          // Open status banner
          ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
          ctx.fillRect(win.x + win.w / 2 - 60, win.y + (win.y < 200 ? 14 : -24), 120, 18);
          ctx.fillStyle = '#082f49';
          ctx.font = 'bold 9px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`🌧️ OPEN • ${win.soundLabel.split(' ')[0]}`, win.x + win.w / 2, win.y + (win.y < 200 ? 26 : -12));
        } else {
          // Closed Window: Frosted glass pane
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(win.x, win.y, win.w, win.h);

          // Diagonal glass specular reflection line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(win.x + 30, win.y);
          ctx.lineTo(win.x + 60, win.y + win.h);
          ctx.stroke();

          // Closed tooltip
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(win.x + win.w / 2 - 50, win.y + (win.y < 200 ? 14 : -24), 100, 18);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Window Closed (Click)', win.x + win.w / 2, win.y + (win.y < 200 ? 26 : -12));
        }
        ctx.restore();
      });

      // --- 8. Draw Frosted Glass & Acoustic Walls ---
      walls.forEach((wall) => {
        ctx.save();
        if (wall.type === 'door') {
          // Sliding Glass Door
          if (wall.isOpen) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
          } else {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
          }
          ctx.beginPath();
          ctx.moveTo(wall.start.x, wall.start.y);
          ctx.lineTo(wall.end.x, wall.end.y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (wall.type === 'glass') {
          // Elegant Frosted Fluted Glass Wall
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(wall.start.x, wall.start.y);
          ctx.lineTo(wall.end.x, wall.end.y);
          ctx.stroke();

          // Specular fluted glass shine
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 8]);
          ctx.beginPath();
          ctx.moveTo(wall.start.x, wall.start.y);
          ctx.lineTo(wall.end.x, wall.end.y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Solid acoustic insulated wall
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(wall.start.x, wall.start.y);
          ctx.lineTo(wall.end.x, wall.end.y);
          ctx.stroke();
        }
        ctx.restore();
      });

      // --- 9. Connection Beams for In-Range Peers ---
      peers.forEach((peer) => {
        const dist = calculateDistance(player, peer);
        const inRange = dist <= earshotRadius;
        const isOccluded = checkWallOcclusion(player, peer, walls);

        if (inRange) {
          const gain = calculateProximityGain(dist, earshotRadius, isOccluded);
          ctx.save();
          ctx.setLineDash([6, 5]);
          ctx.lineDashOffset = -time * 18;

          if (isOccluded) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
            ctx.lineWidth = 2;
          } else {
            const grad = ctx.createLinearGradient(player.x, player.y, peer.x, peer.y);
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.85)');
            grad.addColorStop(1, peer.color);
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(1.5, gain * 3.5);
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
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = isOccluded ? '#f59e0b' : '#38bdf8';
          ctx.lineWidth = 1;
          const tagW = isOccluded ? 134 : 98;
          ctx.fillRect(midX - tagW / 2, midY - 10, tagW, 20);
          ctx.strokeRect(midX - tagW / 2, midY - 10, tagW, 20);

          ctx.fillStyle = isOccluded ? '#fbbf24' : '#38bdf8';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (isOccluded) {
            ctx.fillText(`MUFFLED • ${volPercent}% • ${pixelsToMeters(dist)}m`, midX, midY);
          } else {
            ctx.fillText(`VOL: ${volPercent}% • ${pixelsToMeters(dist)}m`, midX, midY);
          }
          ctx.restore();
        }
      });

      // --- 10. Local Player Earshot / Hearing Bubble ---
      ctx.save();
      const pulse = Math.sin(time * 2.5) * 3;
      const effectiveRadius = earshotRadius + pulse;

      const radialGrad = ctx.createRadialGradient(
        player.x,
        player.y,
        effectiveRadius * 0.25,
        player.x,
        player.y,
        effectiveRadius
      );
      radialGrad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      radialGrad.addColorStop(0.7, 'rgba(6, 182, 212, 0.04)');
      radialGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, effectiveRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer boundary ring
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, effectiveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // --- 11. Remote Peers ---
      peers.forEach((peer) => {
        ctx.save();
        const dist = calculateDistance(player, peer);
        const inRange = dist <= earshotRadius;

        // Speaking ripple
        if (peer.isSpeaking) {
          const rippleRadius = 20 + ((time * 20 + peer.speechCycle * 8) % 18);
          const alpha = 1 - (rippleRadius - 20) / 18;
          ctx.strokeStyle = `${peer.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(peer.x, peer.y, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Avatar
        ctx.shadowColor = peer.color;
        ctx.shadowBlur = inRange ? 10 : 3;
        ctx.fillStyle = peer.color;
        ctx.beginPath();
        ctx.arc(peer.x, peer.y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(peer.name.charAt(0), peer.x, peer.y);

        // Nameplate & Status
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = inRange ? peer.color : '#334155';
        ctx.lineWidth = 1;
        const nameW = 104;
        ctx.fillRect(peer.x - nameW / 2, peer.y + 20, nameW, 20);
        ctx.strokeRect(peer.x - nameW / 2, peer.y + 20, nameW, 20);

        ctx.fillStyle = inRange ? '#f8fafc' : '#94a3b8';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillText(peer.name, peer.x, peer.y + 30);

        // Status tag (e.g. In Meeting 👥)
        if (peer.statusTag) {
          ctx.fillStyle = '#64748b';
          ctx.font = '8px system-ui, sans-serif';
          ctx.fillText(peer.statusTag, peer.x, peer.y + 50);
        }
        ctx.restore();
      });

      // --- 12. Local Player Avatar ---
      ctx.save();
      if (isMicActive && micDecibels > 0.05) {
        const micRipple = 18 + micDecibels * 30;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, micRipple, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Outer glow
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Inner body
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('YOU', player.x, player.y);

      // Nameplate & Room Badge
      const currentRoom = getContainingRoom(player, rooms);
      ctx.fillStyle = 'rgba(8, 47, 73, 0.95)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;
      const tagW = 110;
      ctx.fillRect(player.x - tagW / 2, player.y + 22, tagW, 20);
      ctx.strokeRect(player.x - tagW / 2, player.y + 22, tagW, 20);

      ctx.fillStyle = '#f0fdf4';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.fillText(player.isSeated ? 'Seated in Meeting 👥' : player.name, player.x, player.y + 32);

      if (currentRoom) {
        ctx.fillStyle = currentRoom.color;
        ctx.font = '8px monospace';
        ctx.fillText(`[${currentRoom.name.split(' ')[0]}]`, player.x, player.y + 50);
      }
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [player, peers, rooms, walls, windows, plants, furniture, earshotRadius, isMicActive, micDecibels, setPlayer]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl bg-slate-950">
      <canvas
        ref={canvasRef}
        width={1180}
        height={760}
        className="w-full h-full cursor-pointer block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      {/* Interactive Controls Overlay Pill */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 flex items-center gap-3 pointer-events-none shadow-lg">
        <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Click <strong className="text-cyan-300">Windows</strong> to hear rain/breeze • Click <strong className="text-emerald-300">Plants</strong> to rustle • Click <strong className="text-amber-300">Chairs</strong> to join meeting</span>
      </div>
    </div>
  );
}
export default SpatialCanvas;
