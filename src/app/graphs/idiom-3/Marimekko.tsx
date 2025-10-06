"use client";
import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import { useColorDiverging, useStore } from "@/app/graphs/useData";

type Cell = { status: string; n: number; mean: number; r: number; h: number };
type Col = { company: string; w: number; cells: Cell[] };

export default function Marimekko() {
  const { view, highlight, setHighlight } = useStore();
  const ref = useRef<SVGSVGElement | null>(null);
  const div = useColorDiverging();

  const data = useMemo(() => {
    const rows = view.filter((d) => d.cost !== null);
    if (rows.length === 0) return null;

    const avg = d3.mean(rows, (d) => d.cost as number) || 0;
    const tbl = d3.rollups(
      rows,
      (v) => {
        const n = v.length;
        const mean = d3.mean(v, (x) => x.cost as number) || 0;
        const r = (mean - avg) / (avg || 1);
        return { n, mean, r };
      },
      (d) => d.company,
      (d) => d.statusMission
    );

    const total = d3.sum(tbl, ([, arr]) => d3.sum(arr, ([, o]) => o.n));
    const norm: Col[] = tbl.map(([c, arr]) => {
      const w = d3.sum(arr, ([, o]) => o.n) / (total || 1);
      const base = arr.map<Cell>(([s, o]) => ({ status: s as string, n: o.n, mean: o.mean, r: o.r, h: 0 }));
      const sumN = d3.sum(base, (x) => x.n) || 1;
      const cells = base.map((x) => ({ ...x, h: x.n / sumN }));
      return { company: c as string, w, cells };
    });

    return { norm };
  }, [view]);

  useEffect(() => {
    if (!data || !ref.current) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const box = ref.current.getBoundingClientRect();
    const W = box.width || 600;
    const H = box.height || 300;

    if (W === 0 || H === 0) return;

    let x = 0;
    const g = svg.append("g");

    // Agregar un rect invisible para capturar mouse leave
    g.append("rect")
      .attr("width", W)
      .attr("height", H)
      .attr("fill", "transparent")
      .style("pointer-events", "all")
      .on("mouseleave", () => {
        setHighlight(null);
      });

    data.norm.forEach((col) => {
      const cw = col.w * (W - 60);
      let y = 20;
      col.cells.forEach((cell) => {
        const ch = cell.h * (H - 40);

        const isHighlighted = () => {
          if (!highlight) return false;
          return (highlight.company && highlight.company === col.company) ||
            (highlight.status && highlight.status === cell.status);
        };

        g
          .append("rect")
          .attr("x", 30 + x)
          .attr("y", y)
          .attr("width", cw)
          .attr("height", ch)
          .attr("fill", div(Math.max(-1, Math.min(1, cell.r))))
          .attr("opacity", () => {
            if (!highlight) return 0.9;
            return isHighlighted() ? 1 : 0.25;
          })
          .style("cursor", "pointer")
          .on("mouseenter", function() {
            setHighlight({ company: col.company, status: cell.status });
          });
        y += ch;
      });

      g
        .append("text")
        .attr("x", 30 + x + cw / 2)
        .attr("y", H - 6)
        .attr("text-anchor", "middle")
        .attr("fill", "#cbd5e1")
        .attr("font-size", 10)
        .text(col.company)
        .style("cursor", "pointer")
        .on("mouseenter", function() {
          setHighlight({ company: col.company });
        });
      x += cw;
    });
  }, [data, div, highlight, setHighlight]);

  return <div className="card"><svg ref={ref} preserveAspectRatio="xMidYMid meet" /></div>;
}
