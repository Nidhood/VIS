"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";

export default function SlopeChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const {
    focused,
    setFocused,
    clearFocus,
    cryptoData,
    globalEnergyData,
    continentEnergy,
    selectedYears,
    selectedContinents,
    loading
  } = useStore();
  const [w, setW] = useState(600);
  const [h, setH] = useState(380);

  useEffect(() => {
    const t = document.createElement("div");
    t.style.position = "fixed";
    t.style.pointerEvents = "none";
    t.style.background = "rgba(11,16,34,.95)";
    t.style.border = "1px solid rgba(167,199,231,.3)";
    t.style.padding = "8px 10px";
    t.style.borderRadius = "8px";
    t.style.fontSize = "12px";
    t.style.color = "#e2e8f0";
    t.style.zIndex = "1000";
    t.style.opacity = "0";
    document.body.appendChild(t);
    tipRef.current = t;
    return () => { document.body.removeChild(t); };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const parent = svgRef.current?.parentElement;
      if (!parent) return;
      setW(parent.clientWidth - 4);
      setH(parent.clientHeight - 4);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const energySource = useMemo(() => {
    if (selectedContinents.length === 0) {
      return globalEnergyData.map(d => ({ year: d.year, total: d.total }));
    }

    const filtered = continentEnergy.filter(d => selectedContinents.includes(d.continent));
    const byYear = d3.rollups(
      filtered,
      v => d3.sum(v, d => d.total),
      d => d.year
    );
    return byYear
      .map(([year, total]) => ({ year, total }))
      .sort((a, b) => a.year - b.year);
  }, [globalEnergyData, continentEnergy, selectedContinents]);

  const data = useMemo(() => {
    const energyByYear = new Map(energySource.map(d => [d.year, d.total]));

    let filteredCrypto = cryptoData;
    if (selectedYears.length > 0) {
      filteredCrypto = filteredCrypto.filter(d => selectedYears.includes(d.year));
    }

    const grouped = d3.group(filteredCrypto, d => d.symbol);
    const arr: any[] = [];
    const colors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#ef4444", "#06b6d4", "#14b8a6"];
    let idx = 0;

    for (const [symbol, values] of grouped) {
      const sorted = values.sort((a, b) => a.year - b.year);
      if (sorted.length < 2) continue;

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const firstEnergy = energyByYear.get(first.year) || 0;
      const lastEnergy = energyByYear.get(last.year) || 0;

      if (firstEnergy === 0 || lastEnergy === 0 || first.mcap === 0) continue;

      const energyGrowth = ((lastEnergy - firstEnergy) / firstEnergy) * 100;
      const mcapGrowth = ((last.mcap - first.mcap) / first.mcap) * 100;

      if (mcapGrowth > 0 && energyGrowth > 0) {
        arr.push({
          symbol,
          energyGrowth: Math.abs(energyGrowth),
          mcapGrowth: Math.min(mcapGrowth, 100000),
          startYear: first.year,
          endYear: last.year,
          firstEnergy,
          lastEnergy,
          avgMcap: (first.mcap + last.mcap) / 2,
          color: colors[idx % colors.length]
        });
        idx++;
      }
    }

    const top = arr.sort((a, b) => b.mcapGrowth - a.mcapGrowth).slice(0, 8);

    const maxE = d3.max(top, d => d.energyGrowth) || 100;
    const maxM = d3.max(top, d => d.mcapGrowth) || 100;

    return top.map(d => ({
      ...d,
      energyGrowthNorm: (d.energyGrowth / maxE) * 100,
      mcapGrowthNorm: (d.mcapGrowth / maxM) * 100
    }));
  }, [cryptoData, energySource, selectedYears]);

  useEffect(() => {
    if (!svgRef.current || loading || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = w;
    const height = h;
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };

    const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("class", "grid")
      .selectAll("line.vertical")
      .data(d3.range(0, 101, 10))
      .enter()
      .append("line")
      .attr("class", "vertical")
      .attr("x1", d => x(d))
      .attr("x2", d => x(d))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "rgba(167,199,231,0.1)")
      .attr("stroke-width", 1);

    svg.append("g")
      .attr("class", "grid")
      .selectAll("line.horizontal")
      .data(d3.range(0, 101, 10))
      .enter()
      .append("line")
      .attr("class", "horizontal")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", d => y(d))
      .attr("y2", d => y(d))
      .attr("stroke", "rgba(167,199,231,0.1)")
      .attr("stroke-width", 1);

    const dimOpacity = focused.type && focused.type !== "crypto" ? 0.25 : 0.9;

    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(data, d => d.avgMcap) || 1])
      .range([6, 10]);

    data.forEach((d) => {
      const isFocused = focused.type === "crypto" && focused.value === d.symbol;
      const opacity = focused.type === "crypto" ? (isFocused ? 1 : 0.3) : dimOpacity;
      const r = sizeScale(d.avgMcap);

      const g = svg.append("g").style("cursor", "pointer");
      const c = g.append("circle")
        .attr("cx", x(d.energyGrowthNorm))
        .attr("cy", y(d.mcapGrowthNorm))
        .attr("r", r)
        .attr("fill", d.color)
        .attr("opacity", opacity)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      g.append("text")
        .attr("x", x(d.energyGrowthNorm))
        .attr("y", y(d.mcapGrowthNorm) - r - 6)
        .attr("text-anchor", "middle")
        .attr("fill", d.color)
        .style("fontSize", "11px")
        .style("fontWeight", "700")
        .attr("opacity", opacity)
        .text(d.symbol);

      c.on("mousemove", (e: any) => {
        setFocused({ type: "crypto", value: d.symbol });
        if (tipRef.current) {
          tipRef.current.style.left = e.clientX + 12 + "px";
          tipRef.current.style.top = e.clientY + 12 + "px";
          tipRef.current.style.opacity = "1";
          const energyLabel = selectedContinents.length > 0
            ? `Energía continentes seleccionados`
            : `Energía global`;
          tipRef.current.innerHTML = `<b>${d.symbol}</b><br/>Período: ${d.startYear}-${d.endYear}<br/>${energyLabel}: +${d.energyGrowth.toFixed(1)}%<br/>Market Cap: +${d.mcapGrowth.toFixed(0)}%<br/><small>${d3.format(".2s")(d.firstEnergy)} → ${d3.format(".2s")(d.lastEnergy)} TWh</small>`;
        }
        c.transition().duration(120).attr("r", r + 3);
      }).on("mouseleave", () => {
        clearFocus();
        if (tipRef.current) tipRef.current.style.opacity = "0";
        c.transition().duration(120).attr("r", r);
      });
    });

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%"))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .style("fontSize", "11px");

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#9fb3d1")
      .style("fontSize", "12px")
      .style("fontWeight", "600")

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .style("fontSize", "11px");

    svg.append("text")
      .attr("x", 20)
      .attr("y", margin.top - 16)
      .attr("fill", "#9fb3d1")
      .style("fontSize", "12px")
      .style("fontWeight", "600")
      .text("Crecimiento Market Cap (normalizado)");

    svg.on("mouseleave pointercancel touchend", () => {
      clearFocus();
      if (tipRef.current) tipRef.current.style.opacity = "0";
    });
  }, [data, focused, loading, w, h, selectedContinents, setFocused, clearFocus]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
