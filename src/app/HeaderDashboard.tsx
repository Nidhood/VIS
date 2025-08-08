"use client";
import React, { useMemo, useRef, useEffect, useState } from "react";
import * as d3 from "d3";

// ================================
// Helper: responsive SVG (ResizeObserver)
// ================================
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

// ================================
// Mock data (replace with real joins/rollups later)
// ================================
const months = d3.utcMonth.range(new Date("2013-01-01"), new Date("2016-01-01"));
const categories = ["Office Supplies", "Furniture", "Technology"] as const;

type MonthDatum = {
  date: Date;
  Sales: number; // total
  Profit: number; // total
  byCategory: Record<(typeof categories)[number], number>;
};

const timeSeries: MonthDatum[] = months.map((m) => {
  const base = 60000 + Math.random() * 40000;
  const mix = d3.randomUniform.source(d3.randomLcg(d3.timeMonth.count(months[0], m) + 1))(0.15, 0.6);
  const tech = base * mix * 0.9;
  const office = base * (1 - mix) * 0.7;
  const furniture = base * 0.4;
  const profit = tech * 0.22 + office * 0.1 + furniture * 0.05 - (Math.random() * 4000);
  return {
    date: m,
    Sales: tech + office + furniture,
    Profit: profit,
    byCategory: {
      "Technology": tech,
      "Office Supplies": office,
      "Furniture": furniture,
    },
  };
});

const regions = [
  { region: "West", sales: 420000, margin: 0.16 },
  { region: "East", sales: 380000, margin: 0.12 },
  { region: "Central", sales: 350000, margin: 0.07 },
  { region: "South", sales: 300000, margin: -0.02 },
];

const discountProfitPoints = d3.range(320).map((i) => ({
  discount: Math.max(0, Math.min(0.6, d3.randomNormal(0.18, 0.12)())),
  margin: d3.randomNormal(0.12, 0.18)(),
  qty: Math.floor(Math.max(1, d3.randomNormal(4, 2)())),
  category: categories[i % 3],
  returned: Math.random() < 0.12,
}));

// Simple currency / percent formatter
const fmtCur = d3.format(",.0f");
const fmtPct = d3.format("+.1%");

// ================================
// KPI Card with Sparkline
// ================================
function KpiCard({ title, value, delta, series }: { title: string; value: string; delta?: number; series: number[]; }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const w = Math.max(120, bounds.width);
  const h = 40;

  const path = useMemo(() => {
    if (!series.length) return "";
    const x = d3.scaleLinear().domain([0, series.length - 1]).range([0, w]);
    const y = d3.scaleLinear().domain(d3.extent(series) as [number, number]).nice().range([h, 0]);
    const line = d3.line<number>().x((_, i) => x(i)).y((d) => y(d)).curve(d3.curveMonotoneX);
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
        <svg width={w} height={h} role="img" aria-label={`${title} sparkline`}>
          <path d={path} fill="none" stroke="currentColor" className="text-sky-600" strokeWidth={2} />
        </svg>
      </div>
    </div>
  );
}

// ================================
// Time series: stacked bars (Sales by Category) + separate Profit line panel
// ================================
function TimeSeriesStack({ data }: { data: MonthDatum[] }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const margin = { top: 12, right: 8, bottom: 22, left: 38 };
  const w = Math.max(320, bounds.width) - margin.left - margin.right;
  const h = 160; // bars panel height

  const stacked = useMemo(() => {
    const series = d3.stack<(typeof categories)[number]>()
      .keys(categories)
      .value((d: MonthDatum, key) => d.byCategory[key])
      (data as any);
    return series; // [ [ [y0,y1], ...] per key ]
  }, [data]);

  const x = useMemo(() => d3.scaleUtc().domain(d3.extent(data, d => d.date) as [Date, Date]).range([0, w]), [data, w]);
  const y = useMemo(() => d3.scaleLinear().domain([0, d3.max(data, d => d.Sales)!]).nice().range([h, 0]), [data, h]);
  const color = d3.scaleOrdinal<string, string>().domain(categories as unknown as string[]).range(["#2563eb", "#06b6d4", "#10b981"]);
  const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
  const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.call(d3.axisLeft(y).ticks(4).tickFormat((d) => `$${fmtCur(+d)}` as any)).call((g) => g.select(".domain").remove());

  return (
    <div ref={ref} className="w-full">
      <svg width={w + margin.left + margin.right} height={h + margin.top + margin.bottom} viewBox={`0 0 ${w + margin.left + margin.right} ${h + margin.top + margin.bottom}`}
        role="img" aria-label="Ventas mensuales apiladas por categoría">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {stacked.map((serie, i) => (
            <g key={i} fill={color(serie.key as any)}>
              {serie.map((d, j) => (
                <rect key={j} x={x(data[j].date)} y={y(d[1])} width={Math.max(1, (w / data.length) * 0.8)} height={Math.max(0, y(d[0]) - y(d[1]))} transform={`translate(${-(w / data.length) * 0.4},0)`} />
              ))}
            </g>
          ))}
          <g ref={(node) => node && xAxis(d3.select(node))} className="text-[10px] text-slate-500" />
          <g ref={(node) => node && yAxis(d3.select(node))} className="text-[10px] text-slate-500" />
        </g>
      </svg>
    </div>
  );
}

function ProfitLine({ data }: { data: MonthDatum[] }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const margin = { top: 12, right: 8, bottom: 22, left: 38 };
  const w = Math.max(320, bounds.width) - margin.left - margin.right;
  const h = 120;

  const x = useMemo(() => d3.scaleUtc().domain(d3.extent(data, d => d.date) as [Date, Date]).range([0, w]), [data, w]);
  const y = useMemo(() => d3.scaleLinear().domain(d3.extent(data, d => d.Profit) as [number, number]).nice().range([h, 0]), [data, h]);
  const line = useMemo(() => d3.line<MonthDatum>().x(d => x(d.date)).y(d => y(d.Profit)).curve(d3.curveMonotoneX)(data), [data, x, y]);

  const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
  const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.call(d3.axisLeft(y).ticks(4).tickFormat((d) => `$${fmtCur(+d)}` as any)).call((g) => g.select(".domain").remove()).call((g) => g.selectAll(".tick line").attr("x2", 0));

  return (
    <div ref={ref} className="w-full">
      <svg width={w + margin.left + margin.right} height={h + margin.top + margin.bottom} role="img" aria-label="Serie temporal de profit">
        <g transform={`translate(${margin.left},${margin.top})`}>
          <line x1={0} x2={w} y1={y(0)} y2={y(0)} className="stroke-slate-300" strokeDasharray="2 4" />
          <path d={line || ""} fill="none" className="stroke-emerald-600" strokeWidth={2} />
          <g ref={(node) => node && xAxis(d3.select(node))} className="text-[10px] text-slate-500" />
          <g ref={(node) => node && yAxis(d3.select(node))} className="text-[10px] text-slate-500" />
        </g>
      </svg>
    </div>
  );
}

// ================================
// Region bars: horizontal, colored by margin
// ================================
function RegionBars({ data }: { data: { region: string; sales: number; margin: number }[] }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const margin = { top: 12, right: 8, bottom: 22, left: 84 };
  const w = Math.max(280, bounds.width) - margin.left - margin.right;
  const h = 160;

  const y = useMemo(() => d3.scaleBand().domain(data.map(d => d.region)).range([0, h]).padding(0.25), [data, h]);
  const x = useMemo(() => d3.scaleLinear().domain([0, d3.max(data, d => d.sales)!]).nice().range([0, w]), [data, w]);
  const color = (m: number) => d3.interpolateRdBu(0.5 - d3.scaleLinear([ -0.05, 0.2 ], [ -0.5, 0.5 ])(m));

  const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(4).tickFormat((d) => `$${fmtCur(+d)}` as any)).call((g) => g.select(".domain").remove());
  const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.call(d3.axisLeft(y).tickSize(0)).call((g) => g.select(".domain").remove());

  return (
    <div ref={ref} className="w-full">
      <svg width={w + margin.left + margin.right} height={h + margin.top + margin.bottom} role="img" aria-label="Ventas por región (color = margen)">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {data.map((d) => (
            <g key={d.region}>
              <rect x={0} y={y(d.region)} width={x(d.sales)} height={y.bandwidth()} fill={color(d.margin)} rx={8} />
              <text x={x(d.sales) + 6} y={(y(d.region) || 0) + y.bandwidth() / 2} dominantBaseline="middle" className="fill-slate-700 text-[11px]">${fmtCur(d.sales)} ({fmtPct(d.margin)})</text>
            </g>
          ))}
          <g ref={(node) => node && xAxis(d3.select(node))} className="text-[10px] text-slate-500" />
          <g ref={(node) => node && yAxis(d3.select(node))} className="text-[11px] text-slate-700" />
        </g>
      </svg>
    </div>
  );
}

// ================================
// Scatter: Discount vs Profit Margin (with returned flag)
// ================================
function DiscountVsMargin({ points }: { points: { discount: number; margin: number; qty: number; category: string; returned: boolean }[] }) {
  const { ref, bounds } = useMeasure<HTMLDivElement>();
  const margin = { top: 12, right: 8, bottom: 26, left: 38 };
  const w = Math.max(320, bounds.width) - margin.left - margin.right;
  const h = 180;

  const x = useMemo(() => d3.scaleLinear().domain([0, 0.6]).nice().range([0, w]), [w]);
  const y = useMemo(() => d3.scaleLinear().domain([-0.5, 0.5]).nice().range([h, 0]), [h]);
  const r = (q: number) => Math.max(2, Math.min(10, Math.sqrt(q) + 2));
  const color = d3.scaleOrdinal<string, string>().domain(categories as unknown as string[]).range(["#2563eb", "#06b6d4", "#10b981"]);

  const xAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).ticks(6, "%").tickFormat((d) => d3.format(".0%")(+d) as any));
  const yAxis = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.call(d3.axisLeft(y).ticks(5, "%").tickFormat((d) => d3.format("+.0%")(+d) as any)).call((g) => g.select(".domain").remove());

  return (
    <div ref={ref} className="w-full">
      <svg width={w + margin.left + margin.right} height={h + margin.top + margin.bottom} role="img" aria-label="Descuento vs margen">
        <g transform={`translate(${margin.left},${margin.top})`}>
          <line x1={0} x2={w} y1={y(0)} y2={y(0)} className="stroke-slate-300" strokeDasharray="2 4" />
          {points.map((p, i) => (
            <circle key={i} cx={x(p.discount)} cy={y(p.margin)} r={r(p.qty)} fill={color(p.category)} opacity={0.7} stroke={p.returned ? "#ef4444" : "none"} strokeWidth={p.returned ? 1.5 : 0} />
          ))}
          <g ref={(node) => node && xAxis(d3.select(node))} className="text-[10px] text-slate-500" />
          <g ref={(node) => node && yAxis(d3.select(node))} className="text-[10px] text-slate-500" />
        </g>
      </svg>
    </div>
  );
}

// ================================
// Page-level component: Full-bleed header dashboard
// ================================
export default function HeaderDashboard() {
  // KPI series from timeSeries totals
  const salesSeries = timeSeries.map(d => d.Sales);
  const profitSeries = timeSeries.map(d => d.Profit);
  const ordersSeries = timeSeries.map(() => 100 + Math.random() * 60);

  const totalSales = d3.sum(timeSeries, d => d.Sales);
  const totalProfit = d3.sum(timeSeries, d => d.Profit);
  const profitMargin = totalProfit / totalSales;
  const returnRate = discountProfitPoints.filter(p => p.returned).length / discountProfitPoints.length;

  return (
    <header className="relative min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Background accent */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-sky-100 blur-3xl opacity-60" />
        <div className="absolute -bottom-24 -left-12 h-80 w-80 rounded-full bg-emerald-100 blur-3xl opacity-60" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 md:py-10 lg:py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Superstore Overview</h1>
          <div className="text-xs text-slate-500">React + D3 — Header Dashboard</div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="Total Sales" value={`$${fmtCur(totalSales)}`} delta={0.06} series={salesSeries} />
          <KpiCard title="Total Profit" value={`$${fmtCur(totalProfit)}`} delta={0.03} series={profitSeries} />
          <KpiCard title="Profit Margin" value={fmtPct(profitMargin)} delta={-0.01} series={profitSeries.map((v, i) => v / (salesSeries[i] || 1))} />
          <KpiCard title="Return Rate" value={fmtPct(returnRate)} series={ordersSeries.map((_, i) => (i % 12) / 24)} />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
            <div className="text-sm font-medium text-slate-700 mb-2">Ventas por mes (apiladas por categoría)</div>
            <TimeSeriesStack data={timeSeries} />
            <div className="mt-4 text-sm font-medium text-slate-700 mb-2">Profit mensual</div>
            <ProfitLine data={timeSeries} />
          </div>

          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
            <div className="text-sm font-medium text-slate-700 mb-2">Ventas por región (color = margen)</div>
            <RegionBars data={regions} />
          </div>

          <div className="lg:col-span-3 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
            <div className="text-sm font-medium text-slate-700 mb-2">Descuento vs Margen (tamaño = cantidad, contorno = devuelto)</div>
            <DiscountVsMargin points={discountProfitPoints} />
          </div>
        </div>
      </div>
    </header>
  );
}
