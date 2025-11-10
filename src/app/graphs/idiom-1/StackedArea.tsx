"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";
import Tooltip from "../utils/Tooltip";

export default function StackedAreaChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { selectedYear, globalEnergyData, loading } = useStore();
  const [tooltip, setTooltip] = useState<any>(null);

  useEffect(() => {
    if (!svgRef.current || loading || globalEnergyData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const margin = { top: 50, right: 140, bottom: 60, left: 70 };

    const data = globalEnergyData.map(d => ({
      year: d.year,
      renovable: d.sumRenew,
      fossil: d.sumFossil
    }));

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year) as [number, number])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.renovable + d.fossil) as number])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const stack = d3.stack<any>().keys(["renovable", "fossil"]);
    const series = stack(data);
    const colors: Record<string, string> = { renovable: "#10b981", fossil: "#ef4444" };

    const area = d3.area<any>()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveCatmullRom);

    series.forEach((s) => {
      const path = svg.append("path")
        .datum(s)
        .attr("fill", colors[s.key])
        .attr("opacity", 0)
        .attr("d", area);

      path.transition().duration(1000).attr("opacity", 0.85);

      svg.append("path")
        .datum(s)
        .attr("fill", "transparent")
        .attr("d", area)
        .style("cursor", "pointer")
        .on("mousemove", (event) => {
          const [mx] = d3.pointer(event);
          const year = Math.round(x.invert(mx));
          const dataPoint = data.find(d => d.year === year);

          if (dataPoint) {
            setTooltip({
              data: {
                title: `${s.key === 'renovable' ? 'Renovable' : 'Fósil'} (${year})`,
                items: [
                  { label: 'Generación', value: `${d3.format(',')(dataPoint[s.key as keyof typeof dataPoint] as number)} TWh` },
                  { label: 'Total Global', value: `${d3.format(',')(dataPoint.renovable + dataPoint.fossil)} TWh` },
                  { label: 'Porcentaje', value: d3.format('.1%')((dataPoint[s.key as keyof typeof dataPoint] as number) / (dataPoint.renovable + dataPoint.fossil)) }
                ]
              },
              position: { x: event.clientX, y: event.clientY }
            });
          }
        })
        .on("mouseout", () => setTooltip(null));
    });

    // Línea de año seleccionado
    if (data.some(d => d.year === selectedYear)) {
      svg.append("line")
        .attr("x1", x(selectedYear)).attr("x2", x(selectedYear))
        .attr("y1", margin.top).attr("y2", height - margin.bottom)
        .attr("stroke", "#fbbf24").attr("stroke-width", 3).attr("opacity", 0.9);
    }

    // Ejes
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d"))).attr("color", "#cbd5e1");
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickFormat(d => d3.format(".2s")(d) + " TWh")).attr("color", "#cbd5e1");

    // Título
    svg.append("text").attr("x", width / 2).attr("y", 25)
      .attr("text-anchor", "middle").attr("fill", "#10b981")
      .style("font-size", "18px").style("font-weight", "700").text("Mix Energético Global");

    // Leyenda
    const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);
    (["renovable", "fossil"] as const).forEach((key, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 35})`);
      g.append("rect").attr("width", 22).attr("height", 22).attr("rx", 4)
        .attr("fill", colors[key]).attr("opacity", 0.85);
      g.append("text").attr("x", 30).attr("y", 16).attr("fill", "#e2e8f0")
        .style("font-size", "13px").style("font-weight", "600")
        .text(key === 'renovable' ? 'Renovable' : 'Fósil');
      g.append("text").attr("x", 30).attr("y", 31).attr("fill", "#94a3b8")
        .style("font-size", "11px").text(`${d3.format(',')(d3.sum(data, d => d[key]))} TWh`);
    });

  }, [globalEnergyData, selectedYear, loading]);

  if (loading) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{ color: '#10b981', fontSize: '16px' }}>Cargando datos...</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" />
      </div>
      {tooltip && <Tooltip {...tooltip} />}
    </>
  );
}