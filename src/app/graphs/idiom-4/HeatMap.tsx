"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";

export default function HeatMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const {
    selectedYears,
    selectedContinents,
    toggleYear,
    toggleContinent,
    focused,
    setFocused,
    clearFocus,
    continentData,
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
    return () => {
      document.body.removeChild(t);
    };
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

  const dataRaw = useMemo(() => {
    if (selectedContinents.length === 0) return continentData;
    return continentData.filter(d => selectedContinents.includes(d.continent));
  }, [continentData, selectedContinents]);

  const data = useMemo(() => {
    if (dataRaw.length === 0) return [];
    const years = [...new Set(dataRaw.map(d => d.year))]
      .filter(y => y >= 2000 && y <= 2024)
      .sort((a, b) => a - b);

    const maxCols = Math.max(10, Math.floor(w / 56));
    const binSize = Math.max(1, Math.ceil(years.length / maxCols));

    const groups: Record<
      string,
      { sum: number; n: number; continent: string; y0: number; y1: number }[]
    > = {};
    const byCont = d3.group(dataRaw, d => d.continent);
    byCont.forEach((rows, cont) => {
      const arr: {
        sum: number;
        n: number;
        continent: string;
        y0: number;
        y1: number;
      }[] = [];
      for (let i = 0; i < years.length; i += binSize) {
        const y0 = years[i];
        const y1 = years[Math.min(i + binSize - 1, years.length - 1)];
        const slice = rows.filter(r => r.year >= y0 && r.year <= y1);
        const sum = d3.sum(slice, r => r.cleanShare);
        const n = slice.length || 1;
        arr.push({ sum, n, continent: cont, y0, y1 });
      }
      groups[cont] = arr;
    });

    const flat = Object.values(groups)
      .flat()
      .map(d => ({
        continent: d.continent,
        y0: d.y0,
        y1: d.y1,
        label: d.y0 === d.y1 ? String(d.y0) : d.y0 + "-" + d.y1,
        cleanShare: d.sum / d.n
      }));
    return flat;
  }, [dataRaw, w]);

  useEffect(() => {
    if (!svgRef.current || loading || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = w;
    const height = h;
    const margin = { top: 24, right: 76, bottom: 40, left: 90 };

    const continents = [...new Set(data.map(d => d.continent))];
    const labels = [...new Set(data.map(d => d.label))];

    const x = d3
      .scaleBand<string>()
      .domain(labels)
      .range([margin.left, width - margin.right])
      .padding(0.22);

    const y = d3
      .scaleBand<string>()
      .domain(continents)
      .range([margin.top, height - margin.bottom])
      .padding(0.22);

    const colorScale = d3
      .scaleSequential()
      .domain([0, d3.max(data, d => d.cleanShare) || 0.7])
      .interpolator(d3.interpolateRgb("#ef4444", "#10b981"));

    const gCells = svg
      .selectAll<SVGGElement, typeof data[0]>("g.cell")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", d => `translate(${x(d.label) as number},${y(d.continent) as number})`);

    gCells
      .append("rect")
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => colorScale(d.cleanShare))
      .attr("rx", 8)
      .attr("opacity", d => {
        if (!focused.type) {
          const cOk =
            selectedContinents.length === 0 ||
            selectedContinents.includes(d.continent);
          const yOk =
            selectedYears.length === 0 ||
            selectedYears.some(ySel => ySel >= d.y0 && ySel <= d.y1);
          return cOk && yOk ? 1 : 0.25;
        }
        if (focused.type === "continent")
          return focused.value === d.continent ? 1 : 0.12;
        if (focused.type === "year")
          return selectedYears.some(ySel => ySel >= d.y0 && ySel <= d.y1)
            ? 1
            : 0.12;
        return 1;
      })
      .style("cursor", "pointer")
      .on("mousemove", (e, d) => {
        setFocused({ type: "continent", value: d.continent });
        if (tipRef.current) {
          tipRef.current.style.left = e.clientX + 12 + "px";
          tipRef.current.style.top = e.clientY + 12 + "px";
          tipRef.current.style.opacity = "1";
          tipRef.current.innerHTML =
            d.continent +
            "<br/>" +
            d.label +
            "<br/>" +
            d3.format(".0%")(d.cleanShare);
        }
        d3.select<SVGGElement, any>(e.currentTarget.parentNode as any)
          .transition()
          .duration(120)
          .attr("transform", `translate(${x(d.label)},${y(d.continent)}) scale(1.03)`);
      })
      .on("mouseleave", (e: any) => {
        clearFocus();
        if (tipRef.current) tipRef.current.style.opacity = "0";
        const d = e.currentTarget.__data__;
        d3.select<SVGGElement, any>(e.currentTarget.parentNode as any)
          .transition()
          .duration(120)
          .attr("transform", `translate(${x(d.label)},${y(d.continent)}) scale(1)`);
      })
      .on("click", (e: any, d) => {
        const mid = Math.round((d.y0 + d.y1) / 2);
        toggleYear(mid, e.altKey);
        toggleContinent(d.continent, e.altKey);
      });

    gCells.each(function (d) {
      const g = d3.select(this);
      const bw = x.bandwidth();
      const bh = y.bandwidth();

      const fs = Math.max(11, Math.min(18, Math.floor(Math.min(bw, bh) * 0.34)));
      g.append("text")
        .attr("x", bw / 2)
        .attr("y", bh / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#0b1022")
        .style("fontWeight", "800")
        .style("fontSize", fs + "px")
        .text(d3.format(".0%")(d.cleanShare));

      const isSelectedBin =
        selectedYears.length > 0 &&
        selectedYears.some(ySel => ySel >= d.y0 && ySel <= d.y1);

      if (isSelectedBin) {
        const r = Math.max(6, Math.min(bw, bh) * 0.38);
        const arc = d3
          .arc()
          .innerRadius(0)
          .outerRadius(r)
          .startAngle(-Math.PI / 2)
          .endAngle(-Math.PI / 2 + 2 * Math.PI * d.cleanShare);

        const clipId = `hmclip-${d.continent}-${d.label}`.replace(/\s+/g, "");
        svg
          .append("clipPath")
          .attr("id", clipId)
          .append("rect")
          .attr("x", x(d.label)!)
          .attr("y", y(d.continent)!)
          .attr("width", bw)
          .attr("height", bh)
          .attr("rx", 8);

        g.append("path")
          .attr("d", arc as any)
          .attr("fill", "#0b1022")
          .attr("opacity", 0.35)
          .attr("transform", `translate(${bw / 2},${bh / 2})`)
          .attr("clip-path", `url(#${clipId})`);
      }
    });

    const xYears = d3
      .scaleLinear()
      .domain([2000, 2024])
      .range([margin.left, width - margin.right]);

    const ticks = [2000, 2005, 2010, 2015, 2020, 2024];

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xYears).tickValues(ticks).tickFormat(d3.format("d")))
      .attr("color", "#cbd5e1");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#9fb3d1")
      .style("fontSize", "12px")
      .text("2000     2005     2010     2015     2020     2024");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .style("fontSize", "12px")
      .style("fontWeight", "600");

    svg
      .append("text")
      .attr("x", 14)
      .attr("y", margin.top - 8)
      .attr("fill", "#9fb3d1")
      .style("fontSize", "12px")
      .text("Regiones vs Proporción Limpia");

    const legendH = 120;
    const legendX = width - margin.right + 14;
    const legendY = margin.top;

    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient-hm")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#10b981");
    gradient.append("stop").attr("offset", "50%").attr("stop-color", "#fbbf24");
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444");

    svg
      .append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", 16)
      .attr("height", legendH)
      .attr("rx", 6)
      .style("fill", "url(#legend-gradient-hm)")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2);

    const maxValue = d3.max(data, d => d.cleanShare) || 0.7;
    const legendScale = d3.scaleLinear().domain([maxValue, 0]).range([0, legendH]);

    svg
      .append("g")
      .attr("transform", `translate(${legendX + 16},${legendY})`)
      .call(d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(".0%")))
      .attr("color", "#cbd5e1")
      .selectAll("text")
      .style("fontSize", "10px")
      .style("fontWeight", "600");

    svg.on("mouseleave pointercancel touchend", () => {
      clearFocus();
      if (tipRef.current) tipRef.current.style.opacity = "0";
    });
  }, [
    data,
    selectedYears,
    selectedContinents,
    focused,
    loading,
    w,
    h,
    toggleYear,
    toggleContinent,
    setFocused,
    clearFocus
  ]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
