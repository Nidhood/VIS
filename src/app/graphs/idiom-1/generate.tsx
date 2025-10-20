"use server";

import * as d3 from "d3";
import { loadEmberLong, seriesGlobalEnergy } from "../data/loader";
import { makeCanvas, title, subtitle, caption, axes, axisLabelX, axisLabelY, legendDots, savePNG, W, H } from "../utils/draw";
import { RENEWABLE_COLOR, FOSSIL_COLOR } from "../utils/palette";

export default async function GenerateIdiom1() {
  const ember = loadEmberLong();
  const series = seriesGlobalEnergy(ember);

  const { canvas, ctx } = makeCanvas();
  title(ctx, "Idiom 1 • Área Apilada — Mix Energético Global");
  subtitle(ctx, "Renovable vs Fósil, generación total por año");
  caption(ctx, "Fuente: Ember (yearly_full_release_long_format). Valores agregados; unidades según fuente.");

  const x = d3.scaleLinear().domain(d3.extent(series, (d) => d.year) as [number, number]).range([90, W - 60]);
  const maxTotal = d3.max(series, (d) => d.total) || 1;
  const y = d3.scaleLinear().domain([0, maxTotal]).nice().range([H - 120, 120]);

  axes(ctx, x, y, 10, 6, (n) => String(n), (n) => d3.format(".2s")(n as number).replace("G", "B"));
  axisLabelX(ctx, "Año");
  axisLabelY(ctx, "Generación eléctrica");

  const data = series.map((d) => ({ year: d.year, Renovable: d.sumRenew || 0, Fósil: d.sumFossil || 0 }));
  const stack = d3.stack<{ year: number; Renovable: number; Fósil: number }>().keys(["Renovable", "Fósil"])(data);
  const color: Record<string, string> = { Renovable: RENEWABLE_COLOR, Fósil: FOSSIL_COLOR };

  stack.forEach((layer) => {
    ctx.beginPath();
    layer.forEach((s, j) => {
      const X = x(data[j].year), Y = y(s[0]);
      if (j === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    for (let j = layer.length - 1; j >= 0; j--) {
      const X = x(data[j].year), Y = y(layer[j][1]);
      ctx.lineTo(X, Y);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = color[layer.key];
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(238,242,255,0.3)";
  ctx.lineWidth = 1.5;
  stack.forEach((layer) => {
    ctx.beginPath();
    layer.forEach((s, j) => {
      const X = x(data[j].year), Y = y(s[1]);
      if (j === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();
  });

  const labelYears = data.filter((d, i) => i % 5 === 0 && i !== data.length - 1);

  labelYears.forEach((d) => {
    const xPos = x(d.year);
    const renewY = y(d.Renovable);
    const totalY = y(d.Renovable + d.Fósil);

    const renewText = d3.format(".2s")(d.Renovable).replace("G", "B");
    const totalText = d3.format(".2s")(d.Renovable + d.Fósil).replace("G", "B");

    ctx.font = "bold 13px ui-sans-serif, system-ui";
    const renewWidth = ctx.measureText(renewText).width;
    const totalWidth = ctx.measureText(totalText).width;

    ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
    ctx.fillRect(xPos - renewWidth/2 - 4, renewY - 22, renewWidth + 8, 18);
    ctx.fillStyle = "#bae1a4";
    ctx.textAlign = "center";
    ctx.fillText(renewText, xPos, renewY - 8);

    ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
    ctx.fillRect(xPos - totalWidth/2 - 4, totalY - 22, totalWidth + 8, 18);
    ctx.fillStyle = "#ffb3ba";
    ctx.textAlign = "center";
    ctx.fillText(totalText, xPos, totalY - 8);
  });

  const lastData = data.at(-1)!;
  const lastYear = lastData.year;
  const yRenew = y(lastData.Renovable);
  const yTotal = y(lastData.Renovable + lastData.Fósil);

  const renewFinalText = d3.format(".3s")(lastData.Renovable).replace("G", "B");
  const totalFinalText = d3.format(".3s")(lastData.Renovable + lastData.Fósil).replace("G", "B");

  ctx.font = "bold 18px ui-sans-serif, system-ui";
  const renewFinalWidth = ctx.measureText(renewFinalText).width;
  const totalFinalWidth = ctx.measureText(totalFinalText).width;

  ctx.fillStyle = "rgba(26, 26, 46, 0.9)";
  ctx.fillRect(x(lastYear) + 8, yRenew - 24, renewFinalWidth + 12, 22);
  ctx.fillStyle = "#bae1a4";
  ctx.textAlign = "left";
  ctx.fillText(renewFinalText, x(lastYear) + 14, yRenew - 6);

  ctx.fillStyle = "rgba(26, 26, 46, 0.9)";
  ctx.fillRect(x(lastYear) + 8, yTotal - 24, totalFinalWidth + 12, 22);
  ctx.fillStyle = "#ffb3ba";
  ctx.fillText(totalFinalText, x(lastYear) + 14, yTotal - 6);

  legendDots(ctx, [
    { color: RENEWABLE_COLOR, label: "Renovable" },
    { color: FOSSIL_COLOR, label: "Fósil" }
  ]);

  savePNG(canvas, "idiom-1_stacked_area_energy_mix.png");
}
