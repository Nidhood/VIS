"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";
import Tooltip from "../utils/Tooltip";

export default function LineChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { selectedYear, selectedContinent, continentData, loading } = useStore();
  const [tooltip, setTooltip] = useState<any>(null);

  const data = useMemo(() => {
    const grouped = d3.group(continentData, d => d.continent);
    const lineData = Array.from(grouped, ([continent, values]) => ({
      continent,
      values: values.sort((a, b) => a.year - b.year)
    }));

    return selectedContinent === 'All'
      ? lineData
      : lineData.filter(d => d.continent === selectedContinent);
  }, [continentData, selectedContinent]);

  useEffect(() => {
    if (!svgRef.current || loading || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const margin = { top: 50, right: 140, bottom: 60, left: 70 };
    const colors = ["#a7c7e7", "#ffb3ba", "#bae1a4", "#ffffba", "#d4a5d6"];

    const allYears = data.flatMap(d => d.values.map(v => v.year));
    const yearExtent = d3.extent(allYears) as [number, number];

    const x = d3.scaleLinear().domain(yearExtent).range([margin.left, width - margin.right]);
    const allValues = data.flatMap(d => d.values.map(v => v.cleanShare));
    const y = d3.scaleLinear().domain([0, (d3.max(allValues) || 0.6) * 1.1]).range([height - margin.bottom, margin.top]);

    const line = d3.line<any>()
      .x(d => x(d.year))
      .y(d => y(d.cleanShare))
      .curve(d3.curveCatmullRom);

    // Grid
    svg.append("g").selectAll("line").data(y.ticks(6)).enter().append("line")
      .attr("x1", margin.left).attr("x2", width - margin.right)
      .attr("y1", d => y(d)).attr("y2", d => y(d))
      .attr("stroke", "rgba(203, 213, 225, 0.1)").attr("stroke-width", 1);

    data.forEach((continent, i) => {
      const path = svg.append("path")
        .datum(continent.values)
        .attr("fill", "none")
        .attr("stroke", colors[i % colors.length])
        .attr("stroke-width", 3)
        .attr("class", `line-${i}`)
        .style("cursor", "pointer");

      const totalLength = path.node()!.getTotalLength();
      path.attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition().duration(1500).ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0).attr("d", line);

      svg.selectAll(`.point-${i}`).data(continent.values).enter().append("circle")
        .attr("class", `point-${i}`)
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.cleanShare))
        .attr("r", 0).attr("fill", colors[i % colors.length])
        .attr("stroke", "#fff").attr("stroke-width", 2)
        .style("cursor", "pointer")
        .transition().delay((d, idx) => idx * 100).duration(300)
        .attr("r", d => d.year === selectedYear ? 7 : 5)
        .selection()
        .on("mouseover", function(event, d) {
          d3.select(this).transition().duration(200).attr("r", 9);
          setTooltip({
            data: {
              title: `${continent.continent} (${d.year})`,
              items: [
                { label: 'Energía Limpia', value: d3.format('.1%')(d.cleanShare) },
                { label: 'Fósil', value: d3.format('.1%')(1 - d.cleanShare) }
              ]
            },
            position: { x: event.clientX, y: event.clientY }
          });
        })
        .on("mouseout", function(event, d) {
          d3.select(this).transition().duration(200).attr("r", d.year === selectedYear ? 7 : 5);
          setTooltip(null);
        });
    });

    // Ejes
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d"))).attr("color", "#cbd5e1");
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".0%"))).attr("color", "#cbd5e1");

    // Título
    svg.append("text").attr("x", width / 2).attr("y", 25)
      .attr("text-anchor", "middle").attr("fill", "#10b981")
      .style("font-size", "18px").style("font-weight", "700")
      .text("Energía Limpia por Continente");

    // Leyenda
    const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);
    data.forEach((continent, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 28})`).style("cursor", "pointer")
        .on("mouseover", () => {
          d3.selectAll("path").attr("opacity", 0.2);
          d3.selectAll(`.line-${i}`).attr("opacity", 1).attr("stroke-width", 5);
        })
        .on("mouseout", () => {
          d3.selectAll("path").attr("opacity", 1);
          d3.selectAll(`.line-${i}`).attr("stroke-width", 3);
        });
      g.append("line").attr("x1", 0).attr("x2", 25).attr("y1", 10).attr("y2", 10)
        .attr("stroke", colors[i % colors.length]).attr("stroke-width", 3);
      g.append("text").attr("x", 32).attr("y", 14).attr("fill", "#e2e8f0")
        .style("font-size", "12px").style("font-weight", "600").text(continent.continent);
    });

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