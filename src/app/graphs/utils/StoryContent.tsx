"use client";

type StoryData = {
  title: string;
  content: string;
  imagePath: string;
};

const stories: Record<number, StoryData> = {
  1: {
    title: "La Transición Energética Global",
    content: "Desde el año 2000, el mundo ha experimentado una transformación sin precedentes en su matriz energética. La generación de electricidad a partir de fuentes renovables ha crecido exponencialmente, pasando de representar apenas el 18% de la producción global a alcanzar más del 30% en 2023. Esta visualización muestra cómo la energía limpia (solar, eólica, hidroeléctrica) compite cada vez más con los combustibles fósiles tradicionales, marcando el inicio de una nueva era energética.",
    imagePath: "/img/idiom-1_stacked_area_energy_mix.png"
  },
  2: {
    title: "Líderes en Energía Limpia",
    content: "Los continentes no avanzan al mismo ritmo en la adopción de energías renovables. Europa lidera con más del 45% de participación de energía limpia, seguida por América y Oceanía con aproximadamente 35% cada una. Asia, a pesar de ser el mayor productor de energía, mantiene solo 25% de renovables debido a su dependencia del carbón. África muestra el crecimiento más acelerado en los últimos años, aprovechando su enorme potencial solar y eólico. Cada línea cuenta la historia de políticas energéticas, inversiones y compromisos climáticos diferentes.",
    imagePath: "/img/idiom-2_line_clean_share_continents.png"
  },
  3: {
    title: "Criptomonedas y Consumo Energético",
    content: "La relación entre el crecimiento de las criptomonedas y el aumento en la generación eléctrica global revela una paradoja moderna. Bitcoin y Ethereum, que experimentaron crecimientos de capitalización de mercado superiores al 200%, coincidieron con períodos de incremento del 15-20% en la demanda energética global. Este diagrama de pendiente muestra cómo la economía digital está íntimamente ligada a la infraestructura energética física, planteando preguntas sobre sostenibilidad en la era blockchain.",
    imagePath: "/img/idiom-3_slope_crypto_growth_vs_energy.png"
  },
  4: {
    title: "Evolución Temporal por Región",
    content: "Este mapa de calor revela patrones temporales fascinantes en la adopción de energía limpia. Europa mantiene consistentemente los valores más altos (tonos verdes intensos) desde 2010, mientras que Asia muestra una transición gradual visible en el cambio de colores oscuros a intermedios. Los años 2015-2020 marcan un punto de inflexión global, donde la mayoría de regiones aceleraron su transición hacia renovables, impulsadas por el Acuerdo de París y la caída en costos de tecnologías solares y eólicas.",
    imagePath: "/img/idiom-4_multiline_production_consumption.png"
  }
};

type StoryContentProps = {
  step: number;
};

export default function StoryContent({ step }: StoryContentProps) {
  const story = stories[step] || stories[1];

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '30px',
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05))',
      borderRadius: '14px',
      border: '1px solid rgba(16, 185, 129, 0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        width: '100%',
        height: '280px',
        marginBottom: '24px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        background: 'rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src={story.imagePath}
          alt={story.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            animation: 'imageZoom 0.8s ease forwards'
          }}
        />
      </div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '16px',
        color: '#10b981',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        {story.title}
      </h2>
      <p style={{
        fontSize: '15px',
        lineHeight: '1.7',
        color: '#d1d5db',
        textAlign: 'justify'
      }}>
        {story.content}
      </p>
    </div>
  );
}