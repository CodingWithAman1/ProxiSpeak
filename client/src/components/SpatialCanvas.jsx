import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  calculateDistance,
  pixelsToMeters,
  calculateProximityGain,
  checkWallOcclusion,
  getContainingRoom,
  resolvePlayerMovement,
  isPositionColliding,
  calculateStereoPan,
} from '../utils/spatialGeometry';
import spatialAudio from '../utils/spatialAudioEngine';

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
  onSetDoorOpen,
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

  // Keep live references for collision engine & render loop without tearing down animation loop
  const wallsRef = useRef(walls);
  const doorsRef = useRef(doors);
  const playerRef = useRef(player);
  const peersRef = useRef(peers);
  const windowsRef = useRef(windows);
  const roomsRef = useRef(rooms);
  const plantsRef = useRef(plants);
  const furnitureRef = useRef(furniture);
  const earshotRadiusRef = useRef(earshotRadius);
  const isMicActiveRef = useRef(isMicActive);
  const collisionAlertsRef = useRef([]);

  useEffect(() => {
    wallsRef.current = walls;
  }, [walls]);

  useEffect(() => {
    doorsRef.current = doors;
  }, [doors]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    plantsRef.current = plants;
  }, [plants]);

  useEffect(() => {
    furnitureRef.current = furniture;
  }, [furniture]);

  useEffect(() => {
    earshotRadiusRef.current = earshotRadius;
  }, [earshotRadius]);

  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  // Sync target pos if player was teleported or seated externally
  useEffect(() => {
    if (Math.abs(targetPosRef.current.x - player.x) > 35 || Math.abs(targetPosRef.current.y - player.y) > 35) {
      targetPosRef.current = { x: player.x, y: player.y };
    }
  }, [player.x, player.y]);

  // Helper to trigger a brief visual collision warning on restricted paths
  const triggerCollisionWarning = useCallback((x, y, message = '⛔ Restricted Path: Solid Wall') => {
    collisionAlertsRef.current.push({
      x,
      y,
      message,
      createdAt: Date.now(),
    });
    if (collisionAlertsRef.current.length > 5) {
      collisionAlertsRef.current.shift();
    }
  }, []);

  // Keyboard movement with wall collision restriction & smooth sliding
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
      const speed = 5.2;

      if (keysDown.has('w') || keysDown.has('arrowup')) dy -= speed;
      if (keysDown.has('s') || keysDown.has('arrowdown')) dy += speed;
      if (keysDown.has('a') || keysDown.has('arrowleft')) dx -= speed;
      if (keysDown.has('d') || keysDown.has('arrowright')) dx += speed;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      setPlayer((prev) => {
        const rawCandidate = {
          x: Math.max(24, Math.min(1000, prev.x + dx)),
          y: Math.max(24, Math.min(548, prev.y + dy)),
        };

        // Enforce physical walls and closed doors as barriers
        const resolved = resolvePlayerMovement(prev, rawCandidate, 12, wallsRef.current, doorsRef.current);

        // If movement was blocked by a wall or closed door
        if (Math.hypot(resolved.x - prev.x, resolved.y - prev.y) < 0.1 && (dx !== 0 || dy !== 0)) {
          const closedDoorNear = doorsRef.current.find(
            (d) => !d.isOpen && Math.hypot(d.x + d.w / 2 - prev.x, d.y + d.h / 2 - prev.y) < 32
          );
          if (closedDoorNear) {
            triggerCollisionWarning(closedDoorNear.x + closedDoorNear.w / 2, closedDoorNear.y + closedDoorNear.h / 2, '🔒 Door is Closed (Click to Open)');
          }
        }

        targetPosRef.current = { x: resolved.x, y: resolved.y };
        playerRef.current = { ...prev, x: resolved.x, y: resolved.y, isSeated: false };
        return playerRef.current;
      });
    }, 20);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(stepInterval);
    };
  }, [setPlayer, triggerCollisionWarning]);

  // Click & Drag Interaction Handler
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. Check Doors Click (Manual Open / Close)
    for (const door of doorsRef.current) {
      if (
        clickX >= door.x - 14 &&
        clickX <= door.x + door.w + 14 &&
        clickY >= door.y - 14 &&
        clickY <= door.y + door.h + 14
      ) {
        if (onToggleDoor) onToggleDoor(door.id);
        return;
      }
    }

    // 2. Check Windows Click (Generous 16px hitbox padding on all sides)
    for (const win of windowsRef.current) {
      const padX = win.orientation === 'vertical' ? 16 : 8;
      const padY = win.orientation === 'vertical' ? 8 : 16;
      if (
        clickX >= win.x - padX &&
        clickX <= win.x + win.w + padX &&
        clickY >= win.y - padY &&
        clickY <= win.y + win.h + padY
      ) {
        if (onToggleWindow) onToggleWindow(win.id);
        return;
      }
    }

    // 3. Check Chairs (Boardroom Table & Desks)
    const table = furnitureRef.current.conferenceTable;
    for (const chair of table.chairs) {
      if (Math.hypot(clickX - chair.x, clickY - chair.y) <= 18) {
        if (onSitChair) onSitChair(chair);
        return;
      }
    }

    // 4. Check Coffee Machine
    const coffee = furnitureRef.current.coffeeMachine;
    if (Math.hypot(clickX - coffee.x, clickY - coffee.y) <= 24) {
      if (onBrewCoffee) onBrewCoffee();
      return;
    }

    // 5. Check Water Coolers
    for (const cooler of furnitureRef.current.waterCoolers) {
      if (Math.hypot(clickX - cooler.x, clickY - cooler.y) <= cooler.radius + 8) {
        if (onDrinkWater) onDrinkWater(cooler);
        return;
      }
    }

    // 6. Check Whiteboard
    const wb = furnitureRef.current.whiteboard;
    if (
      clickX >= wb.x &&
      clickX <= wb.x + wb.w &&
      clickY >= wb.y &&
      clickY <= wb.y + wb.h + 20
    ) {
      if (onToggleWhiteboard) onToggleWhiteboard();
      return;
    }

    // 7. Check Plants
    for (const plant of plantsRef.current) {
      if (Math.hypot(clickX - plant.x, clickY - plant.y) <= plant.radius + 10) {
        if (onInteractPlant) onInteractPlant(plant);
        return;
      }
    }

    // 8. Check Peers Click
    for (const peer of peersRef.current) {
      if (Math.hypot(clickX - peer.x, clickY - peer.y) < 24) {
        if (onPeerClick) onPeerClick(peer);
        return;
      }
    }

    // 9. Walk to location with Wall Collision Enforcement
    const isTargetColliding = isPositionColliding({ x: clickX, y: clickY }, 12, wallsRef.current, doorsRef.current);
    if (isTargetColliding) {
      const closedDoor = doorsRef.current.find(
        (d) => !d.isOpen && clickX >= d.x - 12 && clickX <= d.x + d.w + 12 && clickY >= d.y - 12 && clickY <= d.y + d.h + 12
      );
      if (closedDoor) {
        triggerCollisionWarning(clickX, clickY, '🔒 Door Closed: Click to Open');
      } else {
        triggerCollisionWarning(clickX, clickY, '⛔ Restricted Path: Solid Wall Barrier');
      }
    }

    targetPosRef.current = { x: clickX, y: clickY };
    isDraggingPlayer.current = true;
    if (onCanvasClick) onCanvasClick({ x: clickX, y: clickY });
  }, [onToggleDoor, onToggleWindow, onSitChair, onBrewCoffee, onDrinkWater, onToggleWhiteboard, onInteractPlant, onPeerClick, onCanvasClick, triggerCollisionWarning]);

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

  // Main 60 FPS Procedural Architectural Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const render = () => {
      time += 0.025;

      // --- A. Smooth Door Lerp ---
      doorsRef.current.forEach((door) => {
        const target = door.isOpen ? 1 : 0;
        const lerpSpeed = door.type === 'glass_double' ? 0.09 : 0.08;
        if (door.openProgress === undefined) door.openProgress = target;
        if (Math.abs(door.openProgress - target) > 0.003) {
          door.openProgress += (target - door.openProgress) * lerpSpeed;
        } else {
          door.openProgress = target;
        }
      });

      // --- B. Smooth Avatar Lerp with Wall Collision Restrictions ---
      const curPlayer = playerRef.current;
      if (!curPlayer.isSeated) {
        const tx = targetPosRef.current.x;
        const ty = targetPosRef.current.y;
        const dist = Math.hypot(tx - curPlayer.x, ty - curPlayer.y);

        if (dist > 1.2) {
          const stepSpeed = Math.min(dist, 4.8);
          const angle = Math.atan2(ty - curPlayer.y, tx - curPlayer.x);
          const candidate = {
            x: curPlayer.x + Math.cos(angle) * stepSpeed,
            y: curPlayer.y + Math.sin(angle) * stepSpeed,
          };

          const resolved = resolvePlayerMovement(curPlayer, candidate, 12, wallsRef.current, doorsRef.current);
          const moved = Math.hypot(resolved.x - curPlayer.x, resolved.y - curPlayer.y);
          if (moved < 0.05 && dist > 5) {
            targetPosRef.current = { x: resolved.x, y: resolved.y };
          }

          playerRef.current = {
            ...curPlayer,
            x: resolved.x,
            y: resolved.y,
          };
          setPlayer(playerRef.current);
        }
      }

      // =========================================================================
      // 1. PROCEDURAL ARCHITECTURAL FLOOR MATERIALS & ROOM ZONING
      // =========================================================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep foundation base
      ctx.fillStyle = '#080d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render room zones with tactile material textures
      roomsRef.current.forEach((room) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(room.x, room.y, room.w, room.h);
        ctx.clip();

        if (room.floorType === 'teak_parquet') {
          // Executive Boardroom: Warm polished teak hardwood parquet
          const grad = ctx.createLinearGradient(room.x, room.y, room.x + room.w, room.y + room.h);
          grad.addColorStop(0, '#532b12');
          grad.addColorStop(1, '#693717');
          ctx.fillStyle = grad;
          ctx.fillRect(room.x, room.y, room.w, room.h);

          // Alternating teak floorboard plank lines
          ctx.strokeStyle = 'rgba(25, 12, 5, 0.45)';
          ctx.lineWidth = 1;
          for (let py = room.y; py <= room.y + room.h; py += 16) {
            ctx.beginPath();
            ctx.moveTo(room.x, py);
            ctx.lineTo(room.x + room.w, py);
            ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(235, 180, 130, 0.08)';
          for (let px = room.x; px <= room.x + room.w; px += 44) {
            ctx.beginPath();
            ctx.moveTo(px, room.y);
            ctx.lineTo(px, room.y + room.h);
            ctx.stroke();
          }
        } else if (room.floorType === 'basalt_slate') {
          // Central Atrium & Corridor: Basalt slate large format pavers
          const grad = ctx.createLinearGradient(room.x, room.y, room.x, room.y + room.h);
          grad.addColorStop(0, '#1a2433');
          grad.addColorStop(1, '#1e2b3c');
          ctx.fillStyle = grad;
          ctx.fillRect(room.x, room.y, room.w, room.h);

          // Slate tile grid & joint grout
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
          ctx.lineWidth = 1;
          for (let px = room.x; px <= room.x + room.w; px += 35) {
            ctx.beginPath();
            ctx.moveTo(px, room.y);
            ctx.lineTo(px, room.y + room.h);
            ctx.stroke();
          }
          for (let py = room.y; py <= room.y + room.h; py += 35) {
            ctx.beginPath();
            ctx.moveTo(room.x, py);
            ctx.lineTo(room.x + room.w, py);
            ctx.stroke();
          }

          // Center accent runner strip
          ctx.fillStyle = 'rgba(6, 182, 212, 0.06)';
          ctx.fillRect(room.x + room.w / 2 - 24, room.y, 48, room.h);
        } else if (room.floorType === 'tech_carpet') {
          // Developer Hub: High-density acoustic dark charcoal carpet tile
          const grad = ctx.createLinearGradient(room.x, room.y, room.x + room.w, room.y);
          grad.addColorStop(0, '#121822');
          grad.addColorStop(1, '#17202e');
          ctx.fillStyle = grad;
          ctx.fillRect(room.x, room.y, room.w, room.h);

          // Carpet weave micro-grid
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
          ctx.lineWidth = 1;
          for (let px = room.x; px <= room.x + room.w; px += 28) {
            ctx.beginPath();
            ctx.moveTo(px, room.y);
            ctx.lineTo(px, room.y + room.h);
            ctx.stroke();
          }
          for (let py = room.y; py <= room.y + room.h; py += 28) {
            ctx.beginPath();
            ctx.moveTo(room.x, py);
            ctx.lineTo(room.x + room.w, py);
            ctx.stroke();
          }
        } else if (room.floorType === 'hex_bistro') {
          // Cafeteria & Lounge: Hex bistro ceramic tile with warm oak cafe bar zone
          ctx.fillStyle = '#222d3b';
          ctx.fillRect(room.x, room.y, room.w, room.h);

          // Warm wooden lounge floor near seating
          ctx.fillStyle = 'rgba(120, 65, 25, 0.18)';
          ctx.fillRect(room.x + 30, room.y + 40, room.w - 50, room.h - 70);

          ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
          ctx.lineWidth = 1;
          for (let px = room.x; px <= room.x + room.w; px += 24) {
            ctx.beginPath();
            ctx.moveTo(px, room.y);
            ctx.lineTo(px, room.y + room.h);
            ctx.stroke();
          }
        } else if (room.floorType === 'travertine_marble') {
          // Welcome Lobby & Reception: Travertine marble with brass perimeter inlays
          const grad = ctx.createLinearGradient(room.x, room.y, room.x, room.y + room.h);
          grad.addColorStop(0, '#36281d');
          grad.addColorStop(1, '#423225');
          ctx.fillStyle = grad;
          ctx.fillRect(room.x, room.y, room.w, room.h);

          // Inlay borders
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(room.x + 12, room.y + 12, room.w - 24, room.h - 24);
        } else if (room.floorType === 'acoustic_felt') {
          // Focus Pods: Deep acoustic sound-dampening felt
          ctx.fillStyle = '#1e112d';
          ctx.fillRect(room.x, room.y, room.w, room.h);
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
          ctx.lineWidth = 1;
          for (let py = room.y; py <= room.y + room.h; py += 18) {
            ctx.beginPath();
            ctx.moveTo(room.x, py);
            ctx.lineTo(room.x + room.w, py);
            ctx.stroke();
          }
        } else {
          // Restrooms: Clean modern porcelain subway tile
          ctx.fillStyle = '#263342';
          ctx.fillRect(room.x, room.y, room.w, room.h);
          ctx.strokeStyle = 'rgba(241, 245, 249, 0.14)';
          ctx.lineWidth = 1;
          for (let px = room.x; px <= room.x + room.w; px += 20) {
            ctx.beginPath();
            ctx.moveTo(px, room.y);
            ctx.lineTo(px, room.y + room.h);
            ctx.stroke();
          }
        }

        // Room architectural watermarked title
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${room.name.toUpperCase()} • ${room.code}`, room.x + 16, room.y + 14);

        ctx.restore();
      });

      // =========================================================================
      // 2. REAL MULTI-PANE ARCHITECTURAL PANORAMIC WINDOWS
      // =========================================================================
      windowsRef.current.forEach((win) => {
        ctx.save();
        const isVert = win.orientation === 'vertical';

        // --- A. Window Sill & Outer Structural Framing ---
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(win.x - 2, win.y - 2, win.w + 4, win.h + 4);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(win.x - 2, win.y - 2, win.w + 4, win.h + 4);

        if (win.isOpen) {
          // --- B. Open Window: Atmospheric Sun & Rain Volumetric Light Cone ---
          let lightGrad;
          if (isVert) {
            const isWest = win.x < 100;
            const xEnd = isWest ? win.x + win.w + 70 : win.x - 70;
            lightGrad = ctx.createLinearGradient(win.x, win.y, xEnd, win.y);
            lightGrad.addColorStop(0, 'rgba(56, 189, 248, 0.38)');
            lightGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
            ctx.fillStyle = lightGrad;
            ctx.fillRect(isWest ? win.x : win.x - 70, win.y, win.w + 70, win.h);
          } else {
            const isNorth = win.y < 100;
            const yEnd = isNorth ? win.y + win.h + 65 : win.y - 65;
            lightGrad = ctx.createLinearGradient(win.x, win.y, win.x, yEnd);
            lightGrad.addColorStop(0, 'rgba(56, 189, 248, 0.38)');
            lightGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
            ctx.fillStyle = lightGrad;
            ctx.fillRect(win.x, isNorth ? win.y : win.y - 65, win.w, win.h + 65);
          }

          // Live animated drifting breeze / rain particle ripples
          const numParticles = 6;
          for (let i = 0; i < numParticles; i++) {
            const particlePhase = (time * 1.8 + i * 1.5) % 3;
            const alpha = Math.max(0, 1 - particlePhase / 3) * 0.75;
            ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
            let px, py;
            if (isVert) {
              const dir = win.x < 100 ? 1 : -1;
              px = win.x + win.w / 2 + dir * (particlePhase * 22);
              py = win.y + 20 + i * (win.h / numParticles) + Math.sin(time * 2 + i) * 6;
            } else {
              const dir = win.y < 100 ? 1 : -1;
              px = win.x + 20 + i * (win.w / numParticles) + Math.cos(time * 2 + i) * 6;
              py = win.y + win.h / 2 + dir * (particlePhase * 20);
            }
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Glass Open Cavity
          ctx.fillStyle = 'rgba(6, 182, 212, 0.16)';
          ctx.fillRect(win.x, win.y, win.w, win.h);

          // Flowing acoustic breeze dash wave
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 6]);
          ctx.lineDashOffset = -time * 25;
          ctx.beginPath();
          if (isVert) {
            ctx.moveTo(win.x + win.w / 2, win.y + 6);
            ctx.lineTo(win.x + win.w / 2, win.y + win.h - 6);
          } else {
            ctx.moveTo(win.x + 6, win.y + win.h / 2);
            ctx.lineTo(win.x + win.w - 6, win.y + win.h / 2);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Interactive Status Pill
          const midX = win.x + win.w / 2;
          const midY = win.y + win.h / 2;
          const pillX = isVert ? (win.x < 100 ? win.x + win.w + 48 : win.x - 48) : midX;
          const pillY = isVert ? midY : (win.y < 100 ? win.y + win.h + 16 : win.y - 14);

          ctx.fillStyle = 'rgba(2, 132, 199, 0.92)';
          ctx.beginPath();
          ctx.roundRect(pillX - 52, pillY - 9, 104, 18, 9);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#f0fdf4';
          ctx.font = 'bold 8.5px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌧️ OPEN (Click)', pillX, pillY);
        } else {
          // --- C. Closed Window: Multi-Pane Glazing with Mullions & Specular Reflection ---
          ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
          ctx.fillRect(win.x, win.y, win.w, win.h);

          const panes = win.panes || 4;
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.2;

          if (isVert) {
            const paneH = win.h / panes;
            for (let i = 1; i < panes; i++) {
              ctx.beginPath();
              ctx.moveTo(win.x, win.y + i * paneH);
              ctx.lineTo(win.x + win.w, win.y + i * paneH);
              ctx.stroke();
            }
          } else {
            const paneW = win.w / panes;
            for (let i = 1; i < panes; i++) {
              ctx.beginPath();
              ctx.moveTo(win.x + i * paneW, win.y);
              ctx.lineTo(win.x + i * paneW, win.y + win.h);
              ctx.stroke();
            }
          }

          // Specular Glaze Reflections
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 1;
          if (isVert) {
            ctx.beginPath();
            ctx.moveTo(win.x + 3, win.y + 12);
            ctx.lineTo(win.x + win.w - 3, win.y + 36);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(win.x + 12, win.y + win.h - 3);
            ctx.lineTo(win.x + 36, win.y + 3);
            ctx.stroke();
          }

          // Closed Status Pill (Subtle interactive hint)
          const midX = win.x + win.w / 2;
          const midY = win.y + win.h / 2;
          const pillX = isVert ? (win.x < 100 ? win.x + win.w + 48 : win.x - 48) : midX;
          const pillY = isVert ? midY : (win.y < 100 ? win.y + win.h + 16 : win.y - 14);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.beginPath();
          ctx.roundRect(pillX - 52, pillY - 9, 104, 18, 9);
          ctx.fill();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#cbd5e1';
          ctx.font = 'bold 8.5px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪟 CLOSED (Click)', pillX, pillY);
        }
        ctx.restore();
      });

      // =========================================================================
      // 3. ARCHITECTURAL STRUCTURAL WALLS & FROSTED GLASS ACOUSTIC PARTITIONS
      // =========================================================================
      wallsRef.current.forEach((w) => {
        // Skip drawing furniture obstacle collision lines as walls
        if (w.type === 'furniture_obstacle') return;

        ctx.save();
        if (w.type === 'glass_partition') {
          // --- A. Frosted Cyan Double-Glazed Acoustic Glass Partition ---
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();

          // Glass core highlight
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();

          // Brushed Aluminum Mullion Posts along the glass partition
          const dx = w.end.x - w.start.x;
          const dy = w.end.y - w.start.y;
          const len = Math.hypot(dx, dy);
          const postSpacing = 36;
          const count = Math.floor(len / postSpacing);
          ctx.fillStyle = '#cbd5e1';
          for (let i = 0; i <= count; i++) {
            const frac = i / count;
            const mx = w.start.x + dx * frac;
            const my = w.start.y + dy * frac;
            ctx.beginPath();
            ctx.arc(mx, my, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (w.type === 'exterior') {
          // --- B. Heavy 12px Exterior Perimeter Concrete / Graphite Walls ---
          // Outer structural shadow
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();

          // Solid graphite core
          ctx.strokeStyle = '#182230';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();

          // Outer architectural drafting contour
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();
        } else {
          // --- C. Solid 8px Interior Divider Walls ---
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();

          // Interior wall border lines
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w.start.x, w.start.y);
          ctx.lineTo(w.end.x, w.end.y);
          ctx.stroke();

          // End jamb caps
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(w.start.x, w.start.y, 4, 0, Math.PI * 2);
          ctx.arc(w.end.x, w.end.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Structural Reinforced Corner Pillars
      const cornerColumns = [
        { x: 18, y: 16 },
        { x: 1000, y: 16 },
        { x: 18, y: 552 },
        { x: 1000, y: 552 },
        { x: 436, y: 16 },
        { x: 577, y: 16 },
        { x: 410, y: 552 },
        { x: 544, y: 552 },
      ];
      cornerColumns.forEach((col) => {
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(col.x - 7, col.y - 7, 14, 14);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(col.x - 7, col.y - 7, 14, 14);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(col.x, col.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // =========================================================================
      // 4. INTERACTIVE DOORS & AUTOMATIC SLIDING GATES
      // =========================================================================
      doorsRef.current.forEach((door) => {
        ctx.save();
        const progress = door.openProgress !== undefined ? door.openProgress : (door.isOpen ? 1 : 0);

        if (door.type === 'glass_double') {
          // AUTOMATIC SLIDING GLASS GATE
          const halfW = door.w / 2;
          const slideDist = (halfW - 5) * progress;

          // Stainless Steel Header Track
          ctx.fillStyle = '#334155';
          ctx.fillRect(door.x - 2, door.y - 3, door.w + 4, 5);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.strokeRect(door.x - 2, door.y - 3, door.w + 4, 5);

          // Floor guide track
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(door.x - 2, door.y + door.h - 2, door.w + 4, 4);

          // Walkway Threshold Glow
          const trackAlpha = 0.25 + progress * 0.45;
          ctx.fillStyle = progress > 0.4 ? `rgba(16, 185, 129, ${trackAlpha * 0.35})` : `rgba(245, 158, 11, ${trackAlpha * 0.25})`;
          ctx.fillRect(door.x + 2, door.y + 2, door.w - 4, door.h - 4);

          // Motion Sensor Puck
          const isSensorActive = door.sensorActive;
          ctx.fillStyle = isSensorActive ? '#10b981' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(door.x + halfW, door.y - 3, 3.5, 0, Math.PI * 2);
          ctx.fill();

          if (isSensorActive) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            const ringR = 6 + ((time * 24) % 12);
            ctx.arc(door.x + halfW, door.y - 3, ringR, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Left Sliding Glass Panel
          const leftX = door.x - slideDist;
          ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
          ctx.fillRect(leftX, door.y, halfW, door.h);
          ctx.strokeStyle = progress > 0.5 ? '#34d399' : '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(leftX, door.y, halfW, door.h);

          // Right Sliding Glass Panel
          const rightX = door.x + halfW + slideDist;
          ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
          ctx.fillRect(rightX, door.y, halfW, door.h);
          ctx.strokeStyle = progress > 0.5 ? '#34d399' : '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(rightX, door.y, halfW, door.h);

          // Door Status Pill
          const badgeY = door.y < 100 ? door.y + door.h + 14 : door.y - 12;
          let badgeText = 'GATE CLOSED';
          let badgeBg = 'rgba(15, 23, 42, 0.9)';
          let badgeColor = '#94a3b8';

          if (isSensorActive) {
            badgeText = '⚡ SENSOR: SLIDING OPEN';
            badgeBg = 'rgba(6, 78, 59, 0.95)';
            badgeColor = '#34d399';
          } else if (progress > 0.85) {
            badgeText = 'GATE OPEN (Walk)';
            badgeBg = 'rgba(6, 78, 59, 0.92)';
            badgeColor = '#6ee7b7';
          } else if (progress > 0.05) {
            badgeText = door.isOpen ? 'OPENING...' : 'CLOSING...';
            badgeBg = 'rgba(120, 53, 15, 0.92)';
            badgeColor = '#fde047';
          }

          ctx.fillStyle = badgeBg;
          ctx.beginPath();
          ctx.roundRect(door.x + halfW - 55, badgeY - 8, 110, 16, 8);
          ctx.fill();
          ctx.strokeStyle = progress > 0.5 ? '#10b981' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = badgeColor;
          ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, door.x + halfW, badgeY);
        } else {
          // WOODEN SINGLE-LEAF SWING DOOR
          const isVertical = door.orientation === 'vertical';
          const maxAngle = Math.PI / 2.15;
          const angle = progress * maxAngle;
          const leafLen = isVertical ? door.h : door.w;
          const leafThick = 4.5;

          let hingeX = door.x;
          let hingeY = door.y;

          if (isVertical) {
            hingeX = door.x + door.w / 2;
            hingeY = door.hinge === 'bottom' ? door.y + door.h : door.y;
          } else {
            hingeX = door.hinge === 'right' ? door.x + door.w : door.x;
            hingeY = door.y + door.h / 2;
          }

          // Swing Arc Guideline
          if (progress > 0.05) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            const baseAngle = isVertical ? (door.hinge === 'bottom' ? -Math.PI / 2 : Math.PI / 2) : (door.hinge === 'right' ? Math.PI : 0);
            const rotSign = (door.hinge === 'right' || door.hinge === 'bottom') ? -1 : 1;
            ctx.arc(hingeX, hingeY, leafLen, baseAngle, baseAngle + angle * rotSign, rotSign < 0);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Open threshold
          if (progress > 0.3) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(door.x, door.y, door.w, door.h);
          }

          // Frame Jambs
          ctx.fillStyle = '#475569';
          if (isVertical) {
            ctx.fillRect(door.x - 2, door.y - 2, door.w + 4, 3);
            ctx.fillRect(door.x - 2, door.y + door.h - 1, door.w + 4, 3);
          } else {
            ctx.fillRect(door.x - 2, door.y - 2, 3, door.h + 4);
            ctx.fillRect(door.x + door.w - 1, door.y - 2, 3, door.h + 4);
          }

          // Rotating Wood Door Leaf
          ctx.save();
          ctx.translate(hingeX, hingeY);
          const rotDirection = (door.hinge === 'right' || door.hinge === 'bottom') ? -1 : 1;
          ctx.rotate(rotDirection * angle);

          const woodGrad = ctx.createLinearGradient(0, 0, leafLen, 0);
          woodGrad.addColorStop(0, '#78350f');
          woodGrad.addColorStop(1, '#b45309');
          ctx.fillStyle = woodGrad;

          if (isVertical) {
            ctx.fillRect(-leafThick / 2, 0, leafThick, leafLen);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(-leafThick / 2, 0, leafThick, leafLen);
            // Brass handle
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(0, leafLen * 0.85, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(0, -leafThick / 2, leafLen, leafThick);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, -leafThick / 2, leafLen, leafThick);
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(leafLen * 0.85, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Door Status Badge
          const midX = door.x + door.w / 2;
          const tagY = door.y < 100 ? door.y + door.h + 14 : door.y - 10;
          ctx.fillStyle = progress > 0.5 ? 'rgba(6, 78, 59, 0.9)' : 'rgba(15, 23, 42, 0.88)';
          ctx.beginPath();
          ctx.roundRect(midX - 42, tagY - 7, 84, 15, 7);
          ctx.fill();
          ctx.strokeStyle = progress > 0.5 ? '#10b981' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = progress > 0.5 ? '#6ee7b7' : '#cbd5e1';
          ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(progress > 0.85 ? 'OPEN (Walk)' : 'CLOSED (Click)', midX, tagY);
        }
        ctx.restore();
      });

      // =========================================================================
      // 5. INTERACTIVE FURNITURE & AMENITIES
      // =========================================================================
      // Conference Table & Chairs
      const table = furnitureRef.current.conferenceTable;
      ctx.save();
      // Table drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(table.x, table.y + 4, table.w / 2, table.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Table solid slab
      const tableGrad = ctx.createLinearGradient(table.x - table.w / 2, table.y, table.x + table.w / 2, table.y);
      tableGrad.addColorStop(0, '#451a03');
      tableGrad.addColorStop(0.5, '#78350f');
      tableGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = tableGrad;
      ctx.beginPath();
      ctx.ellipse(table.x, table.y, table.w / 2, table.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center tech wire raceway
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(table.x - 45, table.y - 8, 90, 16, 4);
      ctx.fill();
      ctx.restore();

      // Chairs
      table.chairs.forEach((chair) => {
        const isPlayerHere = curPlayer.isSeated && Math.hypot(curPlayer.x - chair.x, curPlayer.y - chair.y) < 12;
        const isOccupied = chair.occupant || isPlayerHere;

        ctx.save();
        ctx.fillStyle = isOccupied ? '#0369a1' : '#334155';
        ctx.beginPath();
        ctx.arc(chair.x, chair.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isOccupied ? '#38bdf8' : '#64748b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (!isOccupied) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 7px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SIT', chair.x, chair.y);
        }
        ctx.restore();
      });

      // Developer Workstations
      const devRows = [
        { y: 115, monitors: 4 },
        { y: 275, monitors: 4 },
        { y: 435, monitors: 4 },
      ];
      devRows.forEach((row) => {
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(50, row.y - 12, 300, 24);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(50, row.y - 12, 300, 24);

        // Screens with glowing IDE terminals
        for (let i = 0; i < row.monitors; i++) {
          const mx = 75 + i * 72;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(mx - 14, row.y - 7, 28, 14);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.strokeRect(mx - 14, row.y - 7, 28, 14);

          // Glowing IDE syntax line
          ctx.fillStyle = i % 2 === 0 ? '#34d399' : '#06b6d4';
          ctx.fillRect(mx - 10, row.y - 2, 20, 2);
        }
        ctx.restore();
      });

      // Barista Espresso Bar & Animated Steam
      const coffee = furnitureRef.current.coffeeMachine;
      ctx.save();
      // Counter
      ctx.fillStyle = '#3f2212';
      ctx.fillRect(655, 260, 145, 24);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(655, 260, 145, 24);

      // Coffee machine block
      ctx.fillStyle = '#475569';
      ctx.fillRect(coffee.x - 12, coffee.y - 10, 24, 20);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(coffee.x - 12, coffee.y - 10, 24, 20);

      // Animated rising steam
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
      ctx.textBaseline = 'middle';
      ctx.fillText('☕ BREW', coffee.x, coffee.y + 22);
      ctx.restore();

      // 4K Presentation Display
      const wb = furnitureRef.current.whiteboard;
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wb.x, wb.y, wb.w, wb.h);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('4K DISPLAY', wb.x + wb.w / 2, wb.y + 14);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(wb.x - 20, wb.y + wb.h + 3, wb.w + 40, 16, 6);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = '8px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`📋 ${wb.slides[wb.slideIndex].slice(0, 28)}...`, wb.x + wb.w / 2, wb.y + wb.h + 12);
      ctx.restore();

      // Lush Biophilic Plants
      plantsRef.current.forEach((plant) => {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(plant.x, plant.y + 3, plant.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(plant.x, plant.y, plant.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(plant.x - 4, plant.y - 4, plant.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // =========================================================================
      // 6. SPATIAL MESH AUDIO RAYS & OCCLUSION BEAMS
      // =========================================================================
      const activeAcousticWalls = [...wallsRef.current];
      doorsRef.current.forEach((door) => {
        const isPassable = door.isOpen && (door.openProgress === undefined || door.openProgress >= 0.65);
        if (!isPassable) {
          if (door.orientation === 'vertical') {
            const midX = door.x + door.w / 2;
            activeAcousticWalls.push({
              id: `wall-closed-${door.id}`,
              start: { x: midX, y: door.y },
              end: { x: midX, y: door.y + door.h },
            });
          } else {
            const midY = door.y + door.h / 2;
            activeAcousticWalls.push({
              id: `wall-closed-${door.id}`,
              start: { x: door.x, y: midY },
              end: { x: door.x + door.w, y: midY },
            });
          }
        }
      });

      peersRef.current.forEach((peer) => {
        const dist = calculateDistance(curPlayer, peer);
        const inRange = dist <= earshotRadiusRef.current;
        const isOccluded = checkWallOcclusion(curPlayer, peer, activeAcousticWalls);

        if (inRange) {
          const gain = calculateProximityGain(dist, earshotRadiusRef.current, isOccluded);
          ctx.save();
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -time * 20;

          if (isOccluded) {
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
            ctx.lineWidth = 2;
          } else {
            const grad = ctx.createLinearGradient(curPlayer.x, curPlayer.y, peer.x, peer.y);
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.9)');
            grad.addColorStop(1, peer.color);
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(1.8, gain * 4);
          }

          ctx.beginPath();
          ctx.moveTo(curPlayer.x, curPlayer.y);
          ctx.lineTo(peer.x, peer.y);
          ctx.stroke();

          // Midpoint distance & volume badge
          const midX = (curPlayer.x + peer.x) / 2;
          const midY = (curPlayer.y + peer.y) / 2;
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

      // =========================================================================
      // 7. LOCAL PLAYER EARSHOT RADIUS BUBBLE
      // =========================================================================
      ctx.save();
      const pulse = Math.sin(time * 2.5) * 3;
      const effectiveRadius = earshotRadiusRef.current + pulse;

      const radialGrad = ctx.createRadialGradient(
        curPlayer.x,
        curPlayer.y,
        effectiveRadius * 0.2,
        curPlayer.x,
        curPlayer.y,
        effectiveRadius
      );
      radialGrad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
      radialGrad.addColorStop(0.65, 'rgba(6, 182, 212, 0.05)');
      radialGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.fillStyle = radialGrad;
      ctx.beginPath();
      ctx.arc(curPlayer.x, curPlayer.y, effectiveRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(curPlayer.x, curPlayer.y, effectiveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // =========================================================================
      // 8. PEERS AVATARS
      // =========================================================================
      peersRef.current.forEach((peer) => {
        ctx.save();
        const dist = calculateDistance(curPlayer, peer);
        const inRange = dist <= earshotRadiusRef.current;

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

        // Nameplate
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

      // =========================================================================
      // 9. LOCAL PLAYER AVATAR
      // =========================================================================
      ctx.save();
      const liveMicVol = spatialAudio.getMicVolume();
      if (isMicActiveRef.current && liveMicVol > 0.05) {
        const micRipple = 18 + liveMicVol * 30;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(curPlayer.x, curPlayer.y, micRipple, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(curPlayer.x, curPlayer.y, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.arc(curPlayer.x, curPlayer.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('YOU', curPlayer.x, curPlayer.y);

      // Nameplate & Room Badge
      const currentRoom = getContainingRoom(curPlayer, roomsRef.current);
      ctx.fillStyle = 'rgba(8, 47, 73, 0.95)';
      ctx.beginPath();
      const tagW = 106;
      ctx.roundRect(curPlayer.x - tagW / 2, curPlayer.y + 20, tagW, 20, 6);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#f0fdf4';
      ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(curPlayer.isSeated ? 'Seated at Table 👥' : curPlayer.name, curPlayer.x, curPlayer.y + 30);

      if (currentRoom) {
        ctx.fillStyle = currentRoom.color;
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`[${currentRoom.name.split(' ')[0]}]`, curPlayer.x, curPlayer.y + 48);
      }
      ctx.restore();

      // =========================================================================
      // 10. COLLISION WARNING ALERTS (Animated Ping)
      // =========================================================================
      const now = Date.now();
      collisionAlertsRef.current = collisionAlertsRef.current.filter((alert) => now - alert.createdAt < 1800);

      collisionAlertsRef.current.forEach((alert) => {
        ctx.save();
        const age = (now - alert.createdAt) / 1800;
        const alpha = Math.max(0, 1 - age);
        const rippleRad = 12 + age * 26;

        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.9})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(alert.x, alert.y, rippleRad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(75, 48, 32, ${alpha * 0.92})`;
        ctx.beginPath();
        const msgW = 160;
        ctx.roundRect(alert.x - msgW / 2, alert.y - 32, msgW, 20, 6);
        ctx.fill();
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = `rgba(254, 202, 202, ${alpha})`;
        ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(alert.message, alert.x, alert.y - 22);
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [setPlayer]);

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
        <span>
          <strong className="text-cyan-300">Paths Restricted:</strong> Avatars cannot walk through walls or closed doors • Walk near <strong className="text-emerald-300">Glass Gates</strong> for Auto Sensors • Click <strong className="text-amber-300">Doors & Windows</strong> to Toggle
        </span>
      </div>
    </div>
  );
}

export default SpatialCanvas;
