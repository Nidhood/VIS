"use client";
import { Provider } from "@/app/graphs/utils/useData";
import Filters from "@/app/graphs/utils/Filters";
import dynamic from "next/dynamic";
import { useState } from "react";

const StackedArea = dynamic(() => import("../graphs/idiom-1/StackedArea"), { ssr: false });
const LineChart = dynamic(() => import("../graphs/idiom-2/LineChart"), { ssr: false });
const SlopeChart = dynamic(() => import("../graphs/idiom-3/SlopeChart"), { ssr: false });
const HeatMap = dynamic(() => import("../graphs/idiom-4/HeatMap"), { ssr: false });

const AnimatedBackground = () => {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 25 + 15
    }))
  );

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1e 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 20s ease infinite',
        pointerEvents: 'none'
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
              background: '#a7c7e7',
              opacity: p.opacity,
              animation: `float ${p.speed}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow: '0 0 8px rgba(167, 199, 231, 0.4)'
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.1;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.3;
          }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </>
  );
};

function DashboardContent() {
  const goToStory = () => {
    window.location.href = '/';
  };

  return (
    <>
      <AnimatedBackground />

      <div style={{
        minHeight: '100vh',
        padding: '0'
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(22, 33, 62, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(167, 199, 231, 0.2)',
          padding: '16px 20px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '20px',
            maxWidth: '1600px',
            margin: '0 auto'
          }}>
            <button
              onClick={goToStory}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'rgba(167, 199, 231, 0.15)',
                color: '#a7c7e7',
                border: '1px solid rgba(167, 199, 231, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: 'fit-content'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(167, 199, 231, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(167, 199, 231, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(167, 199, 231, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(167, 199, 231, 0.3)';
              }}
            >
              ← Volver al Story
            </button>

            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              background: 'linear-gradient(90deg, #a7c7e7, #bae1a4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '1px',
              margin: 0,
              textAlign: 'center'
            }}>
              Dashboard Interactivo
            </h1>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '2px'
            }}>
              <span style={{
                fontSize: '13px',
                color: '#9faec7',
                fontWeight: '500'
              }}>
                Santiago Castro Zuluaga
              </span>
              <span style={{
                fontSize: '13px',
                color: '#9faec7',
                fontWeight: '500'
              }}>
                Iván Darío Orozco Ibáñez
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          position: 'sticky',
          top: '68px',
          background: 'rgba(22, 33, 62, 0.95)',
          zIndex: 50,
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(167, 199, 231, 0.1)',
          padding: '12px 20px'
        }}>
          <div style={{
            maxWidth: '1600px',
            margin: '0 auto'
          }}>
            <Filters />
          </div>
        </div>

        {/* Visualizations Grid */}
        <div style={{
          padding: '20px',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '20px',
            minHeight: 'calc(100vh - 200px)'
          }}>
            <div style={{
              animation: 'fadeInUp 0.6s ease 0.1s backwards',
              background: 'rgba(22, 33, 62, 0.6)',
              border: '1px solid rgba(167, 199, 231, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <StackedArea />
            </div>
            <div style={{
              animation: 'fadeInUp 0.6s ease 0.2s backwards',
              background: 'rgba(22, 33, 62, 0.6)',
              border: '1px solid rgba(167, 199, 231, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <LineChart />
            </div>
            <div style={{
              animation: 'fadeInUp 0.6s ease 0.3s backwards',
              background: 'rgba(22, 33, 62, 0.6)',
              border: '1px solid rgba(167, 199, 231, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <SlopeChart />
            </div>
            <div style={{
              animation: 'fadeInUp 0.6s ease 0.4s backwards',
              background: 'rgba(22, 33, 62, 0.6)',
              border: '1px solid rgba(167, 199, 231, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <HeatMap />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Provider>
      <DashboardContent />
    </Provider>
  );
}