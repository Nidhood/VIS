"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EnergyFlowBackground = () => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number; speed: number; delay: number }>>([]);

  useEffect(() => {
    const generatedParticles = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 3 + 2,
      delay: Math.random() * 5
    }));
    setParticles(generatedParticles);
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
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1e 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 20s ease infinite',
        pointerEvents: 'none'
      }}>
        {particles.map(particle => (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              borderRadius: '50%',
              background: particle.id % 3 === 0 ? '#a7c7e7' : particle.id % 3 === 1 ? '#bae1a4' : '#ffffba',
              opacity: particle.opacity,
              animation: `energyTwinkle ${particle.speed}s infinite ease-in-out`,
              animationDelay: `${particle.delay}s`,
              boxShadow: `0 0 ${particle.size * 3}px currentColor`,
              filter: 'blur(0.5px)'
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes energyTwinkle {
          0%, 100% {
            transform: scale(1) translateY(0px);
            opacity: 0.2;
          }
          25% {
            opacity: 0.8;
            transform: scale(1.2) translateY(-5px);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.9) translateY(-10px);
          }
          75% {
            opacity: 0.9;
            transform: scale(1.1) translateY(-5px);
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

const ImageModal = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.92)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.3s ease'
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(167, 199, 231, 0.2)',
          border: '2px solid rgba(167, 199, 231, 0.5)',
          color: '#a7c7e7',
          fontSize: '24px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 10000
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(167, 199, 231, 0.3)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(167, 199, 231, 0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '95%',
          maxHeight: '95%',
          objectFit: 'contain',
          borderRadius: '12px',
          boxShadow: '0 20px 80px rgba(167, 199, 231, 0.4)',
          animation: 'zoomIn 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default function Page() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const scrollHeight = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      setScrollProgress(progress);

      const section = Math.floor((progress / 100) * 6);
      setActiveSection(Math.min(section, 5));
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const sections = [
    {
      id: 0,
      title: "¿Estamos Realmente Ganando la Batalla por un Futuro Sostenible?",
      subtitle: "",
      content: "Desde el año 2000, el mundo ha iniciado la transición energética más importante de la historia. Europa lidera, Asia lucha, África emerge... ¿pero es suficiente?",
      visual: "hero",
      isHook: true
    },
    {
      id: 1,
      title: "La Transición Energética Global",
      subtitle: "El Ascenso Imparable",
      content: "Desde el año 2000, el mundo ha experimentado una transformación sin precedentes en su matriz energética. La generación de electricidad a partir de fuentes renovables ha crecido exponencialmente, pasando de representar apenas el 18% de la producción global a alcanzar más del 30% en 2023. Esta visualización muestra cómo la energía limpia (solar, eólica, hidroeléctrica) compite cada vez más con los combustibles fósiles tradicionales, marcando el inicio de una nueva era energética.",
      image: "/img/idiom-1_stacked_area_energy_mix.png",
      isHook: false
    },
    {
      id: 2,
      title: "Líderes en Energía Limpia",
      subtitle: "Carreras Continentales",
      content: "Los continentes no avanzan al mismo ritmo en la adopción de energías renovables. Europa lidera con más del 45% de participación de energía limpia, seguida por América y Oceanía con aproximadamente 35% cada una. Asia, a pesar de ser el mayor productor de energía, mantiene solo 25% de renovables debido a su dependencia del carbón. África muestra el crecimiento más acelerado en los últimos años, aprovechando su enorme potencial solar y eólico.",
      image: "/img/idiom-2_line_clean_share_continents.png",
      isHook: false
    },
    {
      id: 3,
      title: "Criptomonedas y Consumo Energético",
      subtitle: "La Paradoja Digital",
      content: "La relación entre el crecimiento de las criptomonedas y el aumento en la generación eléctrica global revela una paradoja moderna. Bitcoin y Ethereum, que experimentaron crecimientos de capitalización de mercado superiores al 200%, coincidieron con períodos de incremento del 15-20% en la demanda energética global. Este diagrama muestra cómo la economía digital está íntimamente ligada a la infraestructura energética física.",
      image: "/img/idiom-3_slope_crypto_growth_vs_energy.png",
      isHook: false
    },
    {
      id: 4,
      title: "Evolución Temporal por Región",
      subtitle: "Patrones en el Tiempo",
      content: "Este mapa de calor revela patrones temporales fascinantes en la adopción de energía limpia. Europa mantiene consistentemente los valores más altos desde 2010, mientras que Asia muestra una transición gradual. Los años 2015-2020 marcan un punto de inflexión global, donde la mayoría de regiones aceleraron su transición hacia renovables, impulsadas por el Acuerdo de París.",
      image: "/img/idiom-4_multiline_production_consumption.png",
      isHook: false
    },
    {
      id: 5,
      title: "El Futuro Está en Tus Manos",
      subtitle: "",
      content: "La transición energética no es solo una estadística. Es la historia de nuestra supervivencia, nuestro progreso y nuestro legado para las futuras generaciones. Explora los datos interactivos en nuestro dashboard.",
      visual: "conclusion",
      isHook: false
    }
  ];

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const renderVisual = (section: any) => {
    const isActive = activeSection === section.id;

    if (section.visual === "hero") {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            fontSize: '180px',
            animation: 'energyPulse 3s ease-in-out infinite',
            filter: 'drop-shadow(0 0 40px rgba(167, 199, 231, 0.6))',
            opacity: isActive ? 1 : 0.3,
            transition: 'opacity 0.6s ease'
          }}>
            ⚡
          </div>
        </div>
      );
    }

    if (section.visual === "conclusion") {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            fontSize: '140px',
            animation: 'energyPulse 3s ease-in-out infinite',
            filter: 'drop-shadow(0 0 40px rgba(186, 225, 164, 0.6))',
            opacity: isActive ? 1 : 0.3,
            transition: 'opacity 0.6s ease'
          }}>
            🌍
          </div>
        </div>
      );
    }

    if (section.image) {
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            position: 'relative',
            cursor: 'pointer'
          }}
          onClick={() => setModalImage({ src: section.image, alt: section.title })}
        >
          <img
            src={section.image}
            alt={section.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: isActive ? 1 : 0.3,
              transform: isActive ? 'scale(1)' : 'scale(0.95)',
              transition: 'all 0.6s ease'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              background: 'rgba(167, 199, 231, 0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(167, 199, 231, 0.4)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#a7c7e7',
              fontSize: '14px',
              fontWeight: '600',
              opacity: isActive ? 0.9 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none'
            }}
          >
            🔍 Click para ampliar
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <EnergyFlowBackground />

      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          onClose={() => setModalImage(null)}
        />
      )}

      {/* Progress Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '4px',
        background: 'rgba(167, 199, 231, 0.2)',
        zIndex: 1000
      }}>
        <div style={{
          height: '100%',
          width: `${scrollProgress}%`,
          background: 'linear-gradient(90deg, #a7c7e7, #bae1a4)',
          transition: 'width 0.1s ease',
          boxShadow: '0 0 10px rgba(167, 199, 231, 0.5)'
        }} />
      </div>

      {/* Navigation Dots */}
      <div style={{
        position: 'fixed',
        right: '30px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        {sections.map((section, index) => (
          <div
            key={section.id}
            style={{
              width: activeSection === index ? '12px' : '8px',
              height: activeSection === index ? '12px' : '8px',
              borderRadius: '50%',
              background: activeSection === index ? '#a7c7e7' : 'rgba(167, 199, 231, 0.3)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: activeSection === index ? '0 0 10px rgba(167, 199, 231, 0.8)' : 'none'
            }}
            onClick={() => {
              const container = containerRef.current;
              if (container) {
                const sectionHeight = container.scrollHeight / sections.length;
                container.scrollTo({
                  top: sectionHeight * index,
                  behavior: 'smooth'
                });
              }
            }}
          />
        ))}
      </div>

      {/* Scrollable Content */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100vh',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth'
        }}
      >
        {sections.map((section, index) => {
          const isActive = activeSection === section.id;

          if (section.isHook) {
            return (
              <div
                key={section.id}
                style={{
                  minHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '40px',
                  padding: '60px',
                  scrollSnapAlign: 'start',
                  position: 'relative'
                }}
              >
                <div style={{
                  fontSize: '120px',
                  animation: 'energyPulse 3s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 30px rgba(167, 199, 231, 0.6))',
                  opacity: isActive ? 1 : 0.3,
                  transition: 'opacity 0.6s ease'
                }}>
                  ⚡
                </div>

                <h1 style={{
                  fontSize: '64px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #a7c7e7, #bae1a4, #ffffba)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textAlign: 'center',
                  lineHeight: '1.2',
                  maxWidth: '900px',
                  opacity: isActive ? 1 : 0.3,
                  transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s ease'
                }}>
                  {section.title}
                </h1>

                <p style={{
                  fontSize: '24px',
                  color: '#c8d5e8',
                  textAlign: 'center',
                  maxWidth: '800px',
                  lineHeight: '1.6',
                  opacity: isActive ? 1 : 0.3,
                  transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.6s ease 0.2s'
                }}>
                  {section.content}
                </p>

                <div style={{
                  marginTop: '20px',
                  fontSize: '14px',
                  color: '#8b9ab8',
                  opacity: isActive ? 1 : 0.3,
                  transition: 'opacity 0.6s ease 0.4s'
                }}>
                  Santiago Castro Zuluaga • Iván Darío Orozco Ibáñez
                </div>

                <div style={{
                  marginTop: '40px',
                  fontSize: '32px',
                  animation: 'bounce 2s infinite',
                  color: '#a7c7e7',
                  opacity: isActive ? 1 : 0
                }}>
                  ↓
                </div>
              </div>
            );
          }

          if (section.visual === "conclusion") {
            return (
              <div
                key={section.id}
                style={{
                  minHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '30px',
                  scrollSnapAlign: 'start',
                  padding: '60px'
                }}
              >
                <div style={{
                  fontSize: '140px',
                  animation: 'energyPulse 3s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 40px rgba(186, 225, 164, 0.6))',
                  opacity: isActive ? 1 : 0.3,
                  transition: 'opacity 0.6s ease'
                }}>
                  🌍
                </div>

                <h2 style={{
                  fontSize: '64px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #bae1a4, #a7c7e7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textAlign: 'center',
                  opacity: isActive ? 1 : 0.3,
                  transform: isActive ? 'scale(1)' : 'scale(0.95)',
                  transition: 'all 0.6s ease'
                }}>
                  {section.title}
                </h2>

                <p style={{
                  fontSize: '20px',
                  color: '#c8d5e8',
                  textAlign: 'center',
                  maxWidth: '800px',
                  opacity: isActive ? 1 : 0.3,
                  transition: 'opacity 0.6s ease'
                }}>
                  {section.content}
                </p>

                <button
                  onClick={goToDashboard}
                  style={{
                    marginTop: '30px',
                    padding: '16px 40px',
                    fontSize: '18px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #a7c7e7, #bae1a4)',
                    color: '#1a1a2e',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 24px rgba(167, 199, 231, 0.4)',
                    opacity: isActive ? 1 : 0.3
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(167, 199, 231, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(167, 199, 231, 0.4)';
                  }}
                >
                  Explorar Dashboard Interactivo →
                </button>

                <div style={{
                  marginTop: '20px',
                  fontSize: '14px',
                  color: '#8b9ab8',
                  opacity: isActive ? 1 : 0.3,
                  transition: 'opacity 0.6s ease'
                }}>
                  Santiago Castro Zuluaga • Iván Darío Orozco Ibáñez
                </div>
              </div>
            );
          }

          return (
            <div
              key={section.id}
              style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'start',
                padding: '60px',
                position: 'relative'
              }}
            >
              <div style={{
                maxWidth: '1400px',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '60px',
                alignItems: 'center'
              }}>
                <div style={{
                  order: index % 2 === 0 ? 1 : 2,
                  opacity: isActive ? 1 : 0.3,
                  transform: isActive ? 'translateX(0)' : (index % 2 === 0 ? 'translateX(-20px)' : 'translateX(20px)'),
                  transition: 'all 0.6s ease'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#a7c7e7',
                    fontWeight: '600',
                    letterSpacing: '2px',
                    marginBottom: '10px',
                    textTransform: 'uppercase'
                  }}>
                    Capítulo {section.id}
                  </div>
                  <h2 style={{
                    fontSize: '48px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #a7c7e7, #bae1a4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '15px',
                    lineHeight: '1.2'
                  }}>
                    {section.title}
                  </h2>
                  <h3 style={{
                    fontSize: '24px',
                    color: '#9faec7',
                    fontWeight: '400',
                    marginBottom: '30px'
                  }}>
                    {section.subtitle}
                  </h3>
                  <p style={{
                    fontSize: '18px',
                    lineHeight: '1.8',
                    color: '#c8d5e8',
                    textAlign: 'justify'
                  }}>
                    {section.content}
                  </p>
                </div>

                <div style={{
                  order: index % 2 === 0 ? 2 : 1,
                  height: '600px',
                  background: 'rgba(22, 33, 62, 0.6)',
                  border: '2px solid rgba(167, 199, 231, 0.3)',
                  borderRadius: '20px',
                  padding: '0',
                  backdropFilter: 'blur(10px)',
                  opacity: isActive ? 1 : 0.3,
                  transform: isActive ? 'scale(1)' : 'scale(0.95)',
                  transition: 'all 0.6s ease',
                  boxShadow: isActive ? '0 20px 60px rgba(167, 199, 231, 0.3)' : '0 10px 30px rgba(0, 0, 0, 0.3)',
                  overflow: 'hidden'
                }}>
                  {renderVisual(section)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes energyPulse {
          0%, 100% {
            filter: drop-shadow(0 0 20px rgba(167, 199, 231, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 40px rgba(167, 199, 231, 0.8));
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes zoomIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}