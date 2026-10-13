import { useEffect, useRef } from 'react';
import { drawRoom } from '../canvas/renderer.js';

/**
 * Full-window canvas (Day 4).
 *
 * Owns exactly three things: the canvas element, its
 * devicePixelRatio-aware sizing (recomputed on resize), and one
 * requestAnimationFrame loop started on mount and cancelled on
 * unmount. It never calls setState per frame — each frame simply reads
 * the socket hook's world ref and paints it.
 *
 * `renderFrame` is injectable only so the avatar layer (next commit)
 * can replace the room-only painter without touching this lifecycle.
 */
export default function WorldCanvas({ world, renderFrame = drawRoom }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let animationFrame = 0;
    // One size object for the effect's lifetime, mutated on resize —
    // not a fresh allocation on every animation frame.
    const size = { width: 0, height: 0 };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      size.width = window.innerWidth;
      size.height = window.innerHeight;
      canvas.width = Math.max(1, Math.round(size.width * dpr));
      canvas.height = Math.max(1, Math.round(size.height * dpr));
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
      // Draw in CSS pixels; the DPR transform keeps lines sharp on retina.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = () => {
      renderFrame(ctx, world.current, size);
      animationFrame = window.requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrame = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [world, renderFrame]);

  return <canvas ref={canvasRef} className="world-canvas" aria-label="ProxiSpeak room" />;
}
