"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";

type Row = { continent: string; year: number; production: number; consumption: number };

export default function LineChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  const { continentEnergy, selectedContinents, toggleContinent, focused, setFocused, clearFocus, loading } = useStore();

  const [w, setW] = useState(600);
  const [h, setH] = useState(380);

  useEffect(() => {
    const t = document.createElement("div");
    Object.assign(t.style, {
      position: "fixed",
      pointerEvents: "none",
      background: "rgba(26,26,46,0.92)",
      border: "1px solid rgba(167,199,231,.35)",
      padding: "8px 10px",
      borderRadius: "8px",
      fontSize: "12px",
      color: "rgba(238,242,255,0.95)",
      zIndex: "1000",
      opacity: "0"
    });
    document.body.appendChild(t);
    tipRef.current = t;
    return () => {
      document.body.removeChild(t);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const p = svgRef.current?.parentElement;
      if (!p) return;
      setW(p.clientWidth - 4);
      setH(p.clientHeight - 4);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const rows: Row[] = useMemo(() => {
    const arr: Row[] = (continentEnergy || [])
      .filter((d: any) => d.year >= 2000 && d.year <= 2024)
      .map((d: any) => ({
        continent: d.continent,
        year: +d.year,
        production: +d.production || +d.renew || 0,
        consumption: +d.consumption || 0
      }))
      .filter((d) => d.production > 0 || d.consumption > 0)
      .sort((a, b) => a.year - b.year);
    return arr;
  }, [continentEnergy]);

  const groups = useMemo(() => {
    const g = d3.group(rows, (d) => d.continent);
    return Array.from(g, ([continent, values]) => ({
      continent,
      values: values.sort((a, b) => a.year - b.year)
    }));
  }, [rows]);

  const colors = ["#90CAF9", "#FFB3BA", "#BAE1A4", "#FFF59D", "#CE93D8", "#A5D6A7", "#FFE082", "#81D4FA"];

  useEffect(() => {
    if (!svgRef.current || loading || groups.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = w;
    const height = h;

    const longestLabel = groups
      .map((g) => g.continent.length)
      .reduce((a, b) => Math.max(a, b), 6);
    const rightPad = Math.min(240, Math.max(110, longestLabel * 9 + 60));

    const margin = { top: 30, right: rightPad, bottom: 40, left: 90 };

    const maxY = d3.max(rows, (d) => Math.max(d.production, d.consumption)) || 1;

    const x = d3.scaleLinear().domain([2000, 2024]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, maxY]).nice().range([height - margin.bottom, margin.top]);

    const lineProd = d3.line<Row>().x((d) => x(d.year)).y((d) => y(d.production)).curve(d3.curveMonotoneX);
    const lineCons = d3.line<Row>().x((d) => x(d.year)).y((d) => y(d.consumption)).curve(d3.curveMonotoneX);

    const xticks = [2000, 2005, 2010, 2015, 2020, 2024];

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickValues(xticks).tickFormat(d3.format("d")))
      .attr("color", "#cbd5e1");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickFormat((v) => d3.format(".2s")(v as number).replace("G", "B")))
      .attr("color", "#cbd5e1");

    svg
      .append("text")
      .attr("x", 14)
      .attr("y", margin.top - 10)
      .attr("fill", "#e2e8f0")
      .style("fontSize", "13px")
      .style("fontWeight", "700")
      .text("Producción y Consumo por continente (TWh)");

    const dim = (c: string) => {
      if (focused.type && focused.type !== "continent") return 0.2;
      if (selectedContinents.length === 0) return 0.9;
      return selectedContinents.includes(c) ? 1 : 0.15;
    };

    groups.forEach((g, i) => {
      const col = colors[i % colors.length];

      svg
        .append("path")
        .datum(g.values)
        .attr("fill", "none")
        .attr("stroke", col)
        .attr("stroke-width", selectedContinents.includes(g.continent) ? 3 : 2.4)
        .attr("opacity", dim(g.continent))
        .attr("d", lineProd)
        .style("cursor", "pointer")
        .on("mousemove", (e: any) => {
          setFocused({ type: "continent", value: g.continent });
          const xm = x.invert(d3.pointer(e)[0]);
          const nearest = g.values.reduce((a, b) => (Math.abs(b.year - xm) < Math.abs(a.year - xm) ? b : a));
          if (tipRef.current) {
            tipRef.current.style.left = e.clientX + 12 + "px";
            tipRef.current.style.top = e.clientY + 12 + "px";
            tipRef.current.style.opacity = "1";
            tipRef.current.innerHTML = `<b>${g.continent}</b><br/>${nearest.year}<br/>Producción: ${d3
              .format(".2s")(nearest.production)
              .replace("G", "B")}<br/>Consumo: ${d3.format(".2s")(nearest.consumption).replace("G", "B")}`;
          }
        })
        .on("mouseleave", () => {
          clearFocus();
          if (tipRef.current) tipRef.current.style.opacity = "0";
        })
        .on("click", (e: any) => toggleContinent(g.continent, e.altKey));

      svg
        .append("path")
        .datum(g.values)
        .attr("fill", "none")
        .attr("stroke", col)
        .attr("stroke-width", 2)
        .attr("opacity", dim(g.continent))
        .attr("stroke-dasharray", "5,5")
        .attr("d", lineCons)
        .style("pointer-events", "none");

      g.values.forEach((d, j) => {
        if ((d.year - 2000) % 5 !== 0 && j !== g.values.length - 1) return;
        svg
          .append("circle")
          .attr("cx", x(d.year))
          .attr("cy", y(d.production))
          .attr("r", j === g.values.length - 1 ? 6 : 5)
          .attr("fill", col)
          .attr("opacity", dim(g.continent))
          .attr("stroke", "rgba(238,242,255,0.5)")
          .attr("stroke-width", 2);
      });

      const last = g.values[g.values.length - 1];
      if (last) {
        const lx = x(last.year);
        const ly = y(last.production);

        const label = svg
          .append("text")
          .attr("x", lx + 12)
          .attr("y", ly - 8)
          .attr("text-anchor", "start")
          .attr("fill", col)
          .style("font", "bold 13px ui-sans-serif, system-ui")
          .text(g.continent)
          .attr("opacity", dim(g.continent));

        const value = svg
          .append("text")
          .attr("x", lx + 12)
          .attr("y", ly + 8)
          .attr("text-anchor", "start")
          .attr("fill", "rgba(238,242,255,0.92)")
          .style("font", "11px ui-sans-serif, system-ui")
          .text(d3.format(".2s")(last.production).replace("G", "B"))
          .attr("opacity", dim(g.continent));

        const box = svg.append("rect").attr("fill", "rgba(26,26,46,0.92)").attr("rx", 3).attr("opacity", dim(g.continent));

        const fit = () => {
          const b1 = (label.node() as SVGTextElement).getBBox();
          const b2 = (value.node() as SVGTextElement).getBBox();
          const x0 = Math.min(b1.x, b2.x) - 6;
          const y0 = Math.min(b1.y, b2.y) - 4;
          const x1 = Math.max(b1.x + b1.width, b2.x + b2.width) + 6;
          const y1 = Math.max(b1.y + b1.height, b2.y + b2.height) + 4;
          box.attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0).lower();
        };
        fit();
      }
    });

    svg.on("mouseleave pointercancel touchend", () => {
      clearFocus();
      if (tipRef.current) tipRef.current.style.opacity = "0";
    });
  }, [groups, rows, selectedContinents, focused, loading, w, h, toggleContinent, setFocused, clearFocus]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
