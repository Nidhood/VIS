"use client";
import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import { useColorCategStatus, useStore } from "@/app/graphs/useData";

export default function ArcDiagram() {
  const { view } = useStore();
  const ref = useRef<SVGSVGElement | null>(null);
  const color = useColorCategStatus();

  const nodes = useMemo(() => {
    const comps = Array.from(new Set(view.map((d) => d.company)));
    const stats = Array.from(new Set(view.map((d) => d.statusMission)));
    return [...comps.map((n) => ({ id: n, type: "company" })), ...stats.map((n) => ({ id: n, type: "status" }))] as { id: string; type: "company" | "status" }[];
  }, [view]);

  const links = useMemo(() => {
    const g = d3.rollups(view, (v) => v.length, (d) => d.company, (d) => d.statusMission);
    const out: { source: string; target: string; v: number }[] = [];
    g.forEach(([comp, arr]) => {
      arr.forEach(([stat, k]) => out.push({ source: comp as string, target: stat as string, v: k as number }));
    });
    return out;
  }, [view]);

  useEffect(() => {
    if (!ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const box = ref.current.getBoundingClientRect();
    const W = box.width || 600;
    const H = box.height || 300;

    if (W === 0 || H === 0) return;

    const comps = nodes.filter((n) => n.type === "company").map((d) => d.id);
    const stats = nodes.filter((n) => n.type === "status").map((d) => d.id);

    const xScale = d3
      .scalePoint<string>()
      .domain([...comps, ...stats])
      .range([40, W - 40])
      .padding(0.5);

    const g = svg.append("g");

    g.selectAll("path.link")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d) => color(d.target))
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", (d) => Math.max(1, Math.sqrt(d.v)))
      .attr("d", (d) => {
        const x1 = xScale(d.source)!;
        const x2 = xScale(d.target)!;
        const y = H * 0.78;
        const r = Math.abs(x2 - x1) / 2;
        return `M${x1},${y} A${r},${r} 0 0,1 ${x2},${y}`;
      });

    g
      .selectAll("text.node")
      .data(nodes)
      .join("text")
      .attr("x", (d) => xScale(d.id)!)
      .attr("y", (d) => (d.type === "company" ? H * 0.84 : H * 0.92))
      .attr("text-anchor", "middle")
      .attr("fill", "#d1d5db")
      .attr("font-size", 11)
      .text((d) => d.id);
  }, [nodes, links, color]);

  return <div className="card"><svg ref={ref} preserveAspectRatio="xMidYMid meet" /></div>;
}
