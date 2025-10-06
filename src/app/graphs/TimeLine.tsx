"use client";

type TimelineProps = {
  currentStep: number;
  onStepChange: (step: number) => void;
};

export default function Timeline({ currentStep, onStepChange }: TimelineProps) {
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
}
