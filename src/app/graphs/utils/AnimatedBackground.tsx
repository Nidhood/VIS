"use client";
import { useState, useEffect } from "react";

export default function AnimatedBackground() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 25 + 15
    }));
    setParticles(generated);
  }, []);

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 25%, #0f172a 50%, #065f46 75%, #0a0a0c 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientFlow 20s ease infinite'
      }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, #10b981, transparent)`,
              opacity: p.opacity,
              animation: `float ${p.speed}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-30px) translateX(15px) scale(1.2);
            opacity: 0.7;
          }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </>
  );
}