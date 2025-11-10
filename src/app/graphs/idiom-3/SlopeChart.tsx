"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";
import Tooltip from "../utils/Tooltip";

export default function SlopeChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { selectedYear, cryptoData, loading } = useStore();
  const [tooltip, setTooltip] = useState<any>(null);

  const data = useMemo(() => {
    const grouped = d3.group(cryptoData, d => d.symbol);
    const cryptoGrowths: any[] = [];
    const colors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#ef4444", "#06b6d4", "#14b8a6"];
    let colorIndex = 0;

    for (const [symbol, values] of grouped) {
      const sorted = values.sort((a, b) => a.year - b.year);
      if (sorted.length < 2) continue;

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const energyGrowth = first.cleanShare > 0
        ? ((last.cleanShare - first.cleanShare) / first.cleanShare) * 100 : 0;
      const mcapGrowth = last.mcap > 0 && first.mcap > 0
        ? ((last.mcap - first.mcap) / first.mcap) * 100 : 0;

      if (mcapGrowth > 0 && energyGrowth !== 0) {
        cryptoGrowths.push({
          symbol, name: symbol,
          energyGrowth: Math.abs(energyGrowth),
          mcapGrowth: Math.min(mcapGrowth, 10000),
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      }
    }

    const topCryptos = cryptoGrowths.sort((a, b) => b.mcapGrowth - a.mcapGrowth).slice(0, 8);
    const maxEnergy = d3.max(topCryptos, d => d.energyGrowth) || 100;
    const maxMcap = d3.max(topCryptos, d => d.mcapGrowth) || 100;

    return topCryptos.map(d => ({
      ...d,
      energyGrowth: (d.energyGrowth / maxEnergy) * 100,
      mcapGrowth: (d.mcapGrowth / maxMcap) * 100
    }));
  }, [cryptoData]);

  useEffect(() => {
    if (!svgRef.current || loading || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const margin = { top: 60, right: 100, bottom: 60, left: 100 };

    const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

    // Grid
    d3.range(0, 101, 20).forEach((val, i) => {
      svg.append("line")
        .attr("x1", margin.left).attr("x2", width - margin.right)
        .attr("y1", y(val)).attr("y2", y(val))
        .attr("stroke", "rgba(203, 213, 225, 0.15)").attr("stroke-width", 1)
        .attr("opacity", 0).transition().delay(i * 50).duration(500).attr("opacity", 1);
      svg.append("line")
        .attr("x1", x(val)).attr("x2", x(val))
        .attr("y1", margin.top).attr("y2", height - margin.bottom)
        .attr("stroke", "rgba(203, 213, 225, 0.15)").attr("stroke-width", 1)
        .attr("opacity", 0).transition().delay(i * 50).duration(500).attr("opacity", 1);
    });

    // Puntos
    data.forEach((d, i) => {
      const g = svg.append("g").attr("class", `crypto-${i}`).style("cursor", "pointer");
      const circle = g.append("circle")
        .attr("cx", x(d.energyGrowth)).attr("cy", y(d.mcapGrowth))
        .attr("r", 0).attr("fill", d.color).attr("opacity", 0.85)
        .attr("stroke", "#fff").attr("stroke-width", 3);
      circle.transition().delay(i * 100).duration(600).attr("r", 14);

      g.append("text").attr("x", x(d.energyGrowth)).attr("y", y(d.mcapGrowth) - 25)
        .attr("text-anchor", "middle").attr("fill", d.color)
        .style("font-size", "14px").style("font-weight", "700")
        .attr("opacity", 0).text(d.symbol)
        .transition().delay(i * 100 + 300).duration(400).attr("opacity", 1);

      g.on("mouseover", function(event) {
        d3.select(this).select("circle").transition().duration(200).attr("r", 20).attr("opacity", 1);
        setTooltip({
          data: {
            title: `${d.symbol}`,
            items: [
              { label: 'Market Cap (norm)', value: `${d.mcapGrowth.toFixed(1)}%` },
              { label: 'Energy (norm)', value: `${d.energyGrowth.toFixed(1)}%` },
              { label: 'Ratio', value: (d.mcapGrowth / d.energyGrowth).toFixed(2) + 'x' }
            ]
          },
          position: { x: event.clientX, y: event.clientY }
        });
      })
      .on("mouseout", function() {
        d3.select(this).select("circle").transition().duration(200).attr("r", 14).attr("opacity", 0.85);
        setTooltip(null);
      });
    });

    // Ejes
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%")).attr("color", "#cbd5e1");
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%")).attr("color", "#cbd5e1");

    // Título
    svg.append("text").attr("x", width / 2).attr("y", 25)
      .attr("text-anchor", "middle").attr("fill", "#10b981")
      .style("font-size", "18px").style("font-weight", "700").text("Cripto vs Energía");

    // Labels
    svg.append("text").attr("x", width / 2).attr("y", height - 15)
      .attr("text-anchor", "middle").attr("fill", "#cbd5e1")
      .style("font-size", "13px").text("Crecimiento Energía (normalizado)");
    svg.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", 25)
      .attr("text-anchor", "middle").attr("fill", "#cbd5e1")
      .style("font-size", "13px").text("Crecimiento Market Cap (normalizado)");

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