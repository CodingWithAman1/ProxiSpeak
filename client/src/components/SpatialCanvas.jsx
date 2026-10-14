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

  // Mouse click handling
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
        clickY >= win.y - 15 &&
        clickY <= win.y + win.h + 20
      ) {
        if (onToggleWindow) onToggleWindow(win.id);
        return;
      }
    }

    // 2. Check plant click
    for (const plant of plants) {
      if (Math.hypot(clickX - plant.x, clickY - plant.y) <= plant.radius + 15) {
        if (onInteractPlant) onInteractPlant(plant);
        return;
      }
    }

    // 3. Check conference table chairs
    const table = furniture.conferenceTable;
    for (const chair of table.chairs) {
      if (Math.hypot(clickX - chair.x, clickY - chair.y) <= 22) {
        if (onSitChair) onSitChair(chair);
        return;
      }
    }

    // 4. Check coffee bar
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
      if (Math.hypot(clickX - peer.x, clickY - peer.y) < 28) {
        if (onPeerClick) onPeerClick(peer);
        return;
      }
    }

    // 6. Move player
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

  // 60 FPS Render loop
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
          const lerp = 0.15;
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

      // --- 1. Architectural Floor Base & Atmosphere ---
      // Warm dark luxury floor base
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- 2. Render Rooms with Rich Architectural Floor Materials ---
      rooms.forEach((room) => {
        ctx.save();
        if (room.floorType === 'wood') {
          // Warm Japanese Hinoki / Oak Flooring in Lounge
          ctx.fillStyle = '#101722';
          ctx.fillRect(room.x, room.y, room.w, room.h);

          // Wood plank seams & subtle grain
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
          ctx.lineWidth = 1;
          for (let y = room.y + 20; y < room.y + room.h; y += 28) {
            ctx.beginPath();
            ctx.moveTo(room.x, y);
            ctx.lineTo(room.x + room.w, y);
            ctx.stroke();

            // Staggered vertical plank joints
            const offset = (y % 56 === 0) ? 90 : 180;
            for (let x = room.x + offset; x < room.x + room.w; x += 180) {
              ctx.beginPath();
              ctx.moveTo(x, y - 28);
              ctx.lineTo(x, y);
              ctx.stroke();
            }
          }
        } else if (room.floorType === 'carpet') {
          // Executive Boardroom Felted Wool Carpet
          ctx.fillStyle = '#0c121e';
          ctx.fillRect(room.x, room.y, room.w, room.h);

          // Subtle woven cross-hatch pattern
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
          ctx.lineWidth = 1;
          for (let x = room.x; x < room.x + room.w; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, room.y);
            ctx.lineTo(x, room.y + room.h);
            ctx.stroke();
          }

          // Large luxurious circular conference rug under the boardroom table
          const rugGrad = ctx.createRadialGradient(290, 230, 20, 290, 230, 160);
          rugGrad.addColorStop(0, 'rgba(6, 182, 212, 0.07)');
          rugGrad.addColorStop(0.8, 'rgba(6, 182, 212, 0.03)');
          rugGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
          ctx.fillStyle = rugGrad;
          ctx.beginPath();
          ctx.ellipse(290, 230, 155, 105, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Terrazzo / acoustic quiet tile
          ctx.fillStyle = '#0a0f19';
          ctx.fillRect(room.x, room.y, room.w, room.h);
        }

        // Room boundary soft border
        ctx.strokeStyle = room.borderTint;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(room.x, room.y, room.w, room.h);

        // Elegant Frosted Glassmorphism Room Badge
        ctx.fillStyle = 'rgba(11, 16, 26, 0.85)';
        ctx.beginPath();
        ctx.roundRect(room.x + 14, room.y + 14, 190, 28, 8);
        ctx.fill();
        ctx.strokeStyle = room.borderTint;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = room.color;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(room.code, room.x + 22, room.y + 32);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(room.name, room.x + 76, room.y + 32);

        ctx.restore();
      });

      // --- 3. Panoramic Windows & Outdoor Sound Scenery ---
      windows.forEach((win) => {
        ctx.save();

        // Outdoor scenery backdrop (courtyard foliage or misty rain silhouette)
        ctx.fillStyle = win.isOpen ? '#061727' : '#070f1a';
        ctx.fillRect(win.x, win.y, win.w, win.h);

        // Window Frame Sill
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(win.x, win.y, win.w, win.h);

        // Vertical mullion dividers
        const mullionStep = win.w / 4;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(win.x + i * mullionStep, win.y);
          ctx.lineTo(win.x + i * mullionStep, win.y + win.h);
          ctx.stroke();
        }

        if (win.isOpen) {
          // Open Window: Atmospheric diffuse light beam & gentle breeze ripples
          const lightGrad = ctx.createLinearGradient(win.x, win.y, win.x, win.y + (win.y < 200 ? 70 : -70));
          lightGrad.addColorStop(0, 'rgba(34, 211, 238, 0.22)');
          lightGrad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
          ctx.fillStyle = lightGrad;
          ctx.fillRect(win.x, win.y + (win.y < 200 ? win.h : -70), win.w, 70);

          // Flowing breeze wave lines
          const breezeOffset = (time * 24) % 40;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 8]);
          ctx.beginPath();
          const waveY = win.y + (win.y < 200 ? 12 + breezeOffset : -breezeOffset);
          ctx.moveTo(win.x + 25, waveY);
          ctx.lineTo(win.x + win.w - 25, waveY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Open Pill Badge
          ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
          ctx.beginPath();
          ctx.roundRect(win.x + win.w / 2 - 65, win.y + (win.y < 200 ? 16 : -26), 130, 20, 10);
          ctx.fill();
          ctx.fillStyle = '#041724';
          ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`🌧️ OPEN • ${win.soundLabel.split(' ')[0]} Sound`, win.x + win.w / 2, win.y + (win.y < 200 ? 29 : -13));
        } else {
          // Closed Window: Glistening glass reflections & rain droplets
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.fillRect(win.x, win.y, win.w, win.h);

          // Specular diagonal reflection
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(win.x + 20, win.y);
          ctx.lineTo(win.x + 50, win.y + win.h);
          ctx.stroke();

          // Closed Badge
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(win.x + win.w / 2 - 50, win.y + (win.y < 200 ? 16 : -26), 100, 20, 10);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.stroke();
          ctx.fillStyle = '#94a3b8';
          ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Window Closed (Click)', win.x + win.w / 2, win.y + (win.y < 200 ? 29 : -13));
        }

        ctx.restore();
      });

      // --- 4. Executive Boardroom Table & Chairs ---
      const table = furniture.conferenceTable;
      ctx.save();
      // Drop shadow under walnut table
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;

      // Rich Walnut Wood Tabletop
      const tableGrad = ctx.createLinearGradient(table.x, table.y, table.x + table.w, table.y + table.h);
      tableGrad.addColorStop(0, '#2d211b');
      tableGrad.addColorStop(0.5, '#231813');
      tableGrad.addColorStop(1, '#1b120e');
      ctx.fillStyle = tableGrad;
      ctx.beginPath();
      ctx.roundRect(table.x, table.y, table.w, table.h, 24);
      ctx.fill();

      // Polished Brass Inlay & Lacquer Bevel
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(table.x + 7, table.y + 7, table.w - 14, table.h - 14, 18);
      ctx.stroke();

      // Center Glass Conference Inlay
      ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.beginPath();
      ctx.roundRect(table.x + 28, table.y + 24, table.w - 56, table.h - 48, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.stroke();

      ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BOARDROOM TABLE • 6 SEATS', table.x + table.w / 2, table.y + table.h / 2 + 3);

      // Ergonomic Executive Chairs around Table
      table.chairs.forEach((chair) => {
        const isPlayerHere = player.isSeated && Math.hypot(player.x - chair.x, player.y - chair.y) < 12;
        const isOccupied = chair.occupant || isPlayerHere;

        ctx.save();
        // Chair drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;

        // Chair Cushion Base
        ctx.fillStyle = isPlayerHere ? '#0891b2' : isOccupied ? '#1e293b' : '#151d2a';
        ctx.beginPath();
        ctx.arc(chair.x, chair.y, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Curved Ergonomic Mesh Backrest
        ctx.strokeStyle = isPlayerHere ? '#38bdf8' : isOccupied ? '#475569' : '#334155';
        ctx.lineWidth = 2.5;
        const isTopRow = chair.y < table.y + table.h / 2;
        ctx.beginPath();
        if (isTopRow) {
          ctx.arc(chair.x, chair.y - 3, 16, Math.PI * 1.1, Math.PI * 1.9);
        } else {
          ctx.arc(chair.x, chair.y + 3, 16, Math.PI * 0.1, Math.PI * 0.9);
        }
        ctx.stroke();

        if (!isOccupied) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SIT', chair.x, chair.y + 3);
        }
        ctx.restore();
      });
      ctx.restore();

      // --- 5. Interactive Presentation Whiteboard ---
      const wb = furniture.whiteboard;
      ctx.save();
      // Whiteboard drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wb.x, wb.y, wb.w, wb.h);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);

      // Floating Interactive Board Notes Card
      ctx.fillStyle = 'rgba(13, 18, 28, 0.9)';
      ctx.beginPath();
      ctx.roundRect(wb.x + 16, wb.y + 12, 180, 52, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('📋 SPRINT PRESENTATION', wb.x + 24, wb.y + 28);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('• Spatial Audio Proximity Curve', wb.x + 24, wb.y + 42);
      ctx.fillText('• Frosted Glass Wall Low-Pass (450Hz)', wb.x + 24, wb.y + 54);
      ctx.restore();

      // --- 6. Barista Coffee Station & Rising Steam ---
      const bar = furniture.espressoBar;
      ctx.save();
      // Wooden counter shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#1c1512';
      ctx.beginPath();
      ctx.roundRect(bar.x, bar.y, bar.w, bar.h, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Brushed Steel Espresso Machine
      const machineGrad = ctx.createLinearGradient(bar.x + 14, bar.y + 12, bar.x + 58, bar.y + 52);
      machineGrad.addColorStop(0, '#52525b');
      machineGrad.addColorStop(0.5, '#3f3f46');
      machineGrad.addColorStop(1, '#27272a');
      ctx.fillStyle = machineGrad;
      ctx.beginPath();
      ctx.roundRect(bar.x + 14, bar.y + 12, 46, 44, 6);
      ctx.fill();
      ctx.strokeStyle = '#71717a';
      ctx.stroke();

      // Espresso Portafilter & Cup
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(bar.x + 28, bar.y + 46, 5, 0, Math.PI * 2);
      ctx.fill();

      // Animated Steam Puffs Rising
      const steamY1 = bar.y + 36 - ((time * 24) % 24);
      const steamAlpha1 = Math.max(0, 1 - (bar.y + 36 - steamY1) / 24);
      ctx.fillStyle = `rgba(254, 243, 199, ${steamAlpha1 * 0.7})`;
      ctx.beginPath();
      ctx.arc(bar.x + 28 + Math.sin(time * 3) * 3, steamY1, 3 + (1 - steamAlpha1) * 5, 0, Math.PI * 2);
      ctx.fill();

      // Station Label
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('☕ ARTISAN CAFE', bar.x + 68, bar.y + 32);
      ctx.fillStyle = '#a8a29e';
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Click to Brew', bar.x + 68, bar.y + 46);
      ctx.restore();

      // --- 7. Biophilic Botanical Plants (Monstera, Fiddle-Leaf, Bonsai) ---
      plants.forEach((plant) => {
        ctx.save();
        const sway = Math.sin(time * 2.2 + plant.x * 0.1) * 2;

        // Pot Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        // Glazed Ceramic Planter
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(plant.x, plant.y, plant.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Organic Soil
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.arc(plant.x, plant.y, plant.radius * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Lush Multi-Layered Leaves
        const leafCount = plant.type === 'monstera' ? 6 : plant.type === 'bamboo' ? 5 : 7;
        for (let i = 0; i < leafCount; i++) {
          const angle = (i * (Math.PI * 2)) / leafCount + sway * 0.08;
          const leafLen = plant.radius * (0.85 + (i % 2) * 0.35);
          const lx = plant.x + Math.cos(angle) * leafLen;
          const ly = plant.y + Math.sin(angle) * leafLen;

          // Botanical gradient
          const leafGrad = ctx.createRadialGradient(plant.x, plant.y, 4, lx, ly, plant.radius * 0.5);
          leafGrad.addColorStop(0, '#047857');
          leafGrad.addColorStop(1, plant.color);
          ctx.fillStyle = leafGrad;

          ctx.beginPath();
          ctx.ellipse(lx, ly, plant.radius * 0.4, plant.radius * 0.22, angle, 0, Math.PI * 2);
          ctx.fill();

          // Leaf center vein
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(plant.x + Math.cos(angle) * 5, plant.y + Math.sin(angle) * 5);
          ctx.lineTo(lx, ly);
          ctx.stroke();
        }

        ctx.restore();
      });

      // --- 8. Frosted Fluted Glass Walls & Acoustic Partitions ---
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
          // Double-glazed frosted fluted glass wall
          ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
          ctx.shadowBlur = 6;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(wall.start.x, wall.start.y);
          ctx.lineTo(wall.end.x, wall.end.y);
          ctx.stroke();

          // Specular glass shine stripe
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 8]);
          ctx.beginPath();
          ctx.moveTo(wall.start.x, wall.start.y);
          ctx.lineTo(wall.end.x, wall.end.y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Solid acoustic panel
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

      // --- 9. Spatial Audio Mesh Connection Beams ---
      peers.forEach((peer) => {
        const dist = calculateDistance(player, peer);
        const inRange = dist <= earshotRadius;
        const isOccluded = checkWallOcclusion(player, peer, walls);

        if (inRange) {
          const gain = calculateProximityGain(dist, earshotRadius, isOccluded);
          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -time * 22;

          if (isOccluded) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
            ctx.lineWidth = 2;
          } else {
            const grad = ctx.createLinearGradient(player.x, player.y, peer.x, peer.y);
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.9)');
            grad.addColorStop(1, peer.color);
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(1.8, gain * 3.8);
          }

          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(peer.x, peer.y);
          ctx.stroke();

          // Midpoint Badge
          const midX = (player.x + peer.x) / 2;
          const midY = (player.y + peer.y) / 2;
          const volPercent = Math.round(gain * 100);

          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(11, 16, 26, 0.92)';
          ctx.beginPath();
          const tagW = isOccluded ? 138 : 102;
          ctx.roundRect(midX - tagW / 2, midY - 11, tagW, 22, 6);
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

      // --- 10. Local Player Earshot Radius Bubble ---
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
      radialGrad.addColorStop(0, 'rgba(6, 182, 212, 0.16)');
      radialGrad.addColorStop(0.7, 'rgba(6, 182, 212, 0.04)');
      radialGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, effectiveRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer boundary ring
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, effectiveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // --- 11. Remote Peers Avatars ---
      peers.forEach((peer) => {
        ctx.save();
        const dist = calculateDistance(player, peer);
        const inRange = dist <= earshotRadius;

        // Speaking Ripple
        if (peer.isSpeaking) {
          const rippleRadius = 22 + ((time * 22 + peer.speechCycle * 8) % 20);
          const alpha = 1 - (rippleRadius - 22) / 20;
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
        ctx.arc(peer.x, peer.y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(peer.name.charAt(0), peer.x, peer.y);

        // Nameplate Badge
        ctx.fillStyle = 'rgba(11, 16, 26, 0.9)';
        ctx.beginPath();
        const nameW = 108;
        ctx.roundRect(peer.x - nameW / 2, peer.y + 22, nameW, 20, 6);
        ctx.fill();
        ctx.strokeStyle = inRange ? peer.color : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = inRange ? '#f8fafc' : '#94a3b8';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(peer.name, peer.x, peer.y + 32);

        if (peer.statusTag) {
          ctx.fillStyle = '#64748b';
          ctx.font = '8px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(peer.statusTag, peer.x, peer.y + 52);
        }
        ctx.restore();
      });

      // --- 12. Local Player Avatar ---
      ctx.save();
      // Mic voice ripple pulse
      if (isMicActive && micDecibels > 0.05) {
        const micRipple = 20 + micDecibels * 35;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
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
      ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
      ctx.fill();

      // Inner Core
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('YOU', player.x, player.y);

      // Nameplate & Room Badge
      const currentRoom = getContainingRoom(player, rooms);
      ctx.fillStyle = 'rgba(8, 47, 73, 0.95)';
      ctx.beginPath();
      const tagW = 114;
      ctx.roundRect(player.x - tagW / 2, player.y + 24, tagW, 22, 6);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#f0fdf4';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(player.isSeated ? 'Seated at Table 👥' : player.name, player.x, player.y + 35);

      if (currentRoom) {
        ctx.fillStyle = currentRoom.color;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`[${currentRoom.name.split(' ')[0]}]`, player.x, player.y + 54);
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
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl glass-panel shadow-2xl">
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
      <div className="absolute top-4 left-4 glass-card px-3.5 py-2 text-xs text-slate-300 flex items-center gap-3 pointer-events-none shadow-xl rounded-xl">
        <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Click <strong className="text-cyan-300">Windows</strong> for rain/breeze • Click <strong className="text-emerald-300">Plants</strong> to rustle • Click <strong className="text-amber-300">Chairs</strong> to join meeting</span>
      </div>
    </div>
  );
}
export default SpatialCanvas;
