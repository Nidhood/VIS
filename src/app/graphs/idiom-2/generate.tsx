"use server";

import * as d3 from "d3";
import { loadEmberLong, continentCleanShare } from "../data/loader";
import { makeCanvas, title, subtitle, caption, axes, axisLabelX, axisLabelY, savePNG, W, H } from "../utils/draw";
import { PASTEL_CAT } from "../utils/palette";

export default async function GenerateIdiom2() {
  const ember = loadEmberLong();
  const data = continentCleanShare(ember);

  const { canvas, ctx } = makeCanvas();
  title(ctx, "Idiom 2 • Línea — Participación de Energía Limpia por Continente");
  subtitle(ctx, "Proporción de energía renovable en la matriz eléctrica (2000-2023)");
  caption(ctx, "Fuente: Ember. Share limpio = renovable / (renovable + fósil).");

  const x = d3.scaleLinear()
    .domain(d3.extent(data, (d) => d.year) as [number, number])
    .range([90, W - 250]);

  const y = d3.scaleLinear()
    .domain([0, 1])
    .range([H - 120, 120]);

  axes(ctx, x, y, 10, 5, (n) => String(n), (n) => d3.format(".0%")(n as number));
  axisLabelX(ctx, "Año");
  axisLabelY(ctx, "Participación de energía limpia");

  const groups = d3.group(data, (d) => d.continent);
  const continents = Array.from(groups.keys()).sort();

  // Asignar colores
  const colorScale = d3.scaleOrdinal<string, string>()
    .domain(continents)
    .range(PASTEL_CAT);

  // Dibujar líneas
  groups.forEach((arr0, continent) => {
    const arr = [...arr0].sort((a, b) => a.year - b.year);
    const col = colorScale(continent);

    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    arr.forEach((d, j) => {
      const X = x(d.year), Y = y(d.cleanShare);
      if (j === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Marcar puntos cada 5 años
  groups.forEach((arr0, continent) => {
    const arr = [...arr0].sort((a, b) => a.year - b.year);
    const col = colorScale(continent);

    arr.forEach((d, j) => {
      if (j % 5 === 0 || j === arr.length - 1) {
        const X = x(d.year);
        const Y = y(d.cleanShare);

        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.arc(X, Y, j === arr.length - 1 ? 6 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "rgba(238,242,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Etiquetas solo en puntos intermedios (no el último)
        if (j !== arr.length - 1 && j % 5 === 0) {
          const label = d3.format(".0%")(d.cleanShare);
          const labelWidth = ctx.measureText(label).width;

          ctx.fillStyle = "rgba(26, 26, 46, 0.88)";
          ctx.fillRect(X - labelWidth/2 - 4, Y - 22, labelWidth + 8, 16);

          ctx.fillStyle = col;
          ctx.font = "bold 11px ui-sans-serif, system-ui";
          ctx.textAlign = "center";
          ctx.fillText(label, X, Y - 10);
        }
      }
    });
  });

  // Ajustes de posición para etiquetas finales
  const labelOffsets: Record<string, { x: number; y: number }> = {
    "Europa": { x: 12, y: -8 },
    "América": { x: 12, y: 8 },
    "Asia": { x: 12, y: 0 },
    "Oceanía": { x: 12, y: -16 },
    "África": { x: 12, y: 16 }
  };

  // Etiquetas finales con ajuste de posición
  groups.forEach((arr0, continent) => {
    const arr = [...arr0].sort((a, b) => a.year - b.year);
    const last = arr.at(-1)!;
    const col = colorScale(continent);
    const offset = labelOffsets[continent] || { x: 12, y: 0 };

    const lastX = x(last.year);
    const lastY = y(last.cleanShare);

    ctx.fillStyle = col;
    ctx.font = "bold 13px ui-sans-serif, system-ui";
    ctx.textAlign = "left";

    const labelText = continent;
    const valueText = d3.format(".1%")(last.cleanShare);
    const labelWidth = ctx.measureText(labelText).width;
    const valueWidth = ctx.measureText(valueText).width;
    const maxWidth = Math.max(labelWidth, valueWidth);

    // Fondo
    ctx.fillStyle = "rgba(26, 26, 46, 0.92)";
    ctx.fillRect(lastX + offset.x, lastY + offset.y - 12, maxWidth + 12, 32);

    // Texto del continente
    ctx.fillStyle = col;
    ctx.fillText(labelText, lastX + offset.x + 6, lastY + offset.y + 2);

    // Valor
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(238,242,255,0.85)";
    ctx.fillText(valueText, lastX + offset.x + 6, lastY + offset.y + 16);
  });

  // Leyenda
  const legendX = W - 220;
  const legendY = 180;

  ctx.fillStyle = "rgba(26, 26, 46, 0.92)";
  ctx.fillRect(legendX - 15, legendY - 35, 205, continents.length * 28 + 40);

  ctx.fillStyle = "rgba(238,242,255,0.95)";
  ctx.font = "bold 14px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Continentes", legendX, legendY - 15);

  continents.forEach((continent, idx) => {
    const yOffset = idx * 28;
    const col = colorScale(continent);

    // Línea
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

    // Nombre
    ctx.fillStyle = "rgba(238,242,255,0.95)";
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText(continent, legendX + 38, legendY + 9 + yOffset);
  });

  savePNG(canvas, "idiom-2_line_clean_share_continents.png");
}