"use client";
import { useEffect, useRef } from "react";

export default function useTooltip() {
  const tipRef = useRef<HTMLDivElement | null>(null);
  const boundRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const t = document.createElement("div");
    t.style.position = "fixed";
    t.style.pointerEvents = "none";
    t.style.background = "rgba(11,16,34,.95)";
    t.style.border = "1px solid rgba(167,199,231,.3)";
    t.style.padding = "8px 10px";
    t.style.borderRadius = "8px";
    t.style.fontSize = "12px";
    t.style.color = "#e2e8f0";
    t.style.zIndex = "1000";
    t.style.opacity = "0";
    document.body.appendChild(t);
    tipRef.current = t;
    return () => {
      document.body.removeChild(t);
      tipRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const b = boundRef.current;
      const t = tipRef.current;
      if (!b || !t) return;
      const r = b.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) t.style.opacity = "0";
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  const bindAutoHide = (el: HTMLElement | null) => {
    if (boundRef.current) {
      boundRef.current.removeEventListener("mouseleave", hideImmediate);
      boundRef.current.removeEventListener("touchend", hideImmediate as any);
    }
    boundRef.current = el;
    if (el) {
      el.addEventListener("mouseleave", hideImmediate);
      el.addEventListener("touchend", hideImmediate as any, { passive: true });
    }
  };

  const show = (x: number, y: number, html: string) => {
    const t = tipRef.current;
    if (!t) return;
    t.style.left = x + 12 + "px";
    t.style.top = y + 12 + "px";
    t.style.opacity = "1";
    t.innerHTML = html;
  };

  const hideImmediate = () => {
    const t = tipRef.current;
    if (t) t.style.opacity = "0";
  };

  return { show, hide: hideImmediate, bindAutoHide };
}
