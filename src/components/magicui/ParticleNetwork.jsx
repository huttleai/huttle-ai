import React, { useRef, useEffect, useCallback, useState } from 'react';

/**
 * ParticleNetwork - AI-inspired connected particle network animation
 * Represents AI connectivity with floating nodes and dynamic connections
 */
export function ParticleNetwork({
  className = "",
  particleCount = 45,
  particleColor = "#01bad2",
  lineColor = "#2B8FC7",
  maxLineDistance = 150,
  particleSize = { min: 2, max: 4 },
  speed = { min: 0.2, max: 0.5 },
  mouseRepelRadius = 100,
  mouseRepelStrength = 0.5,
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: null, y: null });
  const animationRef = useRef(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize particles
  const initParticles = useCallback((width, height) => {
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (speed.max - speed.min) + speed.min,
        vy: (Math.random() - 0.5) * (speed.max - speed.min) + speed.min,
        size: Math.random() * (particleSize.max - particleSize.min) + particleSize.min,
        opacity: Math.random() * 0.5 + 0.5,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
    return particles;
  }, [particleCount, particleSize, speed]);

  // Draw a single particle with glow effect
  const drawParticle = useCallback((ctx, particle, time) => {
    const pulse = Math.sin(time * 0.002 + particle.pulseOffset) * 0.3 + 0.7;
    const glowSize = particle.size * 3;
    
    // Outer glow
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, glowSize
    );
    gradient.addColorStop(0, `${particleColor}${Math.floor(particle.opacity * pulse * 60).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(0.5, `${particleColor}${Math.floor(particle.opacity * pulse * 20).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Core particle
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `${particleColor}${Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
  }, [particleColor]);

  // Draw connection lines between nearby particles
  const drawConnections = useCallback((ctx, particles) => {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxLineDistance) {
          const opacity = (1 - distance / maxLineDistance) * 0.4;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `${lineColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }, [lineColor, maxLineDistance]);

  // Update particle positions
  const updateParticles = useCallback((particles, width, height) => {
    const mouse = mouseRef.current;
    
    particles.forEach(particle => {
      // Mouse repulsion
      if (mouse.x !== null && mouse.y !== null) {
        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouseRepelRadius && distance > 0) {
          const force = (mouseRepelRadius - distance) / mouseRepelRadius;
          const angle = Math.atan2(dy, dx);
          particle.vx += Math.cos(angle) * force * mouseRepelStrength;
          particle.vy += Math.sin(angle) * force * mouseRepelStrength;
        }
      }
      
      // Apply velocity with damping
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Damping to prevent particles from flying too fast
      particle.vx *= 0.99;
      particle.vy *= 0.99;
      
      // Ensure minimum velocity
      const minVel = speed.min * 0.5;
      const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
      if (currentSpeed < minVel) {
        const angle = Math.random() * Math.PI * 2;
        particle.vx = Math.cos(angle) * minVel;
        particle.vy = Math.sin(angle) * minVel;
      }
      
      // Bounce off edges with soft boundary
      const margin = 50;
      if (particle.x < -margin) particle.x = width + margin;
      if (particle.x > width + margin) particle.x = -margin;
      if (particle.y < -margin) particle.y = height + margin;
      if (particle.y > height + margin) particle.y = -margin;
    });
  }, [mouseRepelRadius, mouseRepelStrength, speed]);

  // Animation loop
  const animate = useCallback((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensionsRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Update and draw
    updateParticles(particlesRef.current, width, height);
    drawConnections(ctx, particlesRef.current);
    particlesRef.current.forEach(particle => drawParticle(ctx, particle, time));
    
    animationRef.current = requestAnimationFrame(animate);
  }, [updateParticles, drawConnections, drawParticle]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleResize = () => {
      const container = canvas.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      if (width === 0 || height === 0) return;
      
      // Set canvas size with device pixel ratio for sharp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      const prevWidth = dimensionsRef.current.width;
      dimensionsRef.current = { width, height };
      
      // Reinitialize particles if dimensions changed significantly or first init
      if (particlesRef.current.length === 0 || Math.abs(width - prevWidth) > 100) {
        particlesRef.current = initParticles(width, height);
      }
      
      setIsInitialized(true);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [initParticles]);
  
  // Reinitialize particles when particleCount changes
  useEffect(() => {
    const { width, height } = dimensionsRef.current;
    if (width > 0 && height > 0) {
      particlesRef.current = initParticles(width, height);
    }
  }, [particleCount, initParticles]);

  // Handle mouse movement
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Start animation
  useEffect(() => {
    const { width, height } = dimensionsRef.current;
    if (width > 0 && height > 0 && particlesRef.current.length === 0) {
      particlesRef.current = initParticles(width, height);
    }
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, initParticles]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}

export default ParticleNetwork;

