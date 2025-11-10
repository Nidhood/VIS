"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";
import Tooltip from "../utils/Tooltip";

export default function HeatMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { selectedYear, selectedContinent, continentData, loading } = useStore();
  const [tooltip, setTooltip] = useState<any>(null);

  const data = useMemo(() => {
    if (selectedContinent === 'All') return continentData;
    return continentData.filter(d => d.continent === selectedContinent);
  }, [continentData, selectedContinent]);

  useEffect(() => {
    if (!svgRef.current || loading || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const margin = { top: 60, right: 130, bottom: 60, left: 100 };

    const continents = [...new Set(data.map(d => d.continent))];
    const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);

    const x = d3.scaleBand()
      .domain(years.map(String))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleBand()
      .domain(continents)
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data, d => d.cleanShare) || 0.7])
      .interpolator(d3.interpolateRgb("#ef4444", "#10b981"));

    // Celdas con animación
    const cells = svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(String(d.year))!)
      .attr("y", d => y(d.continent)!)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", "#1a1a2e")
      .attr("stroke", "#334155")
      .attr("stroke-width", 2)
      .attr("rx", 6)
      .style("cursor", "pointer");

    cells.transition()
      .delay((d, i) => i * 20)
      .duration(600)
      .attr("fill", d => colorScale(d.cleanShare));

    cells
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#10b981")
          .attr("stroke-width", 4)
          .attr("rx", 8);

        setTooltip({
          data: {
            title: `${d.continent} (${d.year})`,
            items: [
              { label: 'Participación Limpia', value: d3.format('.1%')(d.cleanShare) },
              { label: 'Fósil', value: d3.format('.1%')(1 - d.cleanShare) },
              { label: 'Nivel', value: d.cleanShare > 0.5 ? '🟢 Alto' : d.cleanShare > 0.3 ? '🟡 Medio' : '🔴 Bajo' }
            ]
          },
          position: { x: event.clientX, y: event.clientY }
        });
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#334155")
          .attr("stroke-width", 2)
          .attr("rx", 6);
        setTooltip(null);
      });

    // Valores en celdas
    svg.selectAll("text.value")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", d => x(String(d.year))! + x.bandwidth() / 2)
      .attr("y", d => y(d.continent)! + y.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#fff")
      .style("font-size", "12px")
      .style("font-weight", "700")
      .style("pointer-events", "none")
      .attr("opacity", 0)
      .text(d => d3.format(".0%")(d.cleanShare))
      .transition()
      .delay((d, i) => i * 20 + 300)
      .duration(400)
      .attr("opacity", 1);

    // Highlight año seleccionado
    if (years.includes(selectedYear)) {
      svg.append("rect")
        .attr("x", x(String(selectedYear))! - 3)
        .attr("y", margin.top - 3)
        .attr("width", x.bandwidth() + 6)
        .attr("height", height - margin.top - margin.bottom + 6)
        .attr("fill", "none")
        .attr("stroke", "#fbbf24")
        .attr("stroke-width", 3)
        .attr("rx", 8)
        .attr("opacity", 0.8)
        .style("pointer-events", "none");
    }

    // Ejes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .style("font-size", "12px")
      .style("font-weight", "600");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .style("font-size", "12px")
      .style("font-weight", "600");

    // Título
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("fill", "#10b981")
      .style("font-size", "18px")
      .style("font-weight", "700")
      .text("Evolución Temporal por Región");

    // Leyenda
    const legendWidth = 24;
    const legendHeight = 160;
    const legendX = width - margin.right + 25;
    const legendY = margin.top;

    const maxValue = d3.max(data, d => d.cleanShare) || 0.7;
    const legendScale = d3.scaleLinear()
      .domain([maxValue, 0])
      .range([0, legendHeight]);

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#10b981");
    gradient.append("stop").attr("offset", "50%").attr("stop-color", "#fbbf24");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444");

    svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("rx", 6)
      .style("fill", "url(#legend-gradient)")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2);

    svg.append("g")
      .attr("transform", `translate(${legendX + legendWidth},${legendY})`)
      .call(d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(".0%")))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .style("font-size", "11px")
      .style("font-weight", "600");

  }, [data, selectedYear, loading]);

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