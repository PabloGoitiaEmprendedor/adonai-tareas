import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const AISphere = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 200;

    class Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      color: string;

      constructor() {
        this.reset();
        // Start randomly in the sphere
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * 80;
        this.x = r * Math.sin(phi) * Math.cos(theta);
        this.y = r * Math.sin(phi) * Math.sin(theta);
        this.z = r * Math.cos(phi);
      }

      reset() {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 80;
        this.x = r * Math.sin(phi) * Math.cos(theta);
        this.y = r * Math.sin(phi) * Math.sin(theta);
        this.z = r * Math.cos(phi);
        
        // Very slow movement
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.vz = (Math.random() - 0.5) * 0.2;
        
        this.radius = Math.random() * 1.5 + 0.5;
        this.color = `hsla(${200 + Math.random() * 40}, 100%, 70%, ${Math.random() * 0.5 + 0.3})`;
      }

      update(time: number) {
        // Apply a gentle "breathing" force
        const force = Math.sin(time * 0.001) * 0.05;
        const dist = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        
        this.vx += (this.x / dist) * force;
        this.vy += (this.y / dist) * force;
        this.vz += (this.z / dist) * force;

        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        // Rotation around Y axis
        const angle = 0.005;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const nx = this.x * cosA - this.z * sinA;
        const nz = this.x * sinA + this.z * cosA;
        this.x = nx;
        this.z = nz;

        // Damping
        this.vx *= 0.99;
        this.vy *= 0.99;
        this.vz *= 0.99;
      }

      draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
        // Perspective projection
        const scale = 200 / (200 + this.z);
        const px = this.x * scale + width / 2;
        const py = this.y * scale + height / 2;
        
        const opacity = (this.z + 80) / 160; // Fading based on Z depth
        
        ctx.beginPath();
        ctx.arc(px, py, this.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity;
        ctx.fill();
        
        // Occasional light connections (neural network feel)
        ctx.globalAlpha = opacity * 0.1;
      }
    }

    const init = () => {
      particles = Array.from({ length: particleCount }, () => new Particle());
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Sort by Z for depth
      particles.sort((a, b) => b.z - a.z);

      particles.forEach(p => {
        p.update(time);
        p.draw(ctx, canvas.width, canvas.height);
      });

      // Subtle connections
      ctx.beginPath();
      ctx.strokeStyle = '#4be277';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 40; i++) {
        const p1 = particles[i];
        const p2 = particles[(i + 1) % particles.length];
        const scale1 = 200 / (200 + p1.z);
        const scale2 = 200 / (200 + p2.z);
        if (Math.abs(p1.z - p2.z) < 20) {
            ctx.globalAlpha = ((p1.z + 80) / 160) * 0.05;
            ctx.moveTo(p1.x * scale1 + canvas.width / 2, p1.y * scale1 + canvas.height / 2);
            ctx.lineTo(p2.x * scale2 + canvas.width / 2, p2.y * scale2 + canvas.height / 2);
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    init();
    animationFrameId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center pointer-events-none">
      {/* Volumetric Glow Background */}
      <motion.div
        className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Neural Core Glow */}
      <motion.div
        className="absolute w-32 h-32 bg-primary/10 blur-[30px] rounded-full border border-primary/20"
        animate={{
          scale: [0.8, 1.1, 0.8],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="relative z-10 w-full h-full drop-shadow-[0_0_20px_rgba(75,226,119,0.4)]"
      />
      
      {/* Glassy Refraction Overlay */}
      <div className="absolute inset-4 rounded-full border border-white/10 bg-gradient-to-tr from-transparent via-white/5 to-transparent backdrop-blur-[1px] pointer-events-none z-20" />
    </div>
  );
};
