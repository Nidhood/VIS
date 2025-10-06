"use client";
import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import { useColorSequentialCost, useStore } from "@/app/graphs/useData"

export default function Streamgraph() {
  const { view, highlight, setHighlight } = useStore();
  const ref = useRef<SVGSVGElement | null>(null);
  const col = useColorSequentialCost();

  const series = useMemo(() => {
    const filtered = view.filter((d) => d.date && d.cost !== null);
    if (filtered.length === 0) return null;

    const byYM = d3.flatRollup(
      filtered,
      (v) => d3.mean(v, (d) => d.cost as number) as number,
      (d) => d.company,
      (d) => `${d.year}-${String((d.month as number) + 1).padStart(2, "0")}`
    );

    const companies = Array.from(new Set(byYM.map((d) => d[0] as string)));
    const months = Array.from(new Set(byYM.map((d) => d[1] as string))).sort();

    if (months.length === 0) return null;

    const map = d3.rollup(byYM, (v) => v[0][2] as number, (d) => d[0] as string, (d) => d[1] as string);
    const data = months.map((m) => {
      const obj: any = { key: m };
      companies.forEach((c) => (obj[c] = map.get(c)?.get(m) ?? 0));
      return obj;
    });

    const keys = companies.slice(0, 8);
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(data as any);
    return { stack, keys, months, max: d3.max(stack.flat(2)) || 0 };
  }, [view]);

  useEffect(() => {
    if (!series || !ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const box = ref.current.getBoundingClientRect();
    const W = box.width || 600;
    const H = box.height || 300;

    if (W === 0 || H === 0) return;

    const g = svg.append("g");

    // Agregar un rect invisible para capturar mouse leave
    g.append("rect")
      .attr("width", W)
      .attr("height", H)
      .attr("fill", "transparent")
      .style("pointer-events", "all")
      .on("mouseleave", () => {
        setHighlight(null);
      });

    const x = d3.scalePoint(series.months, [40, W - 40]);
    const y = d3.scaleLinear().domain([-(series.max || 1), series.max || 1]).range([H - 30, 20]);

    const area = d3
      .area<any>()
      .x((d) => x(d.data.key) as number)
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.6));

    g
      .selectAll("path.layer")
      .data(series.stack)
      .join("path")
      .attr("fill", (_, i) => col((i / Math.max(1, series.stack.length - 1)) * 120))
      .attr("opacity", (d) => {
        if (!highlight) return 0.9;
        const company = d.key;
        return highlight.company === company ? 1 : 0.2;
      })
      .attr("d", area as any)
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        setHighlight({ company: d.key });
      });

    g
      .selectAll("text.xt")
      .data(series.months.filter((_, i) => i % Math.ceil(series.months.length / 8) === 0))
      .join("text")
      .attr("x", (d) => x(d) as number)
      .attr("y", H - 8)
      .attr("fill", "#cbd5e1")
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .text((d) => d);
  }, [series, col, highlight, setHighlight]);

  return (
    <div className="card">
      <svg ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet" />
    </div>
  );
}
