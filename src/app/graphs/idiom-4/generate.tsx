"use server";

import * as d3 from "d3";
import { loadWDI, wdiEnergyVsGdp } from "../data/loader";
import { makeCanvas, title, subtitle, caption, axes, axisLabelX, axisLabelY, savePNG, W, H } from "../utils/draw";
import { CLEAN_COLOR } from "../utils/palette";

export default async function GenerateIdiom5() {
  const wdi = loadWDI();
  const rows = wdiEnergyVsGdp(wdi, "China");

  const { canvas, ctx } = makeCanvas();
  title(ctx, "Idiom 5 • Dispersión — Energía per cápita vs PIB per cápita");
  subtitle(ctx, "Ejemplo: China (WDI)");
  caption(ctx, "Eje X: PIB per cápita (US$). Eje Y: uso de energía (kg de petróleo eq. per cápita).");

  const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d.gdp_per_capita as number) as [number, number]).nice().range([110, W - 90]);
  const y = d3.scaleLinear().domain(d3.extent(rows, (d) => d.energy_per_capita_kg as number) as [number, number]).nice().range([H - 130, 140]);

  axes(ctx, x, y, 6, 6, (n) => d3.format(".2s")(n as number).replace("G", "B"), (n) => d3.format(".2s")(n as number));
  axisLabelX(ctx, "PIB per cápita (US$)");
  axisLabelY(ctx, "Energía per cápita (kg petróleo eq)");

  ctx.strokeStyle = "rgba(167,199,231,0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  rows.forEach((d, i) => {
    const cx = x(d.gdp_per_capita as number), cy = y(d.energy_per_capita_kg as number);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const yearScale = d3.scaleLinear()
    .domain(d3.extent(rows, d => d.year) as [number, number])
    .range([4, 10]);

  const colorScale = d3.scaleLinear()
    .domain(d3.extent(rows, d => d.year) as [number, number])
    .range([0.4, 1]);

  rows.forEach((d, i) => {
    const cx = x(d.gdp_per_capita as number), cy = y(d.energy_per_capita_kg as number);
    const pointSize = yearScale(d.year);
    const alpha = colorScale(d.year);

    ctx.beginPath();
    ctx.fillStyle = CLEAN_COLOR;
    ctx.globalAlpha = alpha;
    ctx.arc(cx, cy, pointSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(238,242,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  ctx.globalAlpha = 1;

  const keyPoints = rows.filter((d, i) => i % 5 === 0 && i !== rows.length - 1);

  keyPoints.forEach((d, i) => {
    const cx = x(d.gdp_per_capita as number), cy = y(d.energy_per_capita_kg as number);

    ctx.fillStyle = "rgba(238,242,255,0.95)";
    ctx.font = "bold 11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    const energyLabel = d3.format(".2s")(d.energy_per_capita_kg);
    ctx.fillText(energyLabel, cx, cy - 15);

    ctx.font = "9px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(238,242,255,0.75)";
    ctx.fillText(String(d.year), cx, cy + 20);
  });

  const firstPoint = rows[0];
  const lastPoint = rows[rows.length - 1];

  const fx = x(firstPoint.gdp_per_capita as number);
  const fy = y(firstPoint.energy_per_capita_kg as number);
  ctx.beginPath();
  ctx.strokeStyle = "#bae1a4";
  ctx.lineWidth = 2;
  ctx.arc(fx, fy, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#bae1a4";
  ctx.font = "bold 12px ui-sans-serif, system-ui";
  ctx.fillText(`${firstPoint.year}`, fx, fy - 20);

  const lx = x(lastPoint.gdp_per_capita as number);
  const ly = y(lastPoint.energy_per_capita_kg as number);
  ctx.beginPath();
  ctx.strokeStyle = "#ffb3ba";
  ctx.lineWidth = 2;
  ctx.arc(lx, ly, 12, 0, Math.PI * 2);
  ctx.stroke();

  const lEnergyText = d3.format(".2s")(lastPoint.energy_per_capita_kg);
  const lGdpText = d3.format(".2s")(lastPoint.gdp_per_capita || 0);

  ctx.fillStyle = "#ffb3ba";
  ctx.font = "bold 13px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText(lEnergyText, lx + 18, ly - 8);

  ctx.font = "10px ui-sans-serif, system-ui";
  ctx.fillStyle = "rgba(255,179,186,0.8)";
  ctx.fillText(`${lastPoint.year}`, lx + 18, ly + 6);

  ctx.fillStyle = "rgba(238,242,255,0.7)";
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Tamaño del punto = año más reciente", 110, H - 150);
  ctx.fillText("Correlación positiva entre PIB y uso de energía", 110, H - 135);

  savePNG(canvas, "idiom-4_scatter_energy_vs_gdp.png");
}
