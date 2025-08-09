"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

/* ==================== Tipos ==================== */
type Region = { region: string; sales: number; profit: number };
type TemporalPoint = { month: string; sales: number; profit: number };
type Category = { category: string; sales: number; percentage: number };
type Segment = { segment: string; sales: number };
type ReturnsInfo = {
  totalOrders: number;
  returnedOrders: number;
  returnRate: number;
  lostRevenue: number;
};
type KPIs = {
  totalSales: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
};
type DashboardData = {
  regions: Region[];
  temporal: TemporalPoint[];
  categories: Category[];
  segments: Segment[];
  returns: ReturnsInfo;
  kpis: KPIs;
};

type OrderRow = {
  "Order ID": string;
  "Order Date": Date;
  "Ship Date": Date;
  Sales: number;
  Profit: number;
  "Order Quantity": number;
  Discount: number;
  "Unit Price": number;
  "Shipping Cost": number;
  "Product Base Margin": number;
  Region: string;
  "Product Category": string;
  "Customer Segment": string;
};

const fmtK = (d: d3.NumberValue) => `$${Number(d) / 1000}K`;

/* ==================== Página ==================== */
const SuperstoreDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga CSV con separador ';'
  useEffect(() => {
    const loadData = async () => {
      try {
        const parseSemicolonCSV = (csvText: string) => {
          const lines = csvText.trim().split("\n");
          const headers = lines[0].split(";");
          return lines.slice(1).map((line) => {
            const values = line.split(";");
            const obj: Record<string, string> = {};
            headers.forEach((header, index) => {
              obj[header.trim()] = values[index] ? values[index].trim() : "";
            });
            return obj;
          });
        };

        const parseNumber = (str?: string) => {
          if (!str) return 0;
          const cleaned = str.replace(",", ".");
          const n = parseFloat(cleaned);
          return Number.isFinite(n) ? n : 0;
        };

        const [ordersText, returnsText, usersText] = await Promise.all([
          d3.text("/data/orders.csv"),
          d3.text("/data/returns.csv"),
          d3.text("/data/users.csv"),
        ]);

        const ordersRaw = parseSemicolonCSV(ordersText ?? "");
        const returnsRaw = parseSemicolonCSV(returnsText ?? "");
        // usersRaw se carga pero no se usa ahora
        void usersText;

        const orders: OrderRow[] = ordersRaw
          .map((d) => ({
            "Order ID": d["Order ID"] ?? "",
            "Order Date": new Date(d["Order Date"]),
            "Ship Date": new Date(d["Ship Date"]),
            Sales: parseNumber(d["Sales"]),
            Profit: parseNumber(d["Profit"]),
            "Order Quantity": parseInt(d["Order Quantity"] ?? "0", 10) || 0,
            Discount: parseNumber(d["Discount"]),
            "Unit Price": parseNumber(d["Unit Price"]),
            "Shipping Cost": parseNumber(d["Shipping Cost"]),
            "Product Base Margin": parseNumber(d["Product Base Margin"]),
            Region: d["Region"] ?? "",
            "Product Category": d["Product Category"] ?? "",
            "Customer Segment": d["Customer Segment"] ?? "",
          }))
          .filter((d) => Number.isFinite(d.Sales) && Number.isFinite(d.Profit));

        // Regiones
        const regionMap = d3.group(orders, (d) => d.Region);
        const regions: Region[] = Array.from(regionMap, ([region, arr]) => ({
          region,
          sales: d3.sum(arr, (r) => r.Sales),
          profit: d3.sum(arr, (r) => r.Profit),
        })).filter((r) => r.region);

        // Temporal (mensual)
        const monthly = d3.rollup(
          orders.filter((d) => d["Order Date"] && !Number.isNaN(+d["Order Date"])),
          (v) => ({
            sales: d3.sum(v, (r) => r.Sales),
            profit: d3.sum(v, (r) => r.Profit),
          }),
          (d) => d3.timeFormat("%Y-%m")(d["Order Date"])
        );
        const temporal: TemporalPoint[] = Array.from(monthly, ([month, v]) => ({
          month,
          sales: v.sales,
          profit: v.profit,
        })).sort((a, b) => a.month.localeCompare(b.month));

        // Categorías
        const catMap = d3.group(orders, (d) => d["Product Category"]);
        const totalSales = d3.sum(orders, (r) => r.Sales);
        const categories: Category[] = Array.from(catMap, ([category, arr]) => {
          const sales = d3.sum(arr, (r) => r.Sales);
          return {
            category,
            sales,
            percentage: (sales / (totalSales || 1)) * 100,
          };
        }).filter((c) => c.category);

        // Segmentos
        const segMap = d3.group(orders, (d) => d["Customer Segment"]);
        const segments: Segment[] = Array.from(segMap, ([segment, arr]) => ({
          segment,
          sales: d3.sum(arr, (r) => r.Sales),
        })).filter((s) => s.segment);

        // Devoluciones
        const totalOrders = new Set(orders.map((d) => d["Order ID"])).size;
        const returnedOrders = returnsRaw.filter((d) => d.Status === "Returned").length;
        const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

        const returnedIds = new Set(
          returnsRaw.filter((d) => d.Status === "Returned").map((d) => d["Order ID"])
        );
        const lostRevenue = d3.sum(
          orders.filter((o) => returnedIds.has(o["Order ID"])),
          (o) => o.Sales
        );

        const returns: ReturnsInfo = {
          totalOrders,
          returnedOrders,
          returnRate: +returnRate.toFixed(2),
          lostRevenue,
        };

        // KPIs
        const totalSalesKPI = d3.sum(orders, (r) => r.Sales);
        const totalProfitKPI = d3.sum(orders, (r) => r.Profit);
        const profitMargin = totalSalesKPI > 0 ? (totalProfitKPI / totalSalesKPI) * 100 : 0;

        setData({
          regions,
          temporal,
          categories,
          segments,
          returns,
          kpis: {
            totalSales: totalSalesKPI,
            totalProfit: totalProfitKPI,
            profitMargin,
            totalOrders,
          },
        });
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading data...</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-xl text-red-600">
          Error loading data. Please check if CSV files are available.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Superstore Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive business performance analysis and insights</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Sales"
            value={`$${(data.kpis.totalSales / 1_000_000).toFixed(2)}M`}
            change="+12.5%"
            positive
          />
          <KPICard
            title="Total Profit"
            value={`$${(data.kpis.totalProfit / 1000).toFixed(0)}K`}
            change="+8.3%"
            positive
          />
          <KPICard
            title="Profit Margin"
            value={`${data.kpis.profitMargin.toFixed(2)}%`}
            change="+1.2%"
            positive
          />
          <KPICard
            title="Orders"
            value={data.kpis.totalOrders.toLocaleString()}
            change="+15.7%"
            positive
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard
            title="Regional Performance Analysis"
            description="Compares sales and profit across regions. Analysis shows regional distribution of sales and profitability."
          >
            <RegionalBarChart data={data.regions} />
          </ChartCard>

          <ChartCard
            title="Returns Impact Analysis"
            description={`Returns affect ${data.returns.returnRate}% of orders, causing $${(
              data.returns.lostRevenue / 1000
            ).toFixed(1)}K revenue loss.`}
          >
            <ReturnsImpactChart data={data.returns} />
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard
              title="Sales & Profit Trends Over Time"
              description="Shows business performance trends and seasonal patterns over time."
            >
              <TemporalLineChart data={data.temporal} />
            </ChartCard>
          </div>

          <ChartCard
            title="Product Category Distribution"
            description="Revenue distribution by product type showing market preferences."
          >
            <CategoryPieChart data={data.categories} />
          </ChartCard>

          <ChartCard
            title="Customer Segment Performance"
            description="Sales distribution across customer segments showing market composition."
          >
            <SegmentBarChart data={data.segments} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

/* ==================== UI helpers ==================== */
const KPICard: React.FC<{
  title: string;
  value: string;
  change: string;
  positive?: boolean;
}> = ({ title, value, change, positive }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className={`text-sm font-medium ${positive ? "text-green-600" : "text-red-600"}`}>{change}</div>
    </div>
  </div>
);

const ChartCard: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <div className="flex justify-center">{children}</div>
  </div>
);

/* ==================== Charts ==================== */
const RegionalBarChart: React.FC<{ data: Region[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand().domain(data.map((d) => d.region)).rangeRound([0, width]).paddingInner(0.3);

    const x1 = d3.scaleBand().domain(["sales", "profit"]).rangeRound([0, x0.bandwidth()]).padding(0.1);

    const maxSales = d3.max(data, (d) => d.sales) ?? 0;
    const maxProfit = d3.max(data, (d) => d.profit) ?? 1;
    const profitScale = (maxSales / maxProfit) * 0.3;

    const y = d3.scaleLinear().domain([0, maxSales * 1.1]).range([height, 0]);

    const colors = { sales: "#3B82F6", profit: "#EF4444" };

    const regionGroups = g
      .selectAll<SVGGElement, Region>(".region-group")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "region-group")
      .attr("transform", (d) => `translate(${x0(d.region)},0)`);

    regionGroups
      .append("rect")
      .attr("x", x1("sales")!)
      .attr("y", (d) => y(d.sales))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => height - y(d.sales))
      .attr("fill", colors.sales)
      .attr("opacity", 0.8);

    regionGroups
      .append("rect")
      .attr("x", x1("profit")!)
      .attr("y", (d) => y(d.profit * profitScale))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => height - y(d.profit * profitScale))
      .attr("fill", colors.profit)
      .attr("opacity", 0.8);

    regionGroups
      .append("text")
      .attr("x", x1("sales")! + x1.bandwidth() / 2)
      .attr("y", (d) => y(d.sales) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", "#374151")
      .text((d) => `$${(d.sales / 1000).toFixed(0)}K`);

    regionGroups
      .append("text")
      .attr("x", x1("profit")! + x1.bandwidth() / 2)
      .attr("y", (d) => y(d.profit * profitScale) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", "#374151")
      .text((d) => `$${(d.profit / 1000).toFixed(0)}K`);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .attr("fill", "#374151")
      .attr("font-size", 12)
      .attr("font-weight", 500);

    g.append("g")
      .call(d3.axisLeft(y).tickFormat(fmtK as any)) // d3 types accept a union; cast callback only
      .selectAll("text")
      .attr("fill", "#374151")
      .attr("font-size", 11);

    const legend = g.append("g").attr("transform", `translate(${width - 100}, 20)`);
    const legendData = [
      { label: "Sales", color: colors.sales },
      { label: "Profit", color: colors.profit },
    ];
    const legendItems = legend
      .selectAll<SVGGElement, { label: string; color: string }>(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect").attr("width", 12).attr("height", 12).attr("fill", (d) => d.color).attr("opacity", 0.8);
    legendItems.append("text").attr("x", 16).attr("y", 9).attr("font-size", 11).attr("fill", "#374151").text((d) => d.label);
  }, [data]);

  return <svg ref={svgRef} width={600} height={300} className="max-w-full h-auto" />;
};

const TemporalLineChart: React.FC<{ data: TemporalPoint[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  type Tooltip = { show: boolean; x: number; y: number; data: (TemporalPoint & { date: Date }) | null };
  const [tooltip, setTooltip] = useState<Tooltip>({ show: false, x: 0, y: 0, data: null });

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 60, left: 80 };
    const width = Math.max(1200, data.length * 30) - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    svg.attr("width", width + margin.left + margin.right);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m")!;
    type TD = TemporalPoint & { date: Date };
    const processed: TD[] = data
      .map((d) => ({ ...d, date: parseDate(d.month)! }))
      .filter((d): d is TD => Boolean(d.date));

    if (!processed.length) return;

    const x = d3.scaleTime().domain(d3.extent(processed, (d) => d.date) as [Date, Date]).range([0, width]);
    const y = d3.scaleLinear().domain([0, (d3.max(processed, (d) => d.sales) ?? 0) * 1.1]).range([height, 0]);

    const salesLine = d3
      .line<TD>()
      .x((d) => x(d.date))
      .y((d) => y(d.sales))
      .curve(d3.curveMonotoneX);

    const profitLine = d3
      .line<TD>()
      .x((d) => x(d.date))
      .y((d) => y(d.profit))
      .curve(d3.curveMonotoneX);

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "salesGradient").attr("x1", 0).attr("y1", height).attr("x2", 0).attr("y2", 0);
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#3B82F6").attr("stop-opacity", 0.1);
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#3B82F6").attr("stop-opacity", 0.3);

    const area = d3
      .area<TD>()
      .x((d) => x(d.date))
      .y0(height)
      .y1((d) => y(d.sales))
      .curve(d3.curveMonotoneX);

    const areaD = area(processed) ?? undefined;
    g.append("path").attr("fill", "url(#salesGradient)").attr("d", areaD);

    const salesD = salesLine(processed) ?? undefined;
    g.append("path").attr("fill", "none").attr("stroke", "#3B82F6").attr("stroke-width", 3).attr("d", salesD);

    const profitD = profitLine(processed) ?? undefined;
    g.append("path").attr("fill", "none").attr("stroke", "#EF4444").attr("stroke-width", 2).attr("stroke-dasharray", "5,5").attr("d", profitD);

    g
      .selectAll("circle.sales")
      .data(processed)
      .enter()
      .append("circle")
      .attr("class", "sales")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.sales))
      .attr("r", 4)
      .attr("fill", "#3B82F6")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    g
      .selectAll("circle.profit")
      .data(processed)
      .enter()
      .append("circle")
      .attr("class", "profit")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.profit))
      .attr("r", 3)
      .attr("fill", "#EF4444")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y") as any).ticks(Math.min(processed.length, 12)))
      .selectAll("text")
      .attr("fill", "#374151")
      .attr("font-size", 10)
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    g.append("g")
      .call(d3.axisLeft(y).tickFormat(fmtK as any))
      .selectAll("text")
      .attr("fill", "#374151")
      .attr("font-size", 11);

    // overlay tooltip
    g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const x0 = x.invert(mx);
        const i = d3.bisector((d: TD) => d.date).left(processed, x0, 1);
        const d0 = processed[i - 1];
        const d1 = processed[i];
        const d = !d0 ? d1 : !d1 ? d0 : x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;
        if (d) {
          const me = event as MouseEvent;
          setTooltip({ show: true, x: me.clientX + 10, y: me.clientY - 10, data: d });
        }
      })
      .on("mouseout", () => setTooltip({ show: false, x: 0, y: 0, data: null }));
  }, [data]);

  return (
    <div className="w-full overflow-x-auto relative">
      <svg ref={svgRef} height={300} className="min-w-full h-auto" />
      {tooltip.show && tooltip.data && (
        <div
          className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold">{tooltip.data.month}</div>
          <div className="text-blue-300">Sales: ${(tooltip.data.sales / 1000).toFixed(1)}K</div>
          <div className="text-red-300">Profit: ${(tooltip.data.profit / 1000).toFixed(1)}K</div>
          <div className="text-gray-300">
            Margin: {((tooltip.data.profit / tooltip.data.sales) * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryPieChart: React.FC<{ data: Category[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 60;

    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3
      .scaleOrdinal<string>()
      .domain(data.map((d) => d.category))
      .range(["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"]);

    const pie = d3.pie<Category>().value((d) => d.sales).sort(null);

    const arc = d3.arc<d3.PieArcDatum<Category>>().innerRadius(radius * 0.5).outerRadius(radius);

    const arcs = g.selectAll<SVGGElement, d3.PieArcDatum<Category>>(".arc").data(pie(data)).enter().append("g").attr("class", "arc");

    arcs
      .append("path")
      .attr("d", (d) => arc(d) ?? undefined)
      .attr("fill", (d) => color(d.data.category)!)
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .attr("opacity", 0.9);

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${(arc.centroid(d) as [number, number]).join(",")})`)
      .attr("dy", "-0.5em")
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "white")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.8)")
      .text((d) => d.data.category);

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${(arc.centroid(d) as [number, number]).join(",")})`)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("fill", "white")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.8)")
      .text((d) => `${d.data.percentage.toFixed(1)}%`);
  }, [data]);

  return <svg ref={svgRef} width={600} height={300} className="max-w-full h-auto" />;
};

const SegmentBarChart: React.FC<{ data: Segment[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data.length) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 80, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const sorted = [...data].sort((a, b) => b.sales - a.sales);

    const x = d3.scaleBand().domain(sorted.map((d) => d.segment)).range([0, width]).padding(0.2);

    const y = d3.scaleLinear().domain([0, (d3.max(sorted, (d) => d.sales) ?? 0) * 1.1]).range([height, 0]);

    const colors = ["#8B5CF6", "#06B6D4", "#F59E0B", "#EC4899"];

    g
      .selectAll<SVGRectElement, Segment>(".bar")
      .data(sorted)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.segment)!)
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(d.sales))
      .attr("height", (d) => height - y(d.sales))
      .attr("fill", (_d, i) => colors[i % colors.length])
      .attr("opacity", 0.8);

    g
      .selectAll<SVGTextElement, Segment>(".label")
      .data(sorted)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.segment)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.sales) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "#374151")
      .text((d) => `$${(d.sales / 1000).toFixed(0)}K`);

    const xAxis = g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    xAxis
      .selectAll("text")
      .attr("fill", "#374151")
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-20)");

    g
      .append("g")
      .call(d3.axisLeft(y).tickFormat(fmtK as any))
      .selectAll("text")
      .attr("fill", "#374151")
      .attr("font-size", 11);
  }, [data]);

  return <svg ref={svgRef} width={600} height={300} className="max-w-full h-auto" />;
};

const ReturnsImpactChart: React.FC<{ data: ReturnsInfo }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 40, bottom: 40, left: 40 };

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const radius = Math.min(chartWidth, chartHeight) / 4;
    const donutG = g.append("g").attr("transform", `translate(${radius + 20}, ${chartHeight / 2})`);

    type Slice = { label: string; value: number; color: string };
    const pie = d3.pie<Slice>().value((d) => d.value);
    const arc = d3.arc<d3.PieArcDatum<Slice>>().innerRadius(radius * 0.6).outerRadius(radius);

    const returnData: Slice[] = [
      { label: "Returned", value: data.returnRate, color: "#EF4444" },
      { label: "Successful", value: 100 - data.returnRate, color: "#10B981" },
    ];

    const arcs = donutG.selectAll<SVGGElement, d3.PieArcDatum<Slice>>(".arc").data(pie(returnData)).enter().append("g").attr("class", "arc");
    arcs.append("path").attr("d", (d) => arc(d) ?? undefined).attr("fill", (d) => d.data.color).attr("opacity", 0.8);

    donutG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.5em")
      .attr("font-size", 18)
      .attr("font-weight", 700)
      .attr("fill", "#EF4444")
      .text(`${data.returnRate}%`);
    donutG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .attr("font-size", 12)
      .attr("fill", "#6B7280")
      .text("Return Rate");

    const metricsG = g.append("g").attr("transform", `translate(${radius * 2 + 60}, 30)`);
    const impactPercentage =
      data.lostRevenue > 0 && data.totalOrders > 0 ? (((data.lostRevenue as number) / (data.lostRevenue * 10)) * 100).toFixed(1) : "0.0";

    const metrics = [
      { label: "Total Orders", value: data.totalOrders.toLocaleString(), color: "#3B82F6" },
      { label: "Returned Orders", value: data.returnedOrders.toLocaleString(), color: "#EF4444" },
      { label: "Lost Revenue", value: `${(data.lostRevenue / 1000).toFixed(1)}K`, color: "#F59E0B" },
      { label: "Impact on Profit", value: `${impactPercentage}%`, color: "#8B5CF6" },
    ];

    const metric = metricsG
      .selectAll<SVGGElement, { label: string; value: string; color: string }>(".metric")
      .data(metrics)
      .enter()
      .append("g")
      .attr("class", "metric")
      .attr("transform", (_d, i) => `translate(0, ${i * 45})`);

    metric.append("rect").attr("width", 4).attr("height", 30).attr("fill", (d) => d.color);
    metric.append("text").attr("x", 12).attr("y", 12).attr("font-size", 11).attr("fill", "#6B7280").text((d) => d.label);
    metric.append("text").attr("x", 12).attr("y", 26).attr("font-size", 16).attr("font-weight", 700).attr("fill", "#374151").text((d) => d.value);
  }, [data]);

  return <svg ref={svgRef} width={600} height={300} className="max-w-full h-auto" />;
};

export default SuperstoreDashboard;
