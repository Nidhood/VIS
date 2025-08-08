"use client";
import React, { useMemo, useRef, useEffect, useState } from "react";
import * as d3 from "d3";

// Medición de dimensiones responsivas
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [bounds, set] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      set({ width: cr.width, height: cr.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, bounds } as const;
}

// Tipo de dato para cada mes
type MonthDatum = {
  date: Date;
  Sales: number;
  Profit: number;
  byCategory: {
    "Technology": number;
    "Office Supplies": number;
    "Furniture": number;
  };
};

// Formateadores
const fmtCur = d3.format(",.0f");
const fmtPct = d3.format("+.1%");

// Componente KPI con sparkline
function KpiCard({ title, value, delta, series }: { title: string; value: string; delta?: number; series: number[] }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const w = Math.max(120, bounds.width);
  const h = 40;

  const path = useMemo(() => {
    if (!series.length) return "";
    const x = d3.scaleLinear().domain([0, series.length - 1]).range([0, w]);
    const y = d3.scaleLinear().domain(d3.extent(series) as [number, number]).nice().range([h, 0]);
    const line = d3.line<number>().x((_, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);
    return line(series) ?? "";
  }, [series, w]);

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur shadow-sm ring-1 ring-slate-200 p-4 flex flex-col gap-2">
      <div className="text-slate-500 text-xs uppercase tracking-wide">{title}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {typeof delta === "number" && (
          <div className={`text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {fmtPct(delta)}
          </div>
        )}
      </div>
      <div ref={ref} className="h-10 w-full">
        <svg width={w} height={h}>
          <path d={path} fill="none" stroke="currentColor" className="text-sky-600" strokeWidth={2} />
        </svg>
      </div>
    </div>
  );
}

// ================================
// Gráfico de barras apiladas
// ================================
function TimeSeriesStack({ data }: { data: MonthDatum[] }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const margin = { top: 12, right: 8, bottom: 22, left: 38 };
  const w = Math.max(320, bounds.width) - margin.left - margin.right;
  const h = 160;
  const categories = ["Technology", "Office Supplies", "Furniture"];

  const stacked = useMemo(() => {
    return d3.stack<MonthDatum>().keys(categories).value((d, key) => d.byCategory[key as keyof typeof d.byCategory])(data);
  }, [data]);

  const x = useMemo(() => d3.scaleUtc().domain(d3.extent(data, d => d.date) as [Date, Date]).range([0, w]), [data, w]);
  const y = useMemo(() => d3.scaleLinear().domain([0, d3.max(data, d => d.Sales)!]).nice().range([h, 0]), [data, h]);
  const color = d3.scaleOrdinal<string, string>().domain(categories).range(["#2563eb", "#06b6d4", "#10b981"]);

  return (
    <div ref={ref} className="w-full">
      <svg width={w + margin.left + margin.right} height={h + margin.top + margin.bottom}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {stacked.map((serie, i) => (
            <g key={i} fill={color(serie.key)}>
              {serie.map((d, j) => (
                <rect key={j} x={x(data[j].date)} y={y(d[1])} width={Math.max(1, (w / data.length) * 0.8)} height={Math.max(0, y(d[0]) - y(d[1]))} transform={`translate(${-(w / data.length) * 0.4},0)`} />
              ))}
            </g>
          ))}
          <g transform={`translate(0,${h})`} className="text-[10px] text-slate-500">
            {d3.axisBottom(x).ticks(6).tickSizeOuter(0)(d3.select("g"))}
          </g>
          <g className="text-[10px] text-slate-500">
            {d3.axisLeft(y).ticks(4).tickFormat(d => `$${fmtCur(+d)}` as any)(d3.select("g"))}
          </g>
        </g>
      </svg>
    </div>
  );
}

// ================================
// Componente Principal
// ================================
export default function HeaderDashboard() {
  const [timeSeries, setTimeSeries] = useState<MonthDatum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    d3.dsv(";", "/data/datos.csv", d => {
      return {
        date: new Date(d["Fecha"]),
        Sales: +d["VentasTotales"],
        Profit: +d["Ganancia"],
        byCategory: {
          Technology: +d["Tecnología"],
          "Office Supplies": +d["Oficina"],
          Furniture: +d["Muebles"]
        }
      };
    }).then(data => {
      setTimeSeries(data);
      setLoading(false);
    });
  }, []);

  const salesSeries = useMemo(() => timeSeries.map(d => d.Sales), [timeSeries]);
  const profitSeries = useMemo(() => timeSeries.map(d => d.Profit), [timeSeries]);
  const profitMargin = useMemo(() => {
    const totalSales = d3.sum(timeSeries, d => d.Sales);
    const totalProfit = d3.sum(timeSeries, d => d.Profit);
    return totalSales ? totalProfit / totalSales : 0;
  }, [timeSeries]);

  if (loading) return <div className="text-center text-gray-500 py-20">Cargando datos...</div>;

  return (
    <header className="relative min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-sky-100 blur-3xl opacity-60" />
        <div className="absolute -bottom-24 -left-12 h-80 w-80 rounded-full bg-emerald-100 blur-3xl opacity-60" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 md:py-10 lg:py-12">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight mb-6">Resumen de Ventas</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <KpiCard title="Ventas Totales" value={`$${fmtCur(d3.sum(salesSeries))}`} series={salesSeries} delta={0.04} />
          <KpiCard title="Ganancia Total" value={`$${fmtCur(d3.sum(profitSeries))}`} series={profitSeries} delta={0.02} />
          <KpiCard title="Margen" value={fmtPct(profitMargin)} series={profitSeries.map((v, i) => v / (salesSeries[i] || 1))} />
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700 mb-2">Ventas mensuales apiladas por categoría</div>
          <TimeSeriesStack data={timeSeries} />
        </div>
      </div>
    </header>
  );
}
