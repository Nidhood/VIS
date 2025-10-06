"use client";

type StoryData = {
  title: string;
  content: string;
  imagePath: string;
};

const stories: Record<number, StoryData> = {
  1: {
    title: "Red de Conexiones Espaciales",
    content: "Desde 1957, más de 70 organizaciones han lanzado misiones al espacio. Esta red muestra cómo cada compañía se conecta con diferentes estados de misión: éxito, falla, éxito parcial o preocupante. SpaceX lidera con más de 180 lanzamientos exitosos, mientras que agencias históricas como la URSS y CASC muestran patrones únicos de riesgo y recompensa en la carrera espacial.",
    imagePath: "/img/one.png"
  },
  2: {
    title: "La Evolución Temporal del Espacio",
    content: "Los costos de misión han variado dramáticamente desde $20M hasta $450M por lanzamiento. Este flujo temporal revela cómo eventos como la Guerra Fría (pico en los 70s), la era del Transbordador (80s-90s) y la revolución de SpaceX (2010+) han transformado la economía espacial. Cada capa representa una compañía, mostrando su presencia e inversión a través del tiempo.",
    imagePath: "/img/two.png"
  },
  3: {
    title: "Eficiencia Comparativa",
    content: "Con un costo promedio de $150M por misión, algunas compañías operan 40% por debajo (azul) mientras otras exceden en 60% (naranja). Rocket Lab destaca por su eficiencia, con misiones bajo $50M. La anchura de cada columna representa el volumen total de lanzamientos, revelando que mayor actividad no siempre significa mayor costo promedio.",
    imagePath: "/img/three.png"
  },
  4: {
    title: "Ciclos Cósmicos",
    content: "Los lanzamientos espaciales siguen patrones estacionales fascinantes. Julio-Agosto y Diciembre-Enero son picos de actividad (aprovechando ventanas orbitales óptimas), mientras que Septiembre-Octubre muestran menor actividad. Desde los años 60 hasta hoy, cada anillo representa un año, y los colores indican el estado de las misiones, creando un mapa temporal de nuestros 65 años en el espacio.",
    imagePath: "/img/four.png"
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
      background: 'rgba(17, 17, 22, 0.6)',
      borderRadius: '14px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        width: '100%',
        height: '280px',
        marginBottom: '24px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0, 0, 0, 0.3)',
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
            filter: 'brightness(0.95)'
          }}
        />
      </div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '16px',
        color: '#f3f4f6',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        {story.title}
      </h2>
      <p style={{
        fontSize: '15px',
        lineHeight: '1.7',
        color: '#cbd5e1',
        textAlign: 'justify'
      }}>
        {story.content}
      </p>
    </div>
  );
}
