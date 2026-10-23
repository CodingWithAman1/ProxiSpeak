/**
 * WorldCanvas — High-Performance 2D Virtual Space Canvas
 * Renders spatial grid, acoustic zones, walls, avatar positions, earshot circles,
 * line-of-sight raycasts, and voice ripple animations at 60 FPS.
 */
import React, { useRef, useEffect, useCallback } from 'react';

// Collision helper: tests if point (x, y) is too close to line segment
function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Ray-segment intersection
function lineIntersects(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
  const ccw = (ax, ay, bx, by, cx, cy) => (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  return (
    ccw(p1x, p1y, p3x, p3y, p4x, p4y) !== ccw(p2x, p2y, p3x, p3y, p4x, p4y) &&
    ccw(p1x, p1y, p2x, p2y, p3x, p3y) !== ccw(p1x, p1y, p2x, p2y, p4x, p4y)
  );
}

export function WorldCanvas({
  room,
  selfUser,
  peers,
  walls = [],
  onMove,
  zoom = 12, // pixels per meter
}) {
  const canvasRef = useRef(null);
  const selfPosRef = useRef({ x: selfUser?.x || 50, y: selfUser?.y || 50, orientation: 0 });
  const targetPosRef = useRef({ x: selfUser?.x || 50, y: selfUser?.y || 50 });
  const remotePositionsRef = useRef(new Map()); // userId -> { x, y, currX, currY, orientation }
  const keysPressed = useRef({});
  const animationFrameRef = useRef(null);
  const lastTickTime = useRef(Date.now());
  const pulsePhase = useRef(0);

  // Sync self position if updated from server init
  useEffect(() => {
    if (selfUser) {
      selfPosRef.current.x = selfUser.x;
      selfPosRef.current.y = selfUser.y;
      targetPosRef.current.x = selfUser.x;
      targetPosRef.current.y = selfUser.y;
    }
  }, [selfUser?.roomId]);

  // Sync peers into smooth lerp position map
  useEffect(() => {
    peers.forEach((p) => {
      const existing = remotePositionsRef.current.get(p.userId);
      if (existing) {
        existing.x = p.x;
        existing.y = p.y;
        existing.orientation = p.orientation || 0;
        existing.user = p;
      } else {
        remotePositionsRef.current.set(p.userId, {
          x: p.x,
          y: p.y,
          currX: p.x,
          currY: p.y,
          orientation: p.orientation || 0,
          user: p,
        });
      }
    });

    // Cleanup disconnected peers
    const activeIds = new Set(peers.map((p) => p.userId));
    for (const id of remotePositionsRef.current.keys()) {
      if (!activeIds.has(id)) remotePositionsRef.current.delete(id);
    }
  }, [peers]);

  // Keyboard navigation listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse / click-to-move listener
  const handleCanvasClick = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickScreenX = e.clientX - rect.left;
      const clickScreenY = e.clientY - rect.top;

      const centerX = canvas.width / (2 * window.devicePixelRatio);
      const centerY = canvas.height / (2 * window.devicePixelRatio);

      const worldTargetX = selfPosRef.current.x + (clickScreenX - centerX) / zoom;
      const worldTargetY = selfPosRef.current.y + (clickScreenY - centerY) / zoom;

      const roomWidth = room?.dimensions?.width || 100;
      const roomHeight = room?.dimensions?.height || 100;

      targetPosRef.current = {
        x: Math.max(3, Math.min(roomWidth - 3, worldTargetX)),
        y: Math.max(3, Math.min(roomHeight - 3, worldTargetY)),
      };
    },
    [room, zoom]
  );

  // Main 60 FPS Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const now = Date.now();
      const dt = Math.min(0.1, (now - lastTickTime.current) / 1000);
      lastTickTime.current = now;
      pulsePhase.current = (pulsePhase.current + dt * 2) % (Math.PI * 2);

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Process Keyboard Movement
      let moveX = 0;
      let moveY = 0;
      const speed = 12; // meters per second

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveY -= 1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveY += 1;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX -= 1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX += 1;

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        moveX = (moveX / len) * speed * dt;
        moveY = (moveY / len) * speed * dt;

        let nextX = selfPosRef.current.x + moveX;
        let nextY = selfPosRef.current.y + moveY;

        // Wall collision slide
        const roomWidth = room?.dimensions?.width || 100;
        const roomHeight = room?.dimensions?.height || 100;
        nextX = Math.max(3, Math.min(roomWidth - 3, nextX));
        nextY = Math.max(3, Math.min(roomHeight - 3, nextY));

        let blockedX = false;
        let blockedY = false;
        for (const w of walls) {
          if (distancePointToSegment(nextX, selfPosRef.current.y, w.x1, w.y1, w.x2, w.y2) < 1.5) blockedX = true;
          if (distancePointToSegment(selfPosRef.current.x, nextY, w.x1, w.y1, w.x2, w.y2) < 1.5) blockedY = true;
        }

        if (!blockedX) selfPosRef.current.x = nextX;
        if (!blockedY) selfPosRef.current.y = nextY;

        selfPosRef.current.orientation = Math.atan2(moveY, moveX);
        targetPosRef.current = { x: selfPosRef.current.x, y: selfPosRef.current.y };
        onMove?.(selfPosRef.current.x, selfPosRef.current.y, selfPosRef.current.orientation);
      } else {
        // Click-to-move interpolation
        const tX = targetPosRef.current.x;
        const tY = targetPosRef.current.y;
        const dist = Math.hypot(tX - selfPosRef.current.x, tY - selfPosRef.current.y);

        if (dist > 0.2) {
          const step = Math.min(dist, speed * dt);
          const angle = Math.atan2(tY - selfPosRef.current.y, tX - selfPosRef.current.x);
          const nextX = selfPosRef.current.x + Math.cos(angle) * step;
          const nextY = selfPosRef.current.y + Math.sin(angle) * step;

          let blocked = false;
          for (const w of walls) {
            if (distancePointToSegment(nextX, nextY, w.x1, w.y1, w.x2, w.y2) < 1.5) {
              blocked = true;
              break;
            }
          }

          if (!blocked) {
            selfPosRef.current.x = nextX;
            selfPosRef.current.y = nextY;
            selfPosRef.current.orientation = angle;
            onMove?.(selfPosRef.current.x, selfPosRef.current.y, selfPosRef.current.orientation);
          } else {
            targetPosRef.current = { x: selfPosRef.current.x, y: selfPosRef.current.y };
          }
        }
      }

      // 2. Camera Setup (center on self user)
      const viewCenterX = displayWidth / 2;
      const viewCenterY = displayHeight / 2;
      const cameraX = selfPosRef.current.x;
      const cameraY = selfPosRef.current.y;

      const toScreenX = (wx) => viewCenterX + (wx - cameraX) * zoom;
      const toScreenY = (wy) => viewCenterY + (wy - cameraY) * zoom;

      // 3. Render Background Grid
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Grid lines
      const roomWidth = room?.dimensions?.width || 100;
      const roomHeight = room?.dimensions?.height || 100;

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= roomWidth; gx += 5) {
        ctx.beginPath();
        ctx.moveTo(toScreenX(gx), toScreenY(0));
        ctx.lineTo(toScreenX(gx), toScreenY(roomHeight));
        ctx.stroke();
      }
      for (let gy = 0; gy <= roomHeight; gy += 5) {
        ctx.beginPath();
        ctx.moveTo(toScreenX(0), toScreenY(gy));
        ctx.lineTo(toScreenX(roomWidth), toScreenY(gy));
        ctx.stroke();
      }

      // Room Outer Boundary
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.strokeRect(toScreenX(0), toScreenY(0), roomWidth * zoom, roomHeight * zoom);

      // 4. Render Acoustic Zones
      if (room?.zones) {
        for (const zone of room.zones) {
          const zx = toScreenX(zone.bounds.x);
          const zy = toScreenY(zone.bounds.y);
          const zw = zone.bounds.width * zoom;
          const zh = zone.bounds.height * zoom;

          ctx.fillStyle = zone.color || 'rgba(59, 130, 246, 0.1)';
          ctx.fillRect(zx, zy, zw, zh);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(zx, zy, zw, zh);

          // Zone name tag
          ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
          ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(zone.name.toUpperCase(), zx + 10, zy + 18);
        }
      }

      // 5. Render Walls & Acoustic Partitions
      for (const w of walls) {
        const sx1 = toScreenX(w.x1);
        const sy1 = toScreenY(w.y1);
        const sx2 = toScreenX(w.x2);
        const sy2 = toScreenY(w.y2);

        // Wall shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx1 + 2, sy1 + 2);
        ctx.lineTo(sx2 + 2, sy2 + 2);
        ctx.stroke();

        // Wall body with material tint
        if (w.material === 'glass') {
          ctx.strokeStyle = '#38bdf8';
        } else if (w.material === 'concrete') {
          ctx.strokeStyle = '#94a3b8';
        } else if (w.material === 'soundproof') {
          ctx.strokeStyle = '#a855f7';
        } else {
          ctx.strokeStyle = '#f59e0b';
        }

        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }

      // 6. Render Earshot Radius & Visual Proximity for Self User
      const selfScreenX = toScreenX(selfPosRef.current.x);
      const selfScreenY = toScreenY(selfPosRef.current.y);
      const earshotRadiusMeters = selfUser?.earshotRadius || 20;
      const earshotRadiusPixels = earshotRadiusMeters * zoom;

      // Outer earshot circle (dashed falloff boundary)
      ctx.save();
      ctx.beginPath();
      ctx.arc(selfScreenX, selfScreenY, earshotRadiusPixels, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();

      // Subtle earshot fill gradient
      const grad = ctx.createRadialGradient(selfScreenX, selfScreenY, 2 * zoom, selfScreenX, selfScreenY, earshotRadiusPixels);
      grad.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
      grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.04)');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // 7. Render Line-of-Sight Acoustic Rays to Peers
      for (const [peerId, record] of remotePositionsRef.current.entries()) {
        const pScreenX = toScreenX(record.currX);
        const pScreenY = toScreenY(record.currY);
        const dist = Math.hypot(record.currX - selfPosRef.current.x, record.currY - selfPosRef.current.y);

        if (dist <= earshotRadiusMeters) {
          // Check line of sight against walls
          let occluded = false;
          for (const w of walls) {
            if (lineIntersects(selfPosRef.current.x, selfPosRef.current.y, record.currX, record.currY, w.x1, w.y1, w.x2, w.y2)) {
              occluded = true;
              break;
            }
          }

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(selfScreenX, selfScreenY);
          ctx.lineTo(pScreenX, pScreenY);

          if (occluded) {
            // Muffled acoustic ray (amber dashed)
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
          } else {
            // Clear line-of-sight ray (emerald solid with glow)
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 2;
          }
          ctx.stroke();

          // Distance tag on the ray
          const midX = (selfScreenX + pScreenX) / 2;
          const midY = (selfScreenY + pScreenY) / 2;
          ctx.fillStyle = occluded ? '#f59e0b' : '#10b981';
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillText(`${dist.toFixed(1)}m ${occluded ? '[MUFFLED]' : ''}`, midX + 4, midY - 4);
          ctx.restore();
        }
      }

      // 8. Render Remote Peers with Smooth Lerp
      for (const [peerId, record] of remotePositionsRef.current.entries()) {
        // Lerp towards target position
        record.currX += (record.x - record.currX) * Math.min(1, dt * 15);
        record.currY += (record.y - record.currY) * Math.min(1, dt * 15);

        const px = toScreenX(record.currX);
        const py = toScreenY(record.currY);
        const user = record.user || {};

        // Speaking pulse ripples
        if (user.isSpeaking) {
          const rippleRadius = (16 + Math.sin(pulsePhase.current * 3) * 6);
          ctx.beginPath();
          ctx.arc(px, py, rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = user.color || '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Avatar body
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fillStyle = user.color || '#6366f1';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction indicator
        if (typeof record.orientation === 'number') {
          const dirX = px + Math.cos(record.orientation) * 18;
          const dirY = py + Math.sin(record.orientation) * 18;
          ctx.beginPath();
          ctx.arc(dirX, dirY, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        // Nameplate & status
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(user.name || 'Peer', px, py - 20);

        if (user.isMuted) {
          ctx.fillStyle = '#ef4444';
          ctx.font = '500 10px sans-serif';
          ctx.fillText('[MUTED]', px, py + 26);
        }
      }

      // 9. Render Self Avatar
      // Speaking pulse ripples
      if (selfUser?.isSpeaking) {
        const ripple = 18 + Math.sin(pulsePhase.current * 3) * 6;
        ctx.beginPath();
        ctx.arc(selfScreenX, selfScreenY, ripple, 0, Math.PI * 2);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Self avatar body
      ctx.beginPath();
      ctx.arc(selfScreenX, selfScreenY, 15, 0, Math.PI * 2);
      ctx.fillStyle = selfUser?.color || '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Facing orientation pointer
      const selfDirX = selfScreenX + Math.cos(selfPosRef.current.orientation) * 20;
      const selfDirY = selfScreenY + Math.sin(selfPosRef.current.orientation) * 20;
      ctx.beginPath();
      ctx.arc(selfDirX, selfDirY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa';
      ctx.fill();

      // Self Nameplate
      ctx.fillStyle = '#93c5fd';
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${selfUser?.name || 'You'} (You)`, selfScreenX, selfScreenY - 22);

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [room, walls, selfUser?.earshotRadius, selfUser?.isSpeaking, selfUser?.name, selfUser?.color, onMove, zoom]);

  return (
    <div className="relative w-full h-full cursor-crosshair">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block"
      />
      {/* Keyboard movement helper hint */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 pointer-events-none flex items-center space-x-2">
        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">W A S D</span>
        <span>or Click to walk</span>
      </div>
    </div>
  );
}

export default WorldCanvas;
