"use server";

import * as d3 from "d3";
import { loadEmberLong, topCountriesCleanShare } from "../data/loader";
import { makeCanvas, title, subtitle, caption, axes, axisLabelX, axisLabelY, savePNG, W, H } from "../utils/draw";
import { PASTEL_CAT } from "../utils/palette";

export default async function GenerateIdiom2() {
  const ember = loadEmberLong();
  const top = topCountriesCleanShare(ember, 5, 2000);

  const rows: { area: string; year: number; cleanShare: number }[] = [];
  top.forEach((c) => c.years.forEach((y) => rows.push({ area: c.area, year: +y.year, cleanShare: y.cleanShare })));

  const { canvas, ctx } = makeCanvas();
  title(ctx, "Idiom 2 • Línea — Participación de Energía Limpia");
  subtitle(ctx, "Top 5 países por generación total reciente; share limpio = renovable/total");
  caption(ctx, "Fuente: Ember. Se filtran países con alta generación para evitar sesgos de micro-economías.");

  const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d.year) as [number, number]).range([90, W - 60]);
  const y = d3.scaleLinear().domain([0, 1]).range([H - 120, 120]);

  axes(ctx, x, y, 10, 5, (n) => String(n), (n) => d3.format(".0%")(n as number));
  axisLabelX(ctx, "Año");
  axisLabelY(ctx, "Participación de energía limpia");

  const groups = d3.group(rows, (d) => d.area);
  const items: { color: string; label: string }[] = [];
  let i = 0;

  for (const [area, arr0] of groups) {
    const arr = [...arr0].sort((a, b) => a.year - b.year);
    const col = PASTEL_CAT[i++ % PASTEL_CAT.length];
    items.push({ color: col, label: area });

    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    arr.forEach((d, j) => {
      const X = x(d.year), Y = y(d.cleanShare);
      if (j === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    arr.forEach((d, j) => {
      if (j % 5 === 0 && j !== arr.length - 1) {
        const X = x(d.year);
        const Y = y(d.cleanShare);

        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.arc(X, Y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = "rgba(238,242,255,0.9)";
        ctx.font = "bold 10px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        const label = d3.format(".0%")(d.cleanShare);
        ctx.fillText(label, X, Y - 10);
      }
    });
  }

  for (const [area, arr0] of groups) {
    const arr = [...arr0].sort((a, b) => a.year - b.year);
    const last = arr.at(-1)!;
    const col = items.find(item => item.label === area)?.color || "#fff";

    const lastX = x(last.year);
    const lastY = y(last.cleanShare);

    ctx.fillStyle = col;
    ctx.font = "bold 12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";

    const labelText = area;
    const valueText = d3.format(".0%")(last.cleanShare);

    const labelWidth = ctx.measureText(labelText).width;
    const valueWidth = ctx.measureText(valueText).width;
    const maxWidth = Math.max(labelWidth, valueWidth);

    ctx.fillStyle = "rgba(26, 26, 46, 0.92)";
    ctx.fillRect(lastX + 8, lastY - 20, maxWidth + 10, 28);

    ctx.fillStyle = col;
    ctx.fillText(labelText, lastX + 13, lastY - 7);

    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(238,242,255,0.8)";
    ctx.fillText(valueText, lastX + 13, lastY + 6);
  }

  const legendX = W - 180;
  const legendY = 48;

  items.forEach((item, idx) => {
    const yOffset = idx * 20;

    ctx.beginPath();
    ctx.fillStyle = item.color;
    ctx.arc(legendX, legendY + yOffset, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(238,242,255,0.9)";
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(item.label, legendX + 12, legendY + yOffset + 4);
  });

  savePNG(canvas, "idiom-2_line_clean_share_top5.png");
}
