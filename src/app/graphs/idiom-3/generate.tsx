"use server";

import * as d3 from "d3";
import { loadEmberLong, seriesGlobalEnergy, loadCoins, cryptoVsCleanShare } from "../data/loader";
import { makeCanvas, title, subtitle, caption, savePNG, W, H } from "../utils/draw";
import { PASTEL_CAT } from "../utils/palette";

export default async function GenerateIdiom3() {
  const ember = loadEmberLong();
  const series = seriesGlobalEnergy(ember);
  const coins = loadCoins();
  const allRows = cryptoVsCleanShare(series, coins).filter((d) => Number.isFinite(d.volAnn) && d.mcap > 0);

  const { canvas, ctx } = makeCanvas();
  title(ctx, "Idiom 3 • Pendiente — Retorno vs Intensidad Energética por Criptomoneda");
  subtitle(ctx, "Cambio en Market Cap vs Cambio en Consumo Energético Global");
  caption(ctx, "Eje X: crecimiento anual de generación eléctrica global. Eje Y: crecimiento anual de Market Cap.");

  const grouped = d3.group(allRows, d => d.symbol);
  const slopeData: Array<{
    symbol: string;
    startYear: number;
    endYear: number;
    startMcap: number;
    endMcap: number;
    startEnergy: number;
    endEnergy: number;
    mcapGrowth: number;
    energyGrowth: number;
  }> = [];

  const totalEnergyByYear = new Map(series.map(s => [s.year, s.total || 0]));

  grouped.forEach((values, symbol) => {
    const sorted = values.sort((a, b) => a.year - b.year);
    if (sorted.length < 2) return;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const startEnergy = totalEnergyByYear.get(first.year) || 1;
    const endEnergy = totalEnergyByYear.get(last.year) || 1;

    const mcapGrowth = ((last.mcap - first.mcap) / first.mcap) * 100;
    const energyGrowth = ((endEnergy - startEnergy) / startEnergy) * 100;

    slopeData.push({
      symbol,
      startYear: first.year,
      endYear: last.year,
      startMcap: first.mcap,
      endMcap: last.mcap,
      startEnergy,
      endEnergy,
      mcapGrowth,
      energyGrowth
    });
  });

  const xExtent = d3.extent(slopeData, d => d.energyGrowth) as [number, number];
  const yExtent = d3.extent(slopeData, d => d.mcapGrowth) as [number, number];

  const x = d3.scaleLinear()
    .domain([0, 100])
    .range([180, W - 120]);

  const y = d3.scaleLinear()
    .domain([0, 100])
    .range([H - 140, 200]);

  const xNorm = d3.scaleLinear()
    .domain(xExtent)
    .range([0, 100]);

  const yNorm = d3.scaleLinear()
    .domain(yExtent)
    .range([0, 100]);

  ctx.strokeStyle = "rgba(238,242,255,0.15)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 10; i++) {
    const yPos = y(i * 10);
    ctx.beginPath();
    ctx.moveTo(180, yPos);
    ctx.lineTo(W - 120, yPos);
    ctx.stroke();
  }

  for (let i = 0; i <= 10; i++) {
    const xPos = x(i * 10);
    ctx.beginPath();
    ctx.moveTo(xPos, 200);
    ctx.lineTo(xPos, H - 140);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(238,242,255,0.5)";
  ctx.lineWidth = 1;
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.fillStyle = "rgba(238,242,255,0.7)";
  ctx.textAlign = "right";

  for (let i = 0; i <= 10; i++) {
    const val = i * 10;
    const yPos = y(val);
    ctx.beginPath();
    ctx.moveTo(175, yPos);
    ctx.lineTo(180, yPos);
    ctx.stroke();
    ctx.fillText(val + "%", 165, yPos + 4);
  }

  ctx.textAlign = "center";
  for (let i = 0; i <= 10; i++) {
    const val = i * 10;
    const xPos = x(val);
    ctx.beginPath();
    ctx.moveTo(xPos, H - 140);
    ctx.lineTo(xPos, H - 135);
    ctx.stroke();
    ctx.fillText(val + "%", xPos, H - 118);
  }

  ctx.font = "13px ui-sans-serif, system-ui";
  ctx.fillStyle = "rgba(238,242,255,0.85)";
  ctx.textAlign = "center";
  ctx.fillText("Crecimiento Generación Eléctrica Global (normalizado)", (180 + W - 120) / 2, H - 95);

  ctx.save();
  ctx.translate(130, (200 + H - 140) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("Crecimiento Market Cap (normalizado)", 0, 0);
  ctx.restore();

  const color = d3.scaleOrdinal<string, string>()
    .domain(slopeData.map(d => d.symbol))
    .range(PASTEL_CAT);

  const sizeScale = d3.scaleSqrt()
    .domain([0, d3.max(slopeData, d => d.endMcap) || 1])
    .range([10, 28]);

  slopeData.forEach(d => {
    const xPos = x(xNorm(d.energyGrowth));
    const yPos = y(yNorm(d.mcapGrowth));
    const size = sizeScale(d.endMcap);

    ctx.beginPath();
    ctx.fillStyle = color(d.symbol);
    ctx.globalAlpha = 0.75;
    ctx.arc(xPos, yPos, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(238,242,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  slopeData.forEach(d => {
    const xPos = x(xNorm(d.energyGrowth));
    const yPos = y(yNorm(d.mcapGrowth));
    const size = sizeScale(d.endMcap);

    ctx.fillStyle = color(d.symbol);
    ctx.font = "bold 14px ui-sans-serif, system-ui";
    ctx.textAlign = "center";

    let labelY = yPos - size - 12;
    let labelX = xPos;

    if (d.symbol === "DOGE") {
      labelX = xPos - 35;
      labelY = yPos - 5;
    } else if (d.symbol === "ETH") {
      labelY = yPos - size - 18;
    } else if (d.symbol === "USDC") {
      labelX = xPos + 35;
      labelY = yPos + 5;
    }

    const labelWidth = ctx.measureText(d.symbol).width;

    ctx.fillStyle = "rgba(26, 26, 46, 0.92)";
    ctx.fillRect(labelX - labelWidth/2 - 6, labelY - 17, labelWidth + 12, 20);

    ctx.fillStyle = color(d.symbol);
    ctx.fillText(d.symbol, labelX, labelY - 2);

    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(238,242,255,0.75)";

    let yearLabelY = yPos + size + 20;
    let yearLabelX = xPos;

    if (d.symbol === "DOGE") {
      yearLabelX = xPos - 35;
      yearLabelY = yPos + 18;
    } else if (d.symbol === "USDC") {
      yearLabelX = xPos + 35;
      yearLabelY = yPos + 18;
    }

    ctx.fillText(`${d.startYear}-${d.endYear}`, yearLabelX, yearLabelY);
  });

  const legendY = 160;
  const legendX = W - 280;

  ctx.fillStyle = "rgba(238,242,255,0.8)";
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Tamaño del círculo = Market Cap final", legendX, legendY);

  savePNG(canvas, "idiom-3_slope_crypto_growth_vs_energy.png");
}
