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
  const [mapImageLoaded, setMapImageLoaded] = useState(false);
  const mapImageRef = useRef(null);

  // Keep live references for collision engine & background loop without stale closures
  const wallsRef = useRef(walls);
  const doorsRef = useRef(doors);
  const playerRef = useRef(player);
  const peersRef = useRef(peers);
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

  // Preload the stylized office background map
  useEffect(() => {
    const img = new Image();
    img.src = '/office_map.jpg';
    img.onload = () => {
      mapImageRef.current = img;
      setMapImageLoaded(true);
    };
  }, []);

  // Sync target pos if player was teleported or seated
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
    // Keep max 5 active alerts
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
          // Check if blocked by a closed door
          const closedDoorNear = doorsRef.current.find(
            (d) => !d.isOpen && Math.hypot(d.x + d.w / 2 - prev.x, d.y + d.h / 2 - prev.y) < 32
          );
          if (closedDoorNear) {
            triggerCollisionWarning(closedDoorNear.x + closedDoorNear.w / 2, closedDoorNear.y + closedDoorNear.h / 2, '🔒 Door is Closed (Click to Open)');
          }
        }

        targetPosRef.current = { x: resolved.x, y: resolved.y };
        return { ...prev, x: resolved.x, y: resolved.y, isSeated: false };
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
    for (const door of doors) {
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
    if (Math.hypot(clickX - coffee.x, clickY - coffee.y) <= 24) {
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

    // 9. Walk to location with Wall Collision Enforcement
    const isTargetColliding = isPositionColliding({ x: clickX, y: clickY }, 12, wallsRef.current, doorsRef.current);
    if (isTargetColliding) {
      // Find if clicked on a closed door
      const closedDoor = doorsRef.current.find(
        (d) => !d.isOpen && clickX >= d.x - 8 && clickX <= d.x + d.w + 8 && clickY >= d.y - 8 && clickY <= d.y + d.h + 8
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
  }, [doors, windows, furniture, plants, peers, onToggleDoor, onToggleWindow, onSitChair, onBrewCoffee, onDrinkWater, onToggleWhiteboard, onInteractPlant, onPeerClick, onCanvasClick, triggerCollisionWarning]);

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

  // Main 60 FPS Render & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const render = () => {
      time += 0.025;

      // --- A. Smooth Door Background Animation Lerp ---
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
      setPlayer((prev) => {
        if (prev.isSeated) return prev;
        const tx = targetPosRef.current.x;
        const ty = targetPosRef.current.y;
        const dist = Math.hypot(tx - prev.x, ty - prev.y);

        if (dist > 1.2) {
          const stepSpeed = Math.min(dist, 4.6);
          const angle = Math.atan2(ty - prev.y, tx - prev.x);
          const candidate = {
            x: prev.x + Math.cos(angle) * stepSpeed,
            y: prev.y + Math.sin(angle) * stepSpeed,
          };

          // Apply physical wall and door restriction
          const resolved = resolvePlayerMovement(prev, candidate, 12, wallsRef.current, doorsRef.current);

          // If avatar is completely blocked from reaching the clicked destination
          const moved = Math.hypot(resolved.x - prev.x, resolved.y - prev.y);
          if (moved < 0.05 && dist > 5) {
            targetPosRef.current = { x: resolved.x, y: resolved.y };
          }

          return {
            ...prev,
            x: resolved.x,
            y: resolved.y,
          };
        }
        return prev;
      });

      // Clear Frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- 1. Stylized Architectural Base Map ---
      if (mapImageRef.current && mapImageLoaded) {
        ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#0c121e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // --- 2. Subtle Blueprint Wall Boundary Guides (Shows Restricted Paths) ---
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      wallsRef.current.forEach((w) => {
        ctx.beginPath();
        ctx.moveTo(w.start.x, w.start.y);
        ctx.lineTo(w.end.x, w.end.y);
        ctx.stroke();
      });
      ctx.restore();

      // --- 3. Interactive Windows Overlay & Rain/Sun Light Beams ---
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

      // --- 4. Interactive Doors & Automatic Sliding Gates (Background Animations) ---
      doorsRef.current.forEach((door) => {
        ctx.save();
        const progress = door.openProgress !== undefined ? door.openProgress : (door.isOpen ? 1 : 0);

        if (door.type === 'glass_double') {
          // ==========================================
          // A. HIGH-TECH AUTOMATIC SLIDING GLASS GATES
          // ==========================================
          const halfW = door.w / 2;
          const slideDist = (halfW - 5) * progress;

          // Header Mounting Track & Housing
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(door.x - 2, door.y - 3, door.w + 4, 5);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.strokeRect(door.x - 2, door.y - 3, door.w + 4, 5);

          // Floor Guide Track
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(door.x - 2, door.y + door.h - 2, door.w + 4, 4);

          // Walkway Threshold Glow (Emerald when opening/open, amber when closed)
          const trackAlpha = 0.25 + progress * 0.45;
          ctx.fillStyle = progress > 0.4 ? `rgba(16, 185, 129, ${trackAlpha})` : `rgba(245, 158, 11, ${trackAlpha * 0.6})`;
          ctx.fillRect(door.x + 2, door.y + 2, door.w - 4, door.h - 4);

          // Autonomous Motion Sensor Puck with Expanding Radar Rings
          const isSensorActive = door.sensorActive;
          const sensorPulse = Math.sin(time * 5) * 0.3 + 0.7;
          ctx.fillStyle = isSensorActive ? '#10b981' : '#0284c7';
          ctx.beginPath();
          ctx.arc(door.x + halfW, door.y - 3, 3.5, 0, Math.PI * 2);
          ctx.fill();

          if (isSensorActive) {
            ctx.strokeStyle = `rgba(16, 185, 129, ${sensorPulse})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            const ringR = 6 + ((time * 24) % 12);
            ctx.arc(door.x + halfW, door.y - 3, ringR, 0, Math.PI * 2);
            ctx.stroke();
          }

          // --- Left Sliding Glass Panel ---
          const leftX = door.x - slideDist;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.fillRect(leftX, door.y, halfW, door.h);
          ctx.shadowBlur = 0;

          // Panel frame & specular reflection
          ctx.strokeStyle = progress > 0.5 ? '#38bdf8' : '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(leftX, door.y, halfW, door.h);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(leftX + 4, door.y + 3);
          ctx.lineTo(leftX + halfW - 4, door.y + door.h - 3);
          ctx.stroke();

          // Left Handle Bar
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(leftX + halfW - 4, door.y + door.h * 0.25, 2, door.h * 0.5);

          // --- Right Sliding Glass Panel ---
          const rightX = door.x + halfW + slideDist;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.fillRect(rightX, door.y, halfW, door.h);
          ctx.shadowBlur = 0;

          ctx.strokeStyle = progress > 0.5 ? '#38bdf8' : '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(rightX, door.y, halfW, door.h);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rightX + 4, door.y + 3);
          ctx.lineTo(rightX + halfW - 4, door.y + door.h - 3);
          ctx.stroke();

          // Right Handle Bar
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(rightX + 2, door.y + door.h * 0.25, 2, door.h * 0.5);

          // Status Badge Pill
          const badgeY = door.y < 100 ? door.y + door.h + 14 : door.y - 12;
          let badgeText = 'GATE CLOSED';
          let badgeBg = 'rgba(15, 23, 42, 0.88)';
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
          // ==========================================
          // B. WOODEN SINGLE-LEAF SWING DOORS
          // ==========================================
          const isVertical = door.orientation === 'vertical';
          const maxAngle = Math.PI / 2.15; // ~84 degrees
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

          // Blueprint Swing Arc Guideline
          if (progress > 0.05) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            const baseAngle = isVertical ? (door.hinge === 'bottom' ? -Math.PI / 2 : Math.PI / 2) : (door.hinge === 'right' ? Math.PI : 0);
            const rotSign = (door.hinge === 'right' || door.hinge === 'bottom') ? -1 : 1;
            ctx.arc(hingeX, hingeY, leafLen, baseAngle, baseAngle + angle * rotSign, rotSign < 0);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Open Walkway Threshold Highlight
          if (progress > 0.3) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
            ctx.fillRect(door.x, door.y, door.w, door.h);
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.strokeRect(door.x, door.y, door.w, door.h);
            ctx.setLineDash([]);
          }

          // Door Frame Jambs
          ctx.fillStyle = '#451a03';
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

          // Drop shadow cast onto floor
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 3;

          const woodGrad = ctx.createLinearGradient(0, 0, leafLen, 0);
          woodGrad.addColorStop(0, '#78350f');
          woodGrad.addColorStop(0.5, '#92400e');
          woodGrad.addColorStop(1, '#b45309');
          ctx.fillStyle = woodGrad;

          if (isVertical) {
            ctx.fillRect(-leafThick / 2, 0, leafThick, leafLen);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(-leafThick / 2, 0, leafThick, leafLen);

            // Brass Handle
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, leafLen * 0.85, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(0, -leafThick / 2, leafLen, leafThick);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, -leafThick / 2, leafLen, leafThick);

            // Brass Handle
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(leafLen * 0.85, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Status Badge Pill
          const isFullyOpen = progress > 0.85;
          const isMoving = progress > 0.05 && progress < 0.95;
          const tagY = door.y < 100 ? door.y + door.h + 14 : door.y - 10;
          const midX = door.x + door.w / 2;

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
          ctx.fillText(
            isMoving
              ? (door.isOpen ? 'OPENING...' : 'CLOSING...')
              : isFullyOpen
              ? 'OPEN (Walk)'
              : 'CLOSED (Click)',
            midX,
            tagY
          );
        }
        ctx.restore();
      });

      // --- 5. Interactive Chairs Overlay & Sit Indicators ---
      const table = furniture.conferenceTable;
      table.chairs.forEach((chair) => {
        const isPlayerHere = player.isSeated && Math.hypot(player.x - chair.x, player.y - chair.y) < 12;
        const isOccupied = chair.occupant || isPlayerHere;

        if (!isOccupied) {
          ctx.save();
          const chairPulse = Math.sin(time * 3 + chair.x) * 0.3 + 0.7;
          ctx.strokeStyle = `rgba(56, 189, 248, ${chairPulse * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(chair.x, chair.y, 11, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(15, 23, 42, 0.75)`;
          ctx.beginPath();
          ctx.roundRect(chair.x - 14, chair.y - 7, 28, 14, 5);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SIT', chair.x, chair.y);
          ctx.restore();
        }
      });

      // --- 6. Interactive Coffee Machine Animated Steam ---
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
      ctx.textBaseline = 'middle';
      ctx.fillText('☕ BREW', coffee.x, coffee.y + 22);
      ctx.restore();

      // --- 7. Interactive Whiteboard Banner ---
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
      ctx.textBaseline = 'middle';
      ctx.fillText(`📋 ${wb.slides[wb.slideIndex].slice(0, 26)}...`, wb.x + wb.w / 2, wb.y + wb.h + 10);
      ctx.restore();

      // --- 8. Spatial Mesh Audio Connection Beams ---
      // Combine walls and closed doors for acoustic sound occlusion
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

      // --- 9. Local Player Earshot / Hearing Radius Bubble ---
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

      // --- 10. Remote Peers Avatars ---
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

      // --- 11. Local Player Avatar ---
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

      // --- 12. Path Restriction Collision Warning Alerts (Animated Ping) ---
      const now = Date.now();
      collisionAlertsRef.current = collisionAlertsRef.current.filter((alert) => now - alert.createdAt < 1800);

      collisionAlertsRef.current.forEach((alert) => {
        ctx.save();
        const age = (now - alert.createdAt) / 1800; // 0 to 1
        const alpha = Math.max(0, 1 - age);
        const rippleRad = 12 + age * 26;

        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.9})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(alert.x, alert.y, rippleRad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.92})`;
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
  }, [player, peers, rooms, windows, plants, furniture, earshotRadius, isMicActive, micDecibels, mapImageLoaded, setPlayer]);

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
          <strong className="text-cyan-300">Paths Restricted:</strong> Avatars cannot walk through walls or closed doors • Walk near <strong className="text-emerald-300">Glass Gates</strong> for Auto Sensors • Click <strong className="text-amber-300">Doors</strong> to Toggle
        </span>
      </div>
    </div>
  );
}

export default SpatialCanvas;
