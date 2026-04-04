import React, { useRef, useEffect } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  baseRadius: number;
  color: string;
  hue: number;
  vx: number;
  vy: number;
  angle: number;
  ix: number; // Interactive Velocity X
  iy: number; // Interactive Velocity Y
}

export interface AudioData {
  bass: number;
  mid: number;
  treble: number;
}

interface ParticleBackgroundProps {
  intensity: number;
  audioRef?: React.MutableRefObject<AudioData>;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  intensity,
  audioRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 }); // Initialize off-screen

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let w = 0;
    let h = 0;

    // Hypothetical Audio Visualizer Data (Simulated)
    const spectrumSize = 64;
    const spectrumData = new Uint8Array(spectrumSize);
    let timeStep = 0;

    const createParticles = (count: number) => {
      particles = [];
      for (let i = 0; i < count; i++) {
        const radius = Math.random() * 3 + 1;
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          baseX: Math.random() * w,
          baseY: Math.random() * h,
          radius: radius,
          baseRadius: radius,
          color: "",
          hue: Math.random() * 60 + 180, // Cyan/Blue base
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          angle: Math.random() * Math.PI * 2,
          ix: 0,
          iy: 0,
        });
      }
    };

    // Interaction Handlers
    const handleMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = clientX - rect.left;
      mouseRef.current.y = clientY - rect.top;
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      // Prevent scrolling while interacting with the visualizer
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const onLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("touchend", onLeave);

    let globalHue = 200; // Shared hue state

    const updateSimulatedSpectrum = () => {
      timeStep += 0.05;

      // Use external audio data if available (synchronized with lyrics)
      const extBass = audioRef?.current?.bass || 0;
      const extMid = audioRef?.current?.mid || 0;
      const extTreble = audioRef?.current?.treble || 0;
      const hasExternal = extBass + extMid + extTreble > 0;

      // Shift global hue based on music intensity and time
      globalHue = (globalHue + 0.2 + extBass * 2) % 360;

      for (let i = 0; i < spectrumSize; i++) {
        const wave = Math.sin(i * 0.2 + timeStep) * 0.5 + 0.5;
        const noise = Math.random() * 0.3;
        const eq = 1 - Math.abs((i - spectrumSize / 2) / (spectrumSize / 2));

        let val = 0;

        if (hasExternal) {
          if (i < 10) val = extBass * 255;
          else if (i < 40) val = extMid * 200 * wave;
          else val = extTreble * 255 * (noise + 0.5);
          val = val * 0.8 + wave * 50;
        } else {
          val = wave * 50 + noise * 50 + intensity * 200 * eq;
          if (intensity > 0.6 && Math.random() > 0.9) val += 100;
        }

        spectrumData[i] = Math.min(255, Math.max(0, val));
      }
    };

    const animate = () => {
      updateSimulatedSpectrum();

      const extBass = audioRef?.current?.bass || 0;
      const extTreble = audioRef?.current?.treble || 0;

      const spectrumBass = spectrumData.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
      const spectrumTreble = spectrumData.slice(40, 60).reduce((a, b) => a + b, 0) / 20 / 255;

      const bass = Math.max(spectrumBass, extBass);
      const treble = Math.max(spectrumTreble, extTreble);

      // Clear with trail effect
      const bgHue = (globalHue + 180) % 360;
      const bgAlpha = 0.25 - intensity * 0.1 + bass * 0.05;
      ctx.fillStyle = `hsla(${bgHue}, 30%, 5%, ${bgAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // Draw Particles
      particles.forEach((p, i) => {
        // Map particle to a frequency bin
        const freqIndex = i % spectrumSize;
        const freqValue = spectrumData[freqIndex] / 255; // 0-1

        // --- Interaction Physics ---
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 150;

        if (dist < interactionRadius) {
          const force = (interactionRadius - dist) / interactionRadius;
          const angle = Math.atan2(dy, dx);
          // Push away force
          const pushForce = force * 15;
          p.ix += Math.cos(angle) * pushForce;
          p.iy += Math.sin(angle) * pushForce;
        }

        // Apply friction to interactive velocity so they slow down
        p.ix *= 0.92;
        p.iy *= 0.92;

        // --- Movement Physics ---
        const speedMultiplier = 1 + bass * 8 * intensity;

        // Treble adds jitter/noise
        p.angle += (Math.random() - 0.5) * treble;

        // Combine audio reactivity, base velocity, and interactive velocity
        p.x += p.vx * speedMultiplier + p.ix + Math.cos(p.angle) * freqValue;
        p.y += p.vy * speedMultiplier + p.iy + Math.sin(p.angle) * freqValue;

        // Pulse radius with bass
        p.radius = p.baseRadius + bass * 15 * intensity;

        // Color shift based on global hue and frequency
        p.hue = (globalHue + i * (360 / 120)) % 360;
        const brightness = 50 + freqValue * 40 + bass * 10;
        p.color = `hsla(${p.hue}, 80%, ${brightness}%, ${0.6 + freqValue * 0.4})`;

        // Screen wrap
        if (p.x < -50) p.x = w + 50;
        if (p.x > w + 50) p.x = -50;
        if (p.y < -50) p.y = h + 50;
        if (p.y > h + 50) p.y = -50;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Draw connections - Neuro-web effect
        const connectDist = 80 + intensity * 150;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDist) {
            ctx.beginPath();
            const alpha = (1 - dist / connectDist) * (0.15 + intensity * 0.35);
            ctx.strokeStyle = `hsla(${p.hue}, 80%, 50%, ${alpha})`;
            ctx.lineWidth = 1; // Keep lines fine for elegance
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      // Draw Visualizer Bars at bottom
      const barWidth = w / spectrumSize;
      for (let i = 0; i < spectrumSize; i++) {
        const val = spectrumData[i];
        const barHeight = (val / 255) * (h * 0.3 * (0.5 + intensity));

        const hue = 200 + (val / 255) * 140; // Match particle theme
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.8)`;

        // Draw bars
        const x = i * barWidth;
        const y = h - barHeight;

        // Rounded tops
        ctx.beginPath();
        ctx.roundRect(x + 1, y, Math.max(0, barWidth - 2), barHeight + 10, 5);
        ctx.fill();

        // Reflection
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.2)`;
        ctx.beginPath();
        ctx.rect(x + 1, h, Math.max(0, barWidth - 2), barHeight * 0.5);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (parent) {
        w = canvas.width = parent.clientWidth;
        h = canvas.height = parent.clientHeight;
        createParticles(120);
      }
    };

    // Use ResizeObserver to detect parent size changes
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(parent);

    // Initial size
    handleResize();

    // Start animation
    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("touchend", onLeave);
    };
  }, [intensity]);

  // Removed rounded-3xl to support full screen edge-to-edge
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none" />;
};
