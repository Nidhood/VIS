"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";

export default function StackedArea() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const lastFilterKeyRef = useRef<string>("");

  const {
    selectedYears,
    toggleYear,
    selectedContinents,
    focused,
    setFocused,
    clearFocus,
    globalEnergyData,
    continentEnergy,
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

  const allContinents = useMemo(
    () => Array.from(new Set(continentData.map(d => d.continent))).sort(),
    [continentData]
  );

  const aggEnergy = useMemo(() => {
    const useGlobal =
      selectedContinents.length === 0 || selectedContinents.length === allContinents.length;
    if (useGlobal) {
      return globalEnergyData.map(d => ({
        year: d.year,
        renew: d.sumRenew,
        fossil: d.sumFossil
      }));
    }
    const set = new Set(selectedContinents);
    const byYear = d3.rollups(
      continentEnergy.filter(d => set.has(d.continent)),
      v => ({
        renew: d3.sum(v, d => d.renew),
        fossil: d3.sum(v, d => d.fossil)
      }),
      d => d.year
    );
    return byYear
      .map(([year, s]) => ({ year, renew: s.renew, fossil: s.fossil }))
      .sort((a, b) => a.year - b.year);
  }, [selectedContinents, allContinents, globalEnergyData, continentEnergy]);

  useEffect(() => {
    if (!svgRef.current || loading || aggEnergy.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = w;
    const height = h;
    const margin = { top: 24, right: 120, bottom: 36, left: 64 };

    const x = d3.scaleLinear()
      .domain([2000, 2024])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(aggEnergy, d => d.renew + d.fossil) as number])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const drawAxisX = () => {
      const ticks = [2000, 2005, 2010, 2015, 2020, 2024];
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format("d")))
        .attr("color", "#cbd5e1");
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 6)
        .attr("text-anchor", "middle")
        .attr("fill", "#9fb3d1")
        .style("fontSize", "12px")
        .text("Año");
    };

    const area = d3.area<any>()
      .x((d: any) => x(d.data.year))
      .y0((d: any) => y(d[0]))
      .y1((d: any) => y(d[1]))
      .curve(d3.curveCatmullRom);

    const stack = d3.stack<any>().keys(["renew", "fossil"]);
    const series = stack(aggEnergy as any);

    const showBars = selectedYears.length > 0;

    const currentFilterKey = JSON.stringify({
      years: [...selectedYears].sort(),
      continents: [...selectedContinents].sort()
    });
    const animateOnFilterChange = currentFilterKey !== lastFilterKeyRef.current;
    lastFilterKeyRef.current = currentFilterKey;

    if (!showBars) {
      const dimOpacity = focused.type && focused.type !== "year" ? 0.25 : 0.9;
      series.forEach(s => {
        svg.append("path")
          .datum(s)
          .attr("fill", s.key === "renew" ? "#10b981" : "#ef4444")
          .attr("opacity", dimOpacity)
          .attr("d", area);
      });
    } else {
      svg.append("path")
        .datum(series[0])
        .attr("fill", "#10b981")
        .attr("opacity", 0.15)
        .attr("d", area);
      svg.append("path")
        .datum(series[1])
        .attr("fill", "#ef4444")
        .attr("opacity", 0.15)
        .attr("d", area);

      const sel = [...selectedYears].sort((a, b) => a - b);
      const barW = Math.min(36, ((width - margin.left - margin.right) / Math.max(sel.length, 3)) * 0.6);

      sel.forEach(year => {
        const d = aggEnergy.find(v => v.year === year);
        if (!d) return;
        const group = svg.append("g");

        const fossilRect = group.append("rect")
          .attr("x", x(year) - barW / 2)
          .attr("fill", "#ef4444")
          .attr("rx", 4);

        const renewRect = group.append("rect")
          .attr("x", x(year) - barW / 2)
          .attr("fill", "#10b981")
          .attr("rx", 4);

        if (animateOnFilterChange) {
          fossilRect
            .attr("y", y(d.fossil + d.renew))
            .attr("width", barW)
            .attr("height", 0)
            .transition().duration(320)
            .attr("y", y(d.fossil + d.renew))
            .attr("height", (height - margin.bottom) - y(d.fossil));

          renewRect
            .attr("y", y(d.renew))
            .attr("width", barW)
            .attr("height", 0)
            .transition().duration(320)
            .attr("y", y(d.renew))
            .attr("height", (height - margin.bottom) - y(d.renew));
        } else {
          fossilRect
            .attr("y", y(d.fossil + d.renew))
            .attr("width", barW)
            .attr("height", (height - margin.bottom) - y(d.fossil));
          renewRect
            .attr("y", y(d.renew))
            .attr("width", barW)
            .attr("height", (height - margin.bottom) - y(d.renew));
        }
      });
    }

    const hit = svg.append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent");

    hit.on("mousemove", (event: any) => {
      const [mx] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      setFocused({ type: "year", value: year });
      const d = aggEnergy.find(v => v.year === year);
      if (d && tipRef.current) {
        tipRef.current.style.left = event.clientX + 12 + "px";
        tipRef.current.style.top = event.clientY + 12 + "px";
        tipRef.current.style.opacity = "1";
        tipRef.current.innerHTML =
          "Año " + d.year +
          "<br/>Renovable " + d3.format(".2s")(d.renew) + " TWh" +
          "<br/>Fósil " + d3.format(".2s")(d.fossil) + " TWh";
      }
    }).on("mouseleave", () => {
      clearFocus();
      if (tipRef.current) tipRef.current.style.opacity = "0";
    }).on("click", (event: any) => {
      const [mx] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      toggleYear(year, event.altKey);
    });

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(6).tickFormat(d => d3.format(".2s")(d as number) + " TWh"))
      .attr("color", "#cbd5e1");

    svg.append("text")
      .attr("x", 14)
      .attr("y", margin.top - 8)
      .attr("fill", "#9fb3d1")
      .style("fontSize", "12px")
      .text("Participación mundial Renovable vs. Fósil");

    const legend = svg.append("g").attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);
    [
      { name: "Renovable", color: "#10b981" },
      { name: "Fósil", color: "#ef4444" }
    ].forEach((k, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      g.append("rect").attr("width", 14).attr("height", 14).attr("rx", 3).attr("fill", k.color).attr("opacity", 0.9);
      g.append("text").attr("x", 20).attr("y", 11).attr("fill", "#e2e8f0").style("fontSize", "12px").style("fontWeight", "600").text(k.name);
    });

    drawAxisX();

    svg.on("mouseleave pointercancel touchend", () => {
      clearFocus();
      if (tipRef.current) tipRef.current.style.opacity = "0";
    });
  }, [
    aggEnergy,
    selectedYears,
    selectedContinents,
    focused,
    loading,
    w,
    h,
    toggleYear,
    setFocused,
    clearFocus
  ]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
