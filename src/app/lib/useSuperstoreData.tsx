"use client";
import * as d3 from "d3";
import { useEffect, useState } from "react";

// Parser con punto y coma
const parseDSV = d3.dsvFormat(";");

function toNumberLocale(v: any): number {
  if (v == null) return 0;
  let s = String(v).trim().replace(/\s/g, "");
  if (!s) return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && !hasDot) {
    s = s.replace(",", ".");
  } else if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function useSuperstoreData() {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [ordersText, returnsText, usersText] = await Promise.all([
          fetch("/data/orders.csv").then((r) => r.text()),
          fetch("/data/returns.csv").then((r) => r.text()),
          fetch("/data/users.csv").then((r) => r.text()),
        ]);

        const returnedSet = new Set(
          parseDSV.parse(returnsText)
            .map((r) => r["Order ID"]?.toString().trim())
            .filter(Boolean)
        );

        const regionManager = new Map<string, string>();
        parseDSV.parse(usersText).forEach((u) => {
          const region = u["Region"]?.toString().trim();
          const manager = u["Manager"]?.toString().trim();
          if (region) regionManager.set(region, manager);
        });

        const parsedOrders = parseDSV.parse(ordersText, (r) => {
          const orderId = r["Order ID"]?.toString().trim();
          const orderDate = new Date(r["Order Date"]);
          const shipDate = new Date(r["Ship Date"]);

          return {
            orderId,
            orderDate,
            shipDate,
            leadTime: (shipDate.getTime() - orderDate.getTime()) / 86400000,
            sales: toNumberLocale(r["Sales"]),
            profit: toNumberLocale(r["Profit"]),
            discount: toNumberLocale(r["Discount"]),
            quantity: toNumberLocale(r["Order Quantity"]),
            region: r["Region"],
            category: r["Product Category"],
            subCategory: r["Product Sub-Category"],
            shipMode: r["Ship Mode"],
            priority: r["Order Priority"],
            returned: returnedSet.has(orderId),
            manager: regionManager.get(r["Region"]),
          };
        });

        if (!alive) return;
        setOrders(parsedOrders);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e.message || "Error cargando los datos.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  return { orders, loading, error };
}
