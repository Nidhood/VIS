"use client";
import { useState, useEffect } from "react";
import { Provider } from "@/app/graphs/useData";
import Filters from "@/app/graphs/Filters";
import StoryContent from "@/app/graphs/StoryContent";
import dynamic from "next/dynamic";

const ArcDiagram = dynamic(() => import("./graphs/idiom-1/ArcDiagram"), { ssr: false });
const Streamgraph = dynamic(() => import("./graphs/idiom-2/Streamgraph"), { ssr: false });
const Marimekko = dynamic(() => import("./graphs/idiom-3/Marimekko"), { ssr: false });
const SpiralTimeline = dynamic(() => import("./graphs/idiom-4/SpiralTimeline"), { ssr: false });

const StarryBackground = () => {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number }>>([]);

  useEffect(() => {
    const generatedStars = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.3
    }));
    setStars(generatedStars);
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
        background: 'linear-gradient(180deg, #0a0a0c 0%, #050508 100%)',
        pointerEvents: 'none'
      }}>
        {stars.map(star => (
          <div
            key={star.id}
            style={{
              position: 'absolute',
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              borderRadius: '50%',
              background: 'white',
              opacity: star.opacity,
              animation: `twinkle ${2 + Math.random() * 3}s infinite`
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  );
};

const Timeline = ({ currentStep, onStepChange }: { currentStep: number; onStepChange: (step: number) => void }) => {
  const steps = [
    { id: 1, label: "Conexiones" },
    { id: 2, label: "Evolución" },
    { id: 3, label: "Eficiencia" },
    { id: 4, label: "Ciclos" },
    { id: 5, label: "Visión Global" }
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 20px',
      background: 'rgba(17, 17, 22, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)'
    }}>
      {steps.map((step, index) => (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onStepChange(step.id)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: currentStep === step.id ? '2px solid oklch(0.90 0.07 200)' : '2px solid rgba(255, 255, 255, 0.2)',
              background: currentStep === step.id ? 'oklch(0.90 0.07 200)' : currentStep > step.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{
              filter: currentStep === step.id ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))' : 'none',
              transition: 'filter 0.3s ease'
            }}>
              🚀
            </span>
          </button>
          {index < steps.length - 1 && (
            <div style={{
              width: '40px',
              height: '2px',
              background: currentStep > step.id
                ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))'
                : 'rgba(255, 255, 255, 0.1)',
              transition: 'background 0.3s ease'
            }} />
          )}
        </div>
      ))}
    </div>
  );
};

export default function Page() {
  const [currentStep, setCurrentStep] = useState(1);
  const [fadeIn, setFadeIn] = useState(true);

  const handleStepChange = (newStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentStep(newStep);
      setFadeIn(true);
    }, 300);
  };

  const renderContent = () => {
    if (currentStep === 5) {
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '10px',
          height: 'calc(100vh - 200px)',
          minHeight: '600px',
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}>
          <ArcDiagram />
          <Streamgraph />
          <Marimekko />
          <SpiralTimeline />
        </div>
      );
    }

    const charts = [
      <ArcDiagram key="arc" />,
      <Streamgraph key="stream" />,
      <Marimekko key="mari" />,
      <SpiralTimeline key="spiral" />
    ];

    const isTextFirst = currentStep % 2 !== 0;

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        height: 'calc(100vh - 200px)',
        minHeight: '600px',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        {isTextFirst ? (
          <>
            <StoryContent step={currentStep} />
            {charts[currentStep - 1]}
          </>
        ) : (
          <>
            {charts[currentStep - 1]}
            <StoryContent step={currentStep} />
          </>
        )}
      </div>
    );
  };

  return (
    <Provider>
      <StarryBackground />

      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 12, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 0'
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: '700',
          color: '#f3f4f6',
          letterSpacing: '1px',
          margin: 0
        }}>
          Space Missions • Storyboard
        </h1>
      </div>

      <div style={{
        position: 'sticky',
        top: '68px',
        background: 'rgba(10, 10, 12, 0.95)',
        zIndex: 50,
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <Timeline currentStep={currentStep} onStepChange={handleStepChange} />
          <Filters />
        </div>
      </div>

      <div style={{ padding: '10px' }}>
        {renderContent()}
      </div>
    </Provider>
  );
}
