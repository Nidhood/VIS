"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useStore } from "../utils/useData";

type Node = { name: string; id: string; children?: Node[] };
type Link = { source: string; target: string };
type HNode = d3.HierarchyPointNode<any>;

export default function GraphBundle() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { countriesByContinent, selectedContinents, toggleContinent, focused, setFocused, clearFocus } = useStore();
  const [w, setW] = useState(600);
  const [h, setH] = useState(780);

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

  const { root, links } = useMemo(() => {
    const nodes: Node[] = Object.entries(countriesByContinent).map(([cont, countries]) => ({
      name: cont,
      id: cont,
      children: countries.map(c => ({ name: c, id: `${cont}.${c}` }))
    }));
    const root: Node = { name: "World", id: "world", children: nodes };
    const links: Link[] = [];
    Object.entries(countriesByContinent).forEach(([cont, countries]) => {
      countries.forEach(c => { links.push({ source: `${cont}.${c}`, target: cont }); });
    });
    return { root, links };
  }, [countriesByContinent]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = w;
    const height = h;
    const baseRadius = Math.min(width, height) / 2 - 24;

    const cluster = d3.cluster<any>().size([2 * Math.PI, baseRadius]);
    const treeData: HNode = cluster(d3.hierarchy(root as any)) as unknown as HNode;

    const nodes: HNode[] = (treeData as any).descendants() as HNode[];
    const nodeById = new Map<string, HNode>(nodes.map(d => [d.data.id as string, d]));
    const line = d3
      .lineRadial<HNode>()
      .curve(d3.curveBundle.beta(0.85))
      .radius(d => d.y)
      .angle(d => d.x);

    const outer = svg.append("g");
    const content = outer.append("g");

    const dimOpacity = focused.type && focused.type !== "continent" ? 0.1 : 0.45;

    const paths = content
      .append("g")
      .selectAll<SVGPathElement, Link>("path")
      .data(links)
      .enter()
      .append("path")
      .attr("d", d => {
        const src = nodeById.get(d.source)!;
        const tgt = nodeById.get(d.target)!;
        return line(src.path(tgt) as unknown as HNode[])!;
      })
      .attr("fill", "none")
      .attr("stroke", "rgba(167,199,231,1)")
      .attr("stroke-opacity", dimOpacity)
      .attr("stroke-width", 1);

    const node = content
      .append("g")
      .selectAll<SVGGElement, HNode>("g")
      .data(nodes.filter(d => d.depth === 1 || d.depth === 2))
      .enter()
      .append("g")
      .attr("transform", d => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`);

    node
      .append("circle")
      .attr("r", d => (d.depth === 1 ? 6 : 3))
      .attr("fill", d => (d.depth === 1 ? "#10b981" : "#a7c7e7"))
      .attr("stroke", "#0b1022")
      .attr("stroke-width", 1)
      .attr("opacity", d => {
        if (d.depth !== 1) return 1;
        if (selectedContinents.length === 0) return 1;
        return selectedContinents.includes(d.data.name) ? 1 : 0.25;
      });

    node
      .append<SVGTextElement>("text")
      .attr("dy", "0.31em")
      .attr("x", d => (d.x < Math.PI ? 8 : -8))
      .attr("text-anchor", d => (d.x < Math.PI ? "start" : "end"))
      .attr("transform", d => (d.x >= Math.PI ? "rotate(180)" : ""))
      .attr("fill", "#e2e8f0")
      .style("fontSize", d => (d.depth === 1 ? "12px" : "10px"))
      .style("fontWeight", d => (d.depth === 1 ? "700" : "600"))
      .text(d => String(d.data.name))
      .style("cursor", d => (d.depth === 1 ? "pointer" : "default"))
      .attr("opacity", d => {
        if (d.depth !== 1) return 1;
        if (selectedContinents.length === 0) return 1;
        return selectedContinents.includes(d.data.name) ? 1 : 0.25;
      })
      .on("mousemove", function (e: MouseEvent, d: HNode) {
        if (d.depth !== 1) return;
        setFocused({ type: "continent", value: String(d.data.name) });
        d3.select<SVGTextElement, HNode>(this)
          .transition()
          .duration(120)
          .attr("transform", n => (n.x >= Math.PI ? "rotate(180) scale(1.07)" : "scale(1.07)"));
        paths
          .attr("stroke-opacity", (lk: Link) => {
            const tgt = nodeById.get(lk.target)!;
            return tgt.data.name === d.data.name ? 0.9 : dimOpacity;
          })
          .attr("stroke-width", (lk: Link) => {
            const tgt = nodeById.get(lk.target)!;
            return tgt.data.name === d.data.name ? 1.8 : 1;
          });
      })
      .on("mouseleave", function () {
        clearFocus();
        d3.select<SVGTextElement, HNode>(this)
          .transition()
          .duration(120)
          .attr("transform", n => (n.x >= Math.PI ? "rotate(180) scale(1.0)" : "scale(1.0)"));
        paths.attr("stroke-opacity", dimOpacity).attr("stroke-width", 1);
      })
      .on("click", (e: MouseEvent, d: HNode) => {
        if (d.depth !== 1) return;
        toggleContinent(String(d.data.name), (e as any).altKey);
      });

    const bbox = (content.node() as SVGGElement).getBBox();
    const scale = 0.92 * Math.min(width / bbox.width, height / bbox.height);
    const tx = width / 2 - (bbox.x + bbox.width / 2) * scale;
    const ty = height / 2 - (bbox.y + bbox.height / 2) * scale;
    outer.attr("transform", `translate(${tx},${ty}) scale(${isFinite(scale) ? scale : 1})`);

    svg.on("mouseleave pointercancel touchend", () => {
      clearFocus();
    });
  }, [root, links, w, h, selectedContinents, toggleContinent, focused, setFocused, clearFocus]);

  return <svg ref={svgRef} width="100%" height="100%" />;
}
