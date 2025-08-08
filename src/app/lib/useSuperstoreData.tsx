"use client";
import * as d3 from "d3";
import { useEffect, useMemo, useState } from "react";

export type OrderRow = {
  orderId: string;
  orderDate: Date;
  shipDate: Date | null;
  sales: number;
  profit: number;
  discount: number;
  quantity: number;
  region: string;
  category: string;
  subCategory: string;
  shipMode: string;
  priority: string;
  returned: boolean;
  manager?: string;
  leadTimeDays?: number;
  margin?: number;
};

export type MonthDatum = {
  date: Date;
  Sales: number;
  Profit: number;
  byCategory: Record<string, number>;
};

const parseMDY = d3.timeParse("%m/%d/%Y");
const parseMDY2 = d3.timeParse("%m/%d/%y");

function parseDateFlexible(v: string): Date | null {
  if (!v) return null;
  // 1) ISO o parse nativo
  const nat = new Date(v);
  if (!Number.isNaN(+nat)) return nat;
  // 2) m/d/Y o m/d/y
  return parseMDY(v) ?? parseMDY2(v) ?? null;
}

export function useSuperstoreData() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true);
        const [ordersTxt, returnsTxt, usersTxt] = await Promise.all([
          fetch("/data/orders.csv").then((r) => r.text()),
          fetch("/data/returns.csv").then((r) => r.text()),
          fetch("/data/users.csv").then((r) => r.text()),
        ]);

        // Parse Returns a set de Order IDs devueltos
        const returnedSet = new Set(
          d3
            .csvParse(returnsTxt)
            .map((r) => (r["Order ID"] ?? r["OrderID"] ?? r["order_id"] ?? "").toString().trim())
            .filter(Boolean)
        );

        // Parse Users a mapa region->manager
        const regionManager = new Map<string, string>();
        d3.csvParse(usersTxt).forEach((u) => {
          const region =
            (u["Region"] ?? u["region"] ?? "").toString().trim();
          const manager =
            (u["Manager"] ?? u["manager"] ?? "").toString().trim();
          if (region) regionManager.set(region, manager);
        });

        // Parse Orders con casting
        const parsedOrders: OrderRow[] = d3.csvParse(ordersTxt, (r) => {
          const orderId =
            (r["Order ID"] ?? r["OrderID"] ?? r["order_id"] ?? "").toString().trim();
          const orderDate = parseDateFlexible((r["Order Date"] ?? r["order_date"] ?? "").toString());
          const shipDate = parseDateFlexible((r["Ship Date"] ?? r["ship_date"] ?? "").toString());

          const sales = +((r["Sales"] ?? r["sales"] ?? "0").toString().replace(/,/g, ""));
          const profit = +((r["Profit"] ?? r["profit"] ?? "0").toString().replace(/,/g, ""));
          const discount = +(r["Discount"] ?? r["discount"] ?? 0);
          const quantity = +(r["Order Quantity"] ?? r["Quantity"] ?? r["order_quantity"] ?? r["quantity"] ?? 0);

          const region = (r["Region"] ?? r["region"] ?? "").toString().trim();
          const category = (r["Product Category"] ?? r["Category"] ?? r["category"] ?? "").toString().trim();
          const subCategory = (r["Product Sub-Category"] ?? r["Sub-Category"] ?? r["subcategory"] ?? "").toString().trim();
          const shipMode = (r["Ship Mode"] ?? r["ship_mode"] ?? "").toString().trim();
          const priority = (r["Order Priority"] ?? r["priority"] ?? "").toString().trim();

          const returned = returnedSet.has(orderId);
          const manager = regionManager.get(region);

          const leadTimeDays =
            orderDate && shipDate ? Math.round((+shipDate - +orderDate) / 86400000) : undefined;
          const margin = sales !== 0 ? profit / sales : undefined;

          return {
            orderId,
            orderDate: orderDate ?? new Date(NaN),
            shipDate,
            sales,
            profit,
            discount,
            quantity,
            region,
            category,
            subCategory,
            shipMode,
            priority,
            returned,
            manager,
            leadTimeDays,
            margin,
          };
        });

        if (!alive) return;
        setOrders(parsedOrders.filter((d) => !Number.isNaN(+d.orderDate)));
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Error cargando CSV");
        setOrders(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  // --------- Agregados para el dashboard ---------
  const timeSeries: MonthDatum[] = useMemo(() => {
    if (!orders) return [];
    // Agrupar por mes (YYYY-MM)
    const byMonth = d3.rollup(
      orders,
      (rows) => {
        const sales = d3.sum(rows, (r) => r.sales);
        const profit = d3.sum(rows, (r) => r.profit);
        const byCategory = d3.rollup(
          rows,
          (rr) => d3.sum(rr, (t) => t.sales),
          (r) => r.category || "Unknown"
        );
        return { sales, profit, byCategory: Object.fromEntries(byCategory) as Record<string, number> };
      },
      (r) => d3.utcMonth(r.orderDate).toISOString().slice(0, 7) // YYYY-MM
    );

    const months = Array.from(byMonth.keys()).sort();
    return months.map((ym) => {
      const d = new Date(ym + "-01T00:00:00Z");
      const rec = byMonth.get(ym)!;
      return {
        date: d,
        Sales: rec.sales,
        Profit: rec.profit,
        byCategory: rec.byCategory,
      };
    });
  }, [orders]);

  const regions = useMemo(() => {
    if (!orders) return [];
    const byRegion = d3.rollup(
      orders,
      (rows) => {
        const sales = d3.sum(rows, (r) => r.sales);
        const profit = d3.sum(rows, (r) => r.profit);
        const margin = sales ? profit / sales : 0;
        return { sales, margin };
      },
      (r) => r.region || "Unknown"
    );
    return Array.from(byRegion, ([region, v]) => ({ region, sales: v.sales, margin: v.margin }))
      .sort((a, b) => d3.descending(a.sales, b.sales));
  }, [orders]);

  const discountProfitPoints = useMemo(() => {
    if (!orders) return [];
    // Muestra hasta 1500 puntos para no reventar el render
    const sample = orders.length > 1500 ? d3.shuffle([...orders]).slice(0, 1500) : orders;
    return sample.map((o) => ({
      discount: o.discount,
      margin: o.margin ?? 0,
      qty: o.quantity,
      category: o.category || "Unknown",
      returned: o.returned,
    }));
  }, [orders]);

  const totals = useMemo(() => {
    if (!orders) return { sales: 0, profit: 0, margin: 0, returnRate: 0 };
    const sales = d3.sum(orders, (d) => d.sales);
    const profit = d3.sum(orders, (d) => d.profit);
    const margin = sales ? profit / sales : 0;
    const returnRate = d3.mean(
      d3.groups(orders, (d) => d.orderId).map(([_, rows]) => rows.some((r) => r.returned) ? 1 : 0)
    ) || 0; // tasa a nivel pedido
    return { sales, profit, margin, returnRate };
  }, [orders]);

  return {
    loading,
    error,
    orders,
    timeSeries,
    regions,
    discountProfitPoints,
    totals,
  };
}
