"use client";

interface TooltipData {
  title: string;
  items: Array<{ label: string; value: string }>;
}

interface TooltipProps {
  data: TooltipData | null;
  position: { x: number; y: number } | null;
}

export default function Tooltip({ data, position }: TooltipProps) {
  if (!data || !position) return null;

  return (
    <div style={{
      position: 'fixed',
      left: position.x + 15,
      top: position.y - 10,
      background: 'rgba(15, 23, 42, 0.98)',
      border: '2px solid #10b981',
      borderRadius: '12px',
      padding: '14px 18px',
      pointerEvents: 'none',
      zIndex: 1000,
      minWidth: '220px',
      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>
        {data.title}
      </div>
      {data.items.map((item, idx) => (
        <div key={idx} style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#cbd5e1',
          marginBottom: '4px'
        }}>
          <span>{item.label}:</span>
          <span style={{ fontWeight: '600', color: '#e2e8f0', marginLeft: '12px' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}