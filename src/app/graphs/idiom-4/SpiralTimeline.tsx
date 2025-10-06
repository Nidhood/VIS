"use client";
import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import {useColorCategStatus, useStore} from "@/app/graphs/useData"

export default function SpiralTimeline() {
  const { view } = useStore();
  const ref = useRef<SVGSVGElement | null>(null);
  const color = useColorCategStatus();

  const data = useMemo(() => {
    const rows = view.filter((d) => d.date && d.year && d.month !== null);
    if (rows.length === 0) return null;

    const years = Array.from(new Set(rows.map(r => r.year!))).sort();
    const statuses = Array.from(new Set(rows.map(r => r.statusMission)));

    const grouped = d3.rollups(
      rows,
      v => v.length,
      d => d.year!,
      d => d.month!,
      d => d.statusMission
    );

    const segments: {year: number, month: number, statusCounts: Map<string, number>, total: number}[] = [];

    grouped.forEach(([year, monthMap]) => {
      monthMap.forEach(([month, statusMap]) => {
        const statusCounts = new Map<string, number>();
        let total = 0;
        statusMap.forEach(([status, count]) => {
          statusCounts.set(status, count);
          total += count;
        });
        segments.push({ year, month, statusCounts, total });
      });
    });

    return { segments, years, statuses };
  }, [view]);

  useEffect(() => {
    if (!data || !ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const box = ref.current.getBoundingClientRect();
    const W = box.width || 600;
    const H = box.height || 300;

    if (W === 0 || H === 0) return;

    const centerX = W / 2;
    const centerY = H / 2;
    const maxRadius = Math.min(W, H) * 0.42;
    const innerRadius = maxRadius * 0.25;

    const { segments, years, statuses } = data;

    const yearScale = d3.scaleLinear()
      .domain([d3.min(years)!, d3.max(years)!])
      .range([innerRadius, maxRadius]);

    const maxCount = d3.max(segments, d => d.total) || 1;
    const opacityScale = d3.scaleLinear()
      .domain([1, maxCount])
      .range([0.3, 1.0]);

    const g = svg.append("g");

    segments.forEach(seg => {
      const innerR = yearScale(seg.year);
      const outerR = yearScale(seg.year + 1);
      const ringWidth = outerR - innerR;

      const startAngle = (seg.month / 12) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((seg.month + 1) / 12) * 2 * Math.PI - Math.PI / 2;

      let currentInnerR = innerR;
      const totalInSegment = seg.total;

      seg.statusCounts.forEach((count, status) => {
        const proportion = count / totalInSegment;
        const segmentHeight = ringWidth * proportion;
        const segmentOuterR = currentInnerR + segmentHeight;

        const arc = d3.arc()
          .innerRadius(currentInnerR)
          .outerRadius(segmentOuterR)
          .startAngle(startAngle)
          .endAngle(endAngle);

        const baseColor = color(status);
        const opacity = opacityScale(count);

        g.append("path")
          .attr("d", arc as any)
          .attr("fill", baseColor)
          .attr("opacity", opacity)
          .attr("stroke", "rgba(255,255,255,0.1)")
          .attr("stroke-width", 0.5)
          .attr("transform", `translate(${centerX},${centerY})`);

        currentInnerR = segmentOuterR;
      });
    });

    const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    monthLabels.forEach((label, i) => {
      const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const labelR = maxRadius + 20;
      const x = centerX + Math.cos(angle) * labelR;
      const y = centerY + Math.sin(angle) * labelR;

      g.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#cbd5e1")
        .attr("font-size", 10)
        .text(label);
    });

    const yearStep = Math.ceil(years.length / 5);
    years.filter((_, i) => i % yearStep === 0).forEach(year => {
      const r = yearScale(year);

      g.append("text")
        .attr("x", centerX + r)
        .attr("y", centerY - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "#9ca3af")
        .attr("font-size", 9)
        .text(year);
    });

  }, [data, color]);

  return <div className="card"><svg ref={ref} preserveAspectRatio="xMidYMid meet" /></div>;
}
