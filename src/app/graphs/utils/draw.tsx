"use server";

import fs from "fs";
import path from "path";
import { createCanvas, Canvas, CanvasRenderingContext2D } from "canvas";
import * as d3 from "d3";
import { BG, INK, GRID, STROKE } from "./palette";

export const W = 1400;
export const H = 900;
const OUT_DIR = path.resolve("public", "img");

export function makeCanvas(): { canvas: Canvas; ctx: CanvasRenderingContext2D } {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  return { canvas, ctx };
}

export function savePNG(canvas: Canvas, filename: string) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, filename), canvas.toBuffer("image/png"));
}

export function title(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = INK;
  ctx.font = "bold 34px ui-sans-serif, system-ui";
  ctx.fillText(text, 40, 58);
}

export function subtitle(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = "rgba(238,242,255,0.85)";
  ctx.font = "16px ui-sans-serif, system-ui";
  ctx.fillText(text, 40, 88);
}

export function caption(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = "rgba(238,242,255,0.75)";
  ctx.font = "13px ui-sans-serif, system-ui";
  ctx.fillText(text, 40, H - 12);
}

export function axes(
  ctx: CanvasRenderingContext2D,
  x: d3.ScaleLinear<number, number>,
  y: d3.ScaleLinear<number, number>,
  xTicks = 6,
  yTicks = 6,
  xFmt: (n: number) => string = (n) => String(n),
  yFmt: (n: number) => string = (n) => String(n)
) {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, H - 110);
  ctx.lineTo(W - 60, H - 110);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(90, 120);
  ctx.lineTo(90, H - 110);
  ctx.stroke();

  const yt = y.ticks(yTicks);
  yt.forEach((t) => {
    const yy = y(t);
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    ctx.moveTo(90, yy);
    ctx.lineTo(W - 60, yy);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText(yFmt(t), 48, yy + 4);
  });

  const xt = x.ticks(xTicks);
  xt.forEach((t) => {
    const xx = x(t);
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    ctx.moveTo(xx, H - 110);
    ctx.lineTo(xx, H - 116);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText(xFmt(t), xx - 14, H - 80);
  });
}

export function axisLabelX(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = INK;
  ctx.font = "14px ui-sans-serif, system-ui";
  ctx.fillText(text, W / 2 - ctx.measureText(text).width / 2, H - 52);
}

export function axisLabelY(ctx: CanvasRenderingContext2D, text: string) {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = "14px ui-sans-serif, system-ui";
  ctx.translate(36, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
  ctx.restore();
}

export function legendDots(
  ctx: CanvasRenderingContext2D,
  items: { color: string; label: string }[],
  x0 = W - 280,
  y0 = 140
) {
  items.forEach((it, i) => {
    ctx.beginPath();
    ctx.fillStyle = it.color;
    ctx.arc(x0, y0 + i * 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = "13px ui-sans-serif, system-ui";
    ctx.fillText(it.label, x0 + 16, y0 + 5 + i * 26);
  });
}

export function endLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.fillStyle = color;
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(text, x + 8, y + 4);
}

export { STROKE };
