"use client";
import React, { useEffect, useMemo, useState, useRef, useCallback, useLayoutEffect } from "react";
import * as d3 from "d3";

/* -------------------- Hook de medida -------------------- */
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      setBounds({ width: cr.width, height: cr.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return { ref, bounds } as const;
}

/* -------------------- Backdrop animado -------------------- */
function HydroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="blob blob1" />
      <div className="blob blob2" />
      <div className="blob blob3" />
      <style jsx>{`
        .blob {
          position: absolute;
          filter: blur(80px);
          opacity: 0.15;
          border-radius: 50%;
          mix-blend-mode: screen;
          will-change: transform;
          animation: drift 30s ease-in-out infinite;
        }
        .blob1 {
          width: 500px; height: 500px; left: -100px; top: -80px;
          background: radial-gradient(circle, #00f5ff 0%, #0066ff 30%, transparent 70%);
          animation-duration: 40s;
        }
        .blob2 {
          width: 400px; height: 400px; right: -80px; top: 20%;
          background: radial-gradient(circle, #ff0080 0%, #8000ff 30%, transparent 70%);
          animation-duration: 45s; animation-delay: -10s;
        }
        .blob3 {
          width: 450px; height: 450px; left: 20%; bottom: -100px;
          background: radial-gradient(circle, #00ff80 0%, #0080ff 30%, transparent 70%);
          animation-duration: 50s; animation-delay: -20s;
        }
        @keyframes drift {
          0% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
          25% { transform: translate3d(40px,-30px,0) scale(1.1) rotate(90deg); }
          50% { transform: translate3d(-20px,-40px,0) scale(0.9) rotate(180deg); }
          75% { transform: translate3d(-30px,20px,0) scale(1.05) rotate(270deg); }
          100% { transform: translate3d(0,0,0) scale(1) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* -------------------- Tooltip inteligente MEJORADO -------------------- */
type TooltipProps = {
  anchor: { x: number; y: number };
  content: string;
  visible: boolean;
  forceBelow?: boolean; // Nueva prop para forzar posición debajo
};

function TooltipSmart({ anchor, content, visible, forceBelow = false }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!visible || !ref.current) return;

    const pad = 12;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;

    // Obtener dimensiones reales del tooltip
    const rect = ref.current.getBoundingClientRect();
    const w = rect.width || 200;
    const h = rect.height || 48;

    // Posición vertical: SIEMPRE debajo del cursor si forceBelow está activo
    let top = anchor.y + pad;
    if (!forceBelow && top + h + pad > vh) {
      top = anchor.y - h - pad;
    }
    // Si forceBelow está activo, mantener siempre debajo
    if (forceBelow && top + h + pad > vh) {
      top = vh - h - pad;
    }

    // Posición horizontal: centrar alrededor del cursor
    let left = anchor.x - w / 2;
    if (left < pad) left = pad;
    if (left + w > vw - pad) left = vw - pad - w;

    setPos({ left, top });
  }, [anchor.x, anchor.y, content, visible, forceBelow]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-50 bg-gray-900/95 text-white px-3 py-2 rounded-lg shadow-lg text-sm border border-cyan-500/50 backdrop-blur whitespace-pre-line"
      style={{
        left: pos.left,
        top: pos.top,
        maxWidth: 280,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      {content}
    </div>
  );
}

/* -------------------- Calendar Heatmap -------------------- */
function CalendarHeatmap({
  data,
  cell = 14,
  gap = 3,
}: {
  data: { date: Date; value: number }[];
  cell?: number;
  gap?: number;
}) {
  const { ref } = useMeasure<HTMLDivElement>();
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipProps>({ anchor: { x: 0, y: 0 }, content: "", visible: false });

  const grouped = useMemo(() => d3.groups(data, (d) => d.date.getUTCFullYear()), [data]);

  const extentRaw = useMemo(() => d3.extent(data, (d) => d.value) as [number, number], [data]);
  const extent = useMemo<[number, number]>(() => {
    const [mn, mx] = extentRaw;
    if (mn === undefined || mx === undefined) return [0, 1];
    if (mn === mx) return [mn - 1, mx + 1];
    return [mn, mx];
  }, [extentRaw]);

  // Gradiente azul→cian→magenta→rojo neon
  const color = useMemo(() => {
    const interp = d3.interpolateRgbBasis(["#0066ff", "#00f5ff", "#7a00ff", "#ff0040"]);
    return d3.scaleSequential(interp).domain(extent);
  }, [extent]);

  // animar cambio de color
  useEffect(() => {
    const sel = d3.select(svgWrapRef.current).selectAll<SVGRectElement, unknown>("rect.cal-cell");
    sel
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr("fill", function () {
        const v = (this as any).__value as number | null;
        return v == null ? "#2a2a3e" : color(v);
      });
  }, [data, color]);

  const handleMouseMove = useCallback((event: React.MouseEvent, value: number | null, date: Date) => {
    if (value !== null) {
      setTooltip({
        anchor: { x: event.clientX, y: event.clientY },
        content: `${date.toLocaleDateString("es-CO")}: ${value.toFixed(2)}`,
        visible: true,
        forceBelow: true, // Forzar debajo del mouse
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div ref={ref} className="w-full relative max-h-[420px] rounded-xl neon-scroll">
      <div ref={svgWrapRef} className="flex flex-col gap-4 w-max">
        {grouped.map(([year, arr]) => {
          const start = new Date(Date.UTC(year, 0, 1));
          const end = new Date(Date.UTC(year + 1, 0, 1));
          const days = d3.utcDays(start, end);
          const map = new Map(arr.map((d) => [d3.utcFormat("%Y-%m-%d")(d.date), d.value]));
          const weeks = d3.utcSunday.count(d3.utcSunday.floor(start), end) + 1;

          // ancho real del contenido -> permite scroll horizontal si no cabe
          const w = weeks * (cell + gap) + 80;
          const h = 7 * (cell + gap) + 24;

          return (
            <svg
              key={year}
              width={w}
              height={h}
              className="bg-gray-900/90 backdrop-blur rounded-xl border border-cyan-500/20"
            >
              <text x={0} y={12} className="fill-cyan-300 text-[11px] font-semibold">
                {year}
              </text>
              {["D", "L", "M", "X", "J", "V", "S"].map((lab, i) => (
                <text
                  key={`${lab}-${i}`}
                  x={38}
                  y={i * (cell + gap) + cell + 4}
                  textAnchor="end"
                  className="fill-gray-400 text-[10px]"
                >
                  {lab}
                </text>
              ))}
              {days.map((d, i) => {
                const x = 48 + d3.utcSunday.count(d3.utcSunday.floor(start), d) * (cell + gap);
                const y = d.getUTCDay() * (cell + gap) + 6;
                const key = d3.utcFormat("%Y-%m-%d")(d);
                const v = map.get(key) ?? null;
                const fill = v == null ? "#2a2a3e" : color(v);

                return (
                  <rect
                    key={i}
                    className="cal-cell hover:stroke-cyan-400 hover:stroke-2 cursor-pointer transition-all duration-200"
                    x={x}
                    y={y}
                    width={cell}
                    height={cell}
                    rx={2}
                    fill={fill}
                    ref={(node) => {
                      if (node) (node as any).__value = v;
                    }}
                    onMouseMove={(e) => handleMouseMove(e, v, d)}
                    onMouseLeave={handleMouseLeave}
                    style={{ filter: v ? "drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))" : "none" }}
                  />
                );
              })}
            </svg>
          );
        })}
      </div>
      <TooltipSmart {...tooltip} />
      <style jsx>{`
        .neon-scroll {
          overflow: auto;
        }
        .neon-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .neon-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }
        .neon-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #00f5ff, #8000ff);
          border-radius: 8px;
          box-shadow: 0 0 8px rgba(0, 245, 255, 0.5);
        }
        .neon-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #00f5ff, #ff0080);
          box-shadow: 0 0 12px rgba(0, 245, 255, 0.8);
        }
        .neon-scroll::-webkit-scrollbar-corner {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}

/* -------------------- Seasonal Radial (araña) - TOOLTIP MEJORADO -------------------- */
function SeasonalRadial({ data, size = 420 }: { data: { date: Date; value: number }[]; size?: number }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const pathRef = useRef<SVGPathElement>(null);
  const [tooltip, setTooltip] = useState<TooltipProps>({ anchor: { x: 0, y: 0 }, content: "", visible: false, forceBelow: true });
  const [mounted, setMounted] = useState(false);
  const [hoverA, setHoverA] = useState<number | null>(null);

  const W = Math.min(size, Math.max(320, bounds.width || size));
  const R = W / 2 - 28;

  const MLAB = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dec"];

  const agg = useMemo(() => {
    const grp = d3.group(data, (d) => d.date.getUTCMonth());
    return d3.range(12).map((m) => ({
      m,
      mean: d3.mean(grp.get(m) ?? [], (d) => d.value) ?? 0,
      count: grp.get(m)?.length ?? 0,
      values: grp.get(m) ?? [],
    }));
  }, [data]);

  useEffect(() => setMounted(true), []);

  const angle = d3.scaleLinear([0, 12], [0, 2 * Math.PI]);

  const rScale = useMemo(() => {
    const ext = d3.extent(agg, (d) => d.mean) as [number, number];
    const mn = ext[0] ?? 0;
    const mx = ext[1] ?? 1;
    const domain = mn === mx ? [mn - 1, mx + 1] : [mn, mx];
    return d3.scaleLinear(domain, [R * 0.25, R]).nice();
  }, [agg, R]);

  const pts = d3.range(13).map((i) => {
    const m = i % 12;
    const a = angle(i);
    const v = agg[m].mean;
    return [a, rScale(v)] as [number, number];
  });
  const pathD = d3.lineRadial().curve(d3.curveCardinalClosed)(pts as any) ?? "";

  useEffect(() => {
    if (!mounted) return;
    const sel = d3.select(pathRef.current);
    const L = pathRef.current?.getTotalLength?.() ?? 0;
    sel
      .attr("stroke-dasharray", L)
      .attr("stroke-dashoffset", L)
      .transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);
  }, [pathD, mounted]);

  const toXY = useCallback((a: number, rr: number) => {
    const x = Math.round(Math.cos(a - Math.PI / 2) * rr * 1000) / 1000;
    const y = Math.round(Math.sin(a - Math.PI / 2) * rr * 1000) / 1000;
    return [x, y];
  }, []);

  const handlePointMove = useCallback(
    (event: React.MouseEvent, monthData: any) => {
      const { m, mean, count, values } = monthData;
      const min = d3.min(values, (d: any) => d.value) ?? 0;
      const max = d3.max(values, (d: any) => d.value) ?? 0;
      const safeMin = typeof min === 'number' ? min : 0;
      const safeMax = typeof max === 'number' ? max : 0;
      const safeMean = typeof mean === 'number' ? mean : 0;
      setHoverA(angle(m));
      setTooltip({
        anchor: { x: event.clientX, y: event.clientY },
        content: `${MLAB[m]}: ${safeMean.toFixed(2)} promedio\nMín: ${safeMin.toFixed(2)} | Máx: ${safeMax.toFixed(2)}\n${count} registros`,
        visible: true,
        forceBelow: true, // Siempre debajo del mouse
      });
    },
    [MLAB, angle]
  );

  const handleLeave = useCallback(() => {
    setHoverA(null);
    setTooltip((p) => ({ ...p, visible: false }));
  }, []);

  if (!mounted) {
    return (
      <div ref={ref} className="w-full flex items-center justify-center relative min-h-[460px]">
        <div className="bg-gray-900/90 backdrop-blur rounded-xl border border-purple-500/20 h-[420px] w-[420px] grid place-items-center text-gray-400">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full flex items-center justify-center relative min-h-[460px]">
      <svg
        width={W}
        height={W}
        viewBox={`${-W / 2} ${-W / 2} ${W} ${W}`}
        className="bg-gray-900/90 backdrop-blur rounded-xl border border-purple-500/20"
      >
        <defs>
          <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8000ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8000ff" stopOpacity="0.08" />
          </radialGradient>
        </defs>

        {d3.range(4).map((i) => (
          <circle key={i} r={(R * (i + 1)) / 4} fill="none" className="stroke-gray-600/50" strokeWidth={1} />
        ))}

        {d3.range(12).map((i) => {
          const [x, y] = toXY(angle(i), R);
          return <line key={i} x1={0} y1={0} x2={x} y2={y} className="stroke-gray-600/30" strokeWidth={0.5} />;
        })}

        <circle r={R} fill="url(#radialGlow)" />

        <path
          ref={pathRef}
          d={pathD}
          fill="rgba(0, 245, 255, 0.1)"
          className="stroke-cyan-400"
          strokeWidth={3}
          filter="drop-shadow(0 0 8px #00f5ff)"
        />

        {/* Línea radial punteada en hover */}
        {hoverA !== null && (
          <line
            x1={0}
            y1={0}
            x2={toXY(hoverA, R)[0]}
            y2={toXY(hoverA, R)[1]}
            strokeDasharray="4,4"
            className="stroke-cyan-400"
            strokeWidth={2}
          />
        )}

        {agg.map((monthData) => {
          const { m, mean } = monthData;
          const a = angle(m);
          const [px, py] = toXY(a, rScale(mean));
          const [lx, ly] = toXY(a, R + 12);

          return (
            <g key={m}>
              <circle
                cx={px}
                cy={py}
                r={4}
                fill="#00f5ff"
                className="cursor-pointer hover:r-6 transition-all duration-200"
                onMouseMove={(e) => handlePointMove(e, monthData)}
                onMouseLeave={handleLeave}
                filter="drop-shadow(0 0 4px #00f5ff)"
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-cyan-300 text-[10px] font-medium"
              >
                {MLAB[m]}
              </text>
            </g>
          );
        })}
      </svg>
      <TooltipSmart {...tooltip} />
    </div>
  );
}

/* -------------------- Ridgeline MEJORADO - tooltip debajo del mouse -------------------- */
function Ridgeline({ data, height = 420 }: { data: { group: number; value: number }[]; height?: number }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const gRef = useRef<SVGGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipProps>({ anchor: { x: 0, y: 0 }, content: "", visible: false, forceBelow: true });
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{month: number, value: number} | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const margin = { top: 8, right: 12, bottom: 24, left: 48 };
  const baseW = Math.max(720, bounds.width);
  const w = baseW - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  const MLAB = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dec"];

  const months = useMemo(() => {
    const result = d3.groups(data, (d) => d.group).sort((a, b) => a[0] - b[0]);
    // Cambiar la key para forzar re-animación cuando cambian los datos
    setAnimationKey(prev => prev + 1);
    return result;
  }, [data]);

  const x = useMemo(() => {
    const ext = d3.extent(data, (d) => d.value) as [number, number];
    const mn = ext[0] ?? 0, mx = ext[1] ?? 1;
    const domain = mn === mx ? [mn - 1, mx + 1] : [mn, mx];
    return d3.scaleLinear().domain(domain).nice().range([0, w]);
  }, [data, w]);

  const yBand = d3.scaleBand<number>().domain(d3.range(12)).range([0, h]).paddingInner(0.3);

  const areas = useMemo(() => {
    const hist = d3.bin().domain(x.domain() as [number, number]).thresholds(24);
    return months.map(([m, arr]) => {
      const bins = hist(arr.map((d) => d.value));
      const ymax = d3.max(bins, (b) => b.length) || 1;
      const y = d3.scaleLinear().domain([0, ymax]).range([yBand.bandwidth(), 0]);
      const area = d3
        .area<d3.Bin<number, number>>()
        .x((b) => x((b.x0! + b.x1!) / 2))
        .y0(() => (yBand(m) || 0) + yBand.bandwidth())
        .y1((b) => (yBand(m) || 0) + y(b.length))
        .curve(d3.curveCatmullRom.alpha(0.8));
      return { m, d: area(bins) ?? "", bins, yScale: y, mean: d3.mean(arr, (d) => d.value) || 0 };
    });
  }, [months, x, yBand]);

  // Animación INICIAL únicamente (no perpetua)
  useEffect(() => {
    const sel = d3.select(gRef.current).selectAll<SVGPathElement, unknown>("path.ridge-area");
    sel.each(function (_, i) {
      const path = this as SVGPathElement;
      const L = path.getTotalLength?.() ?? 0;

      // Resetear y animar una sola vez
      d3.select(path)
        .attr("stroke-dasharray", L)
        .attr("stroke-dashoffset", L)
        .transition()
        .duration(1000)
        .delay(i * 80)
        .ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function() {
          // IMPORTANTE: Remover stroke-dasharray al finalizar para evitar animaciones perpetuas
          d3.select(this).attr("stroke-dasharray", null);
        });
    });
  }, [animationKey]); // Solo cuando cambian los datos

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const svgElement = event.currentTarget.closest("svg") as SVGElement;
      if (!svgElement) return;

      const svgRect = svgElement.getBoundingClientRect();
      const mouseX = event.clientX - svgRect.left - margin.left;
      const mouseY = event.clientY - svgRect.top - margin.top;
      const value = x.invert(mouseX);

      // Determinar en qué mes estamos basado en la posición Y
      let currentMonth = -1;
      for (let i = 0; i < 12; i++) {
        const yPos = yBand(i) || 0;
        const bandwidth = yBand.bandwidth();
        if (mouseY >= yPos && mouseY <= yPos + bandwidth) {
          currentMonth = i;
          break;
        }
      }

      setHoverX(mouseX);
      setHoverInfo(currentMonth >= 0 ? { month: currentMonth, value } : null);

      let content = `Valor: ${value.toFixed(2)}`;
      if (currentMonth >= 0) {
        const monthData = areas.find(a => a.m === currentMonth);
        if (monthData) {
          content = `${MLAB[currentMonth]}\nValor: ${value.toFixed(2)}\nPromedio: ${monthData.mean.toFixed(2)}`;
        }
      }

      setTooltip({
        anchor: { x: event.clientX, y: event.clientY },
        content,
        visible: true,
        forceBelow: true, // Siempre debajo del mouse
      });
    },
    [x, margin.left, margin.top, areas, MLAB]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverX(null);
    setHoverInfo(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div ref={ref} className="w-full relative neon-scroll">
      <svg
        width={w + margin.left + margin.right}
        height={h + margin.top + margin.bottom}
        className="bg-gray-900/90 backdrop-blur rounded-xl border border-green-500/20"
        style={{ minWidth: 720 }}
      >
        <defs>
          <linearGradient id="ridgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff80" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#0080ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8000ff" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <g ref={gRef} transform={`translate(${margin.left},${margin.top})`}>
          {/* Área de interacción invisible */}
          <rect
            width={w}
            height={h}
            fill="transparent"
            className="cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />

          {/* Línea vertical de referencia */}
          {hoverX !== null && (
            <line
              x1={hoverX}
              y1={0}
              x2={hoverX}
              y2={h}
              className="stroke-cyan-400"
              strokeWidth={2}
              strokeDasharray="4,4"
              filter="drop-shadow(0 0 4px #00f5ff)"
            />
          )}

          {/* Resaltar mes en hover */}
          {hoverInfo && (
            <rect
              x={0}
              y={yBand(hoverInfo.month) || 0}
              width={w}
              height={yBand.bandwidth()}
              fill="rgba(0, 245, 255, 0.05)"
              stroke="rgba(0, 245, 255, 0.3)"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
          )}

          {/* Eje X */}
          <g transform={`translate(0,${h})`} className="text-[10px] text-gray-400">
            {x.ticks(6).map((tick) => (
              <g key={tick} transform={`translate(${x(tick)},0)`}>
                <line y2={6} className="stroke-gray-500" />
                <text y={18} textAnchor="middle" className="fill-gray-400 text-[10px]">
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
          </g>

          {/* Áreas - SIN animación perpetua */}
          {areas.map(({ m, d }) => (
            <path
              key={m}
              className="ridge-area transition-all duration-200"
              d={d}
              fill="url(#ridgeGradient)"
              stroke="#00f5ff"
              strokeWidth={1}
              filter="drop-shadow(0 0 4px rgba(0, 245, 255, 0.3))"
            />
          ))}

          {/* Etiquetas de mes */}
          {d3.range(12).map((m) => (
            <text
              key={m}
              x={-8}
              y={(yBand(m) || 0) + yBand.bandwidth() / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-cyan-300 text-[11px] font-medium"
            >
              {MLAB[m]}
            </text>
          ))}
        </g>
      </svg>
      <TooltipSmart {...tooltip} />
      <style jsx>{`
        .neon-scroll {
          overflow: auto;
        }
        .neon-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .neon-scroll::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }
        .neon-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #00ff80, #0080ff);
          border-radius: 8px;
          box-shadow: 0 0 8px rgba(0, 255, 128, 0.5);
        }
        .neon-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #00ff80, #8000ff);
          box-shadow: 0 0 12px rgba(0, 255, 128, 0.8);
        }
        .neon-scroll::-webkit-scrollbar-corner {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}

/* -------------------- Tipado y utilidades -------------------- */
type Row = {
  date: Date;
  pr: number;
  poten_evapo: number;
  t_max: number;
  t_min: number;
  t_mean: number;
  streamflow: number;
};
const parseDate = d3.utcParse("%Y-%m-%d");

const VARS: { key: keyof Row; label: string }[] = [
  { key: "streamflow", label: "Caudal (streamflow)" },
  { key: "pr", label: "Precipitación (pr)" },
  { key: "t_mean", label: "Temperatura media (t_mean)" },
];

/* -------------------- Componente principal -------------------- */
export default function TemporalHydroDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [varKey, setVarKey] = useState<keyof Row>("streamflow");
  const [year, setYear] = useState<number | "todos">("todos");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // SOLO lee del CSV en /public/data, separado por ;
    d3
      .dsv(";", "/data/camels_js.csv", (d: any) => {
        const date = parseDate(String(d.Date ?? d.date));
        if (!date) return null;
        const r: Row = {
          date,
          pr: +d.pr,
          poten_evapo: +d.poten_evapo,
          t_max: +d.t_max,
          t_min: +d.t_min,
          t_mean: +d.t_mean,
          streamflow: +d.streamflow,
        };
        // filtrar filas no numéricas
        if (
          [r.pr, r.poten_evapo, r.t_max, r.t_min, r.t_mean, r.streamflow].some((v) => !Number.isFinite(v))
        )
          return null;
        return r;
      })
      .then((data) => {
        const clean = (data.filter(Boolean) as Row[]).filter(
          (r) => r.date instanceof Date && !isNaN(+r.date)
        );
        setRows(clean);
      })
      .catch((err) => {
        console.error("Error cargando CSV:", err);
        setLoadError("No se pudo cargar /data/camels_js.csv");
      });
  }, []);

  const years = useMemo(
    () => Array.from(new Set(rows.map((r) => r.date.getUTCFullYear()))).sort((a, b) => a - b),
    [rows]
  );
  const filtered = useMemo(
    () => (year === "todos" ? rows : rows.filter((r) => r.date.getUTCFullYear() === year)),
    [rows, year]
  );

  const handleChange = useCallback((newVarKey: keyof Row, newYear: number | "todos") => {
    setIsTransitioning(true);
    setTimeout(() => {
      setVarKey(newVarKey);
      setYear(newYear);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 200);
  }, []);

  return (
    <section className="relative w-full min-h-screen py-6 px-4 md:px-6 bg-gray-950 text-white overflow-hidden">
      <HydroBackdrop />

      <div className="relative z-10 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
            Hidrometeorología — CAMELS-COL
          </h2>
          <p className="text-gray-400 text-sm mt-2">Dashboard interactivo con visualizaciones temporales y efectos neon.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-cyan-500/50 bg-gray-800/90 backdrop-blur px-3 py-2 text-sm text-cyan-300 shadow-lg transition-all duration-300 hover:border-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
            value={String(varKey)}
            onChange={(e) => handleChange(e.target.value as keyof Row, year)}
          >
            {VARS.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-purple-500/50 bg-gray-800/90 backdrop-blur px-3 py-2 text-sm text-purple-300 shadow-lg transition-all duration-300 hover:border-purple-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
            value={String(year)}
            onChange={(e) => handleChange(varKey, e.target.value === "todos" ? "todos" : +e.target.value)}
          >
            <option value="todos">Todos los años</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-600/40 rounded-lg px-3 py-2">
          {loadError}
        </div>
      )}

      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 ${
          isTransitioning ? "opacity-20 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* HEATMAP (con scroll neon personalizado) */}
        <div className="rounded-2xl bg-gray-900/50 backdrop-blur border border-cyan-500/20 p-4 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 overflow-hidden">
          <div className="text-sm font-medium text-cyan-300 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            Calendar Heatmap — {VARS.find((v) => v.key === varKey)?.label}
          </div>
          <CalendarHeatmap data={filtered.map((r) => ({ date: r.date, value: r[varKey] as number }))} />
        </div>

        {/* RADIAL (centrado) */}
        <div className="rounded-2xl bg-gray-900/50 backdrop-blur border border-purple-500/20 p-4 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 overflow-hidden">
          <div className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            Radial — {VARS.find((v) => v.key === varKey)?.label}
          </div>
          <SeasonalRadial data={filtered.map((r) => ({ date: r.date, value: r[varKey] as number }))} />
        </div>

        {/* RIDGELINE (sin animación perpetua, con scroll neon) */}
        <div className="lg:col-span-2 rounded-2xl bg-gray-900/50 backdrop-blur border border-green-500/20 p-4 shadow-2xl hover:shadow-green-500/20 transition-all duration-300 overflow-hidden">
          <div className="text-sm font-medium text-green-300 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Ridgeline Plot — {VARS.find((v) => v.key === varKey)?.label}
          </div>
          <Ridgeline data={filtered.map((r) => ({ group: r.date.getUTCMonth(), value: r[varKey] as number }))} />
        </div>
      </div>
    </section>
  );
}
