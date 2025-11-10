"use server";

import * as d3 from "d3";
import { loadEmberLong, continentEnergyProduction } from "../data/loader";
import { makeCanvas, title, subtitle, caption, axes, axisLabelX, axisLabelY, savePNG, W, H } from "../utils/draw";
import { PASTEL_CAT } from "../utils/palette";

export default async function GenerateIdiom4() {
  const ember = loadEmberLong();
  const data = continentEnergyProduction(ember);

  const { canvas, ctx } = makeCanvas();
  title(ctx, "Idiom 4 • Líneas Múltiples — Evolución de Producción y Consumo por Continente");
  subtitle(ctx, "Generación vs Consumo de Energía Eléctrica (2000-2023)");
  caption(ctx, "Eje X: Año. Eje Y: Energía eléctrica (TWh). Línea sólida = Producción, Línea punteada = Consumo.");

  // Agrupar por continente
  const byContinentMap = d3.group(data, d => d.continent);
  const continents = Array.from(byContinentMap.keys()).sort();

  // Calcular dominios
  const yearExtent = d3.extent(data, d => d.year) as [number, number];
  const maxEnergy = d3.max(data, d => Math.max(d.production, d.consumption)) || 1;

  const x = d3.scaleLinear()
    .domain(yearExtent)
    .range([110, W - 250]);

  const y = d3.scaleLinear()
    .domain([0, maxEnergy])
    .nice()
    .range([H - 130, 140]);

  axes(ctx, x, y, 10, 6,
    (n) => String(n),
    (n) => d3.format(".2s")(n as number).replace("G", "B")
  );
  axisLabelX(ctx, "Año");
  axisLabelY(ctx, "Energía Eléctrica");

  // Asignar colores a continentes
  const colorScale = d3.scaleOrdinal<string, string>()
    .domain(continents)
    .range(PASTEL_CAT);

  // Dibujar líneas de producción (sólidas)
  byContinentMap.forEach((continentData, continent) => {
    const sorted = continentData.sort((a, b) => a.year - b.year);
    const col = colorScale(continent);

    // Línea de PRODUCCIÓN (sólida, más gruesa)
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([]);
    ctx.beginPath();
    sorted.forEach((d, i) => {
      const px = x(d.year);
      const py = y(d.production);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Dibujar líneas de consumo (punteadas)
  byContinentMap.forEach((continentData, continent) => {
    const sorted = continentData.sort((a, b) => a.year - b.year);
    const col = colorScale(continent);

    // Línea de CONSUMO (punteada, más delgada)
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    sorted.forEach((d, i) => {
      const px = x(d.year);
      const py = y(d.consumption);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  });

  // Marcar puntos cada 5 años
  byContinentMap.forEach((continentData, continent) => {
    const sorted = continentData.sort((a, b) => a.year - b.year);
    const col = colorScale(continent);

    sorted.forEach((d, i) => {
      if (i % 5 === 0 || i === sorted.length - 1) {
        // Punto de producción
        const px = x(d.year);
        const py = y(d.production);

        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.8;
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "rgba(238,242,255,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  });

  // Ajuste de posición de etiquetas para evitar superposición
  const labelOffsets: Record<string, { x: number; y: number }> = {
    "Asia": { x: 12, y: -10 },
    "Europa": { x: 12, y: 0 },
    "América": { x: 12, y: 10 },
    "África": { x: 12, y: -5 },
    "Oceanía": { x: 12, y: 5 }
  };

  // Etiquetar el último punto de cada continente con posiciones ajustadas
  byContinentMap.forEach((continentData, continent) => {
    const sorted = continentData.sort((a, b) => a.year - b.year);
    const last = sorted[sorted.length - 1];
    const col = colorScale(continent);

    const lx = x(last.year);
    const ly = y(last.production);

    // Punto destacado al final
    ctx.beginPath();
    ctx.fillStyle = col;
    ctx.arc(lx, ly, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(238,242,255,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Etiqueta del continente con offset personalizado
    const offset = labelOffsets[continent] || { x: 12, y: 0 };
    ctx.fillStyle = col;
    ctx.font = "bold 13px ui-sans-serif, system-ui";
    ctx.textAlign = "left";

    const labelText = continent;
    const valueText = d3.format(".2s")(last.production).replace("G", "B");
    const labelWidth = ctx.measureText(labelText).width;
    const valueWidth = ctx.measureText(valueText).width;
    const maxWidth = Math.max(labelWidth, valueWidth);

    // Fondo para etiqueta con posición ajustada
    ctx.fillStyle = "rgba(26, 26, 46, 0.92)";
    ctx.fillRect(lx + offset.x, ly + offset.y - 12, maxWidth + 12, 32);

    // Texto del continente
    ctx.fillStyle = col;
    ctx.fillText(labelText, lx + offset.x + 6, ly + offset.y + 2);

    // Valor de producción
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(238,242,255,0.85)";
    ctx.fillText(valueText, lx + offset.x + 6, ly + offset.y + 16);
  });

  // Leyenda interactiva en el lado derecho - POSICIÓN MEJORADA
  const legendX = W - 220;
  const legendY = 180;

  // Fondo de leyenda
  ctx.fillStyle = "rgba(26, 26, 46, 0.92)";
  ctx.fillRect(legendX - 15, legendY - 35, 205, continents.length * 28 + 90);

  ctx.fillStyle = "rgba(238,242,255,0.95)";
  ctx.font = "bold 14px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Continentes", legendX, legendY - 15);

  continents.forEach((continent, idx) => {
    const yOffset = idx * 28;
    const col = colorScale(continent);

    // Línea de muestra (producción)
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + 5 + yOffset);
    ctx.lineTo(legendX + 30, legendY + 5 + yOffset);
    ctx.stroke();

    // Punto
    ctx.beginPath();
    ctx.fillStyle = col;
    ctx.arc(legendX + 15, legendY + 5 + yOffset, 4, 0, Math.PI * 2);
    ctx.fill();

    // Nombre del continente
    ctx.fillStyle = "rgba(238,242,255,0.95)";
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(continent, legendX + 38, legendY + 9 + yOffset);
  });

  // Leyenda de tipos de línea - MEJOR ESPACIADO
  const typeLegendY = legendY + continents.length * 28 + 30;

  ctx.fillStyle = "rgba(238,242,255,0.95)";
  ctx.font = "bold 13px ui-sans-serif, system-ui";
  ctx.fillText("Tipo de línea:", legendX, typeLegendY);

  // Producción (línea sólida)
  ctx.strokeStyle = "rgba(167,199,231,0.9)";
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(legendX, typeLegendY + 18);
  ctx.lineTo(legendX + 35, typeLegendY + 18);
  ctx.stroke();

  ctx.fillStyle = "rgba(238,242,255,0.85)";
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.fillText("Producción", legendX + 42, typeLegendY + 22);

  // Consumo (línea punteada)
  ctx.strokeStyle = "rgba(167,199,231,0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(legendX, typeLegendY + 36);
  ctx.lineTo(legendX + 35, typeLegendY + 36);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(238,242,255,0.85)";
  ctx.fillText("Consumo", legendX + 42, typeLegendY + 40);

  savePNG(canvas, "idiom-4_multiline_production_consumption.png");
}