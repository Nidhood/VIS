"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

/* -------------------- Tipos -------------------- */
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

/* -------------------- Página -------------------- */
const SuperstoreDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // parser de CSV con ';'
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

        // números con coma decimal -> número JS
        const parseNumber = (str?: string) => {
          if (!str) return 0;
          const cleaned = str.replace(",", ".");
          const n = parseFloat(cleaned);
          return Number.isFinite(n) ? n : 0;
        };

        // carga como texto (manteniendo ';')
        const [ordersText, returnsText, usersText] = await Promise.all([
          d3.text("/data/orders.csv"),
          d3.text("/data/returns.csv"),
          d3.text("/data/users.csv"),
        ]);

        const ordersData = parseSemicolonCSV(ordersText ?? "");
        const returnsData = parseSemicolonCSV(returnsText ?? "");
        const usersData = parseSemicolonCSV(usersText ?? ""); // (no usado, pero se carga)

        // Orders normalizado
        const orders = ordersData
          .map((d) => ({
            ...d,
            "Order Date": new Date(d["Order Date"]),
            "Ship Date": new Date(d["Ship Date"]),
            Sales: parseNumber(d["Sales"]),
            Profit: parseNumber(d["Profit"]),
            "Order Quantity": parseInt(d["Order Quantity"] ?? "0") || 0,
            Discount: parseNumber(d["Discount"]),
            "Unit Price": parseNumber(d["Unit Price"]),
            "Shipping Cost": parseNumber(d["Shipping Cost"]),
            "Product Base Margin": parseNumber(d["Product Base Margin"]),
          }))
          .filter((d) => Number.isFinite(d.Sales) && Number.isFinite(d.Profit));

        // Regiones
        const regionData = d3.group(orders, (d) => d.Region as string);
        const regions: Region[] = Array.from(regionData, ([region, orders]) => ({
          region,
          sales: d3.sum(orders, (d: any) => d.Sales as number),
          profit: d3.sum(orders, (d: any) => d.Profit as number),
        })).filter((d) => d.region && d.region !== "");

        // Temporal mensual
        const monthlyData = d3.rollup(
          orders.filter((d) => d["Order Date"] && !isNaN(+d["Order Date"])),
          (v) => ({
            sales: d3.sum(v, (d: any) => d.Sales as number),
            profit: d3.sum(v, (d: any) => d.Profit as number),
          }),
          (d) => d3.timeFormat("%Y-%m")(d["Order Date"] as Date)
        );

        const temporal: TemporalPoint[] = Array.from(monthlyData, ([month, values]) => ({
          month,
          sales: values.sales,
          profit: values.profit,
        })).sort((a, b) => a.month.localeCompare(b.month));

        // Categorías
        const categoryData = d3.group(orders, (d) => d["Product Category"] as string);
        const totalSales = d3.sum(orders, (d: any) => d.Sales as number);
        const categories: Category[] = Array.from(categoryData, ([category, orders]) => {
          const sales = d3.sum(orders, (d: any) => d.Sales as number);
          return {
            category,
            sales,
            percentage: (sales / (totalSales || 1)) * 100,
          };
        }).filter((d) => d.category && d.category !== "");

        // Segmentos
        const segmentData = d3.group(orders, (d) => d["Customer Segment"] as string);
        const segments: Segment[] = Array.from(segmentData, ([segment, orders]) => ({
          segment,
          sales: d3.sum(orders, (d: any) => d.Sales as number),
        })).filter((d) => d.segment && d.segment !== "");

        // Devoluciones
        const totalOrders = new Set(orders.map((d: any) => d["Order ID"])).size;
        const returnedOrders = returnsData.filter((d) => d.Status === "Returned").length;
        const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

        const returnedOrderIds = new Set(
          returnsData.filter((d) => d.Status === "Returned").map((d) => d["Order ID"])
        );
        const lostRevenue = d3.sum(
          orders.filter((d: any) => returnedOrderIds.has(d["Order ID"])),
          (d: any) => d.Sales as number
        );

        const returns: ReturnsInfo = {
          totalOrders,
          returnedOrders,
          returnRate: +returnRate.toFixed(2),
          lostRevenue,
        };

        // KPIs
        const totalSalesKPI = d3.sum(orders, (d: any) => d.Sales as number);
        const totalProfitKPI = d3.sum(orders, (d: any) => d.Profit as number);
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

        {/* Main Charts Grid */}
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

/* -------------------- UI helpers -------------------- */
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
      <div className={`text-sm font-medium ${positive ? "text-green-600" : "text-red-600"}`}>
        {change}
      </div>
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

/* -------------------- Charts -------------------- */
const RegionalBarChart: React.FC<{ data: Region[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data?.length) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x0 = d3
      .scaleBand()
      .domain(data.map((d) => d.region))
      .rangeRound([0, width])
      .paddingInner(0.3);

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
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#374151")
      .text((d) => `$${(d.sales / 1000).toFixed(0)}K`);

    regionGroups
      .append("text")
      .attr("x", x1("profit")! + x1.bandwidth() / 2)
      .attr("y", (d) => y(d.profit * profitScale) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
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
      .call(d3.axisLeft(y).tickFormat(((d: d3.NumberValue) => `$${Number(d) / 1000}K`) as any))
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

    legendItems
      .append("text")
      .attr("x", 16)
      .attr("y", 9)
      .attr("font-size", 11)
      .attr("fill", "#374151")
      .text((d) => d.label);
  }, [data]);

  return <svg ref={svgRef} width={600} height={300} className="max-w-full h-auto" />;
};

const TemporalLineChart: React.FC<{ data: TemporalPoint[] }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; data: any | null }>({
    show: false,
    x: 0,
    y: 0,
    data: null,
  });

  useEffect(() => {
    if (!data?.length) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 60, left: 80 };
    const width = Math.max(1200, data.length * 30) - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    svg.attr("width", width + margin.left + margin.right);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse("%Y-%m")!;
    const processedData = data
      .map((d) => ({ ...d, date: parseDate(d.month) }))
      .filter((d) => d.date) as (TemporalPoint & { date: Date })[];
    if (!processedData.length) return;

    const x = d3.scaleTime().domain(d3.extent(processedData, (d) => d.date) as [Date, Date]).range([0, width]);
    const maxSales = d3.max(processedData, (d) => d.sales) ?? 0;
    const y = d3.scaleLinear().domain([0, maxSales * 1.1]).range([height, 0]);

    const salesLine = d3
      .line<any>()
      .x((d) => x(d.date))
      .y((d) => y(d.sales))
      .curve(d3.curveMonotoneX);

    const profitLine = d3
      .line<any>()
      .x((d) => x(d.date))
      .y((d) => y(d.profit))
      .curve(d3.curveMonotoneX);

    const gradient = svg.append("defs").append("linearGradient").attr("id", "salesGradient").attr("gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("y1", height).attr("x2", 0).attr("y2", 0);
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#3B82F6").attr("stop-opacity", 0.1);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#3B82F6").attr("stop-opacity", 0.3);

    const area = d3
      .area<any>()
      .x((d) => x(d.date))
      .y0(height)
      .y1((d) => y(d.sales))
      .curve(d3.curveMonotoneX);

    g.append("path").datum(processedData).attr("fill", "url(#salesGradient)").attr("d", area as any);
    g.append("path").datum(processedData).attr("fill", "none").attr("stroke", "#3B82F6").attr("stroke-width", 3).attr("d", salesLine as any);
    g.append("path").datum(processedData).attr("fill", "none").attr("stroke", "#EF4444").attr("stroke-width", 2).attr("stroke-dasharray", "5,5").attr("d", profitLine as any);

    g.selectAll(".sales-dot")
      .data(processedData)
      .enter()
      .append("circle")
      .attr("class", "sales-dot")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.sales))
      .attr("r", 4)
      .attr("fill", "#3B82F6")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    g.selectAll(".profit-dot")
      .data(processedData)
      .enter()
      .append("circle")
      .attr("class", "profit-dot")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.profit))
      .attr("r", 3)
      .attr("fill", "#EF4444")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y") as any).ticks(Math.min(processedData.length, 12)))
      .selectAll("text")
      .attr("fill", "#374151")
      .attr("font-size", 10)
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    g.append("g")
      .call(d3.axisLeft(y).tickFormat(((d: d3.NumberValue) => `$${Number(d) / 1000}K`) as any))
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
        const i = d3.bisector((d: any) => d.date).left(processedData, x0, 1);
        const d0 = processedData[i - 1];
        const d1 = processedData[i];
        const d =
          !d0 ? d1 : !d1 ? d0 : x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;
        if (d) {
          const { clientX, clientY } = event as MouseEvent;
          setTooltip({ show: true, x: clientX + 10, y: clientY - 10, data: d });
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
    if (!data?.length) return;

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

    const arcs = g.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d) => color(d.data.category)!)
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .attr("opacity", 0.9);

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${(arc as any).centroid(d)})`)
      .attr("dy", "-0.5em")
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .style("text-shadow", "2px 2px 4px rgba(0,0,0,0.8)")
      .text((d) => d.data.category);

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${(arc as any).centroid(d)})`)
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
    if (!data?.length) return;

    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 40, bottom: 80, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const sortedData = [...data].sort((a, b) => b.sales - a.sales);

    const x = d3.scaleBand().domain(sortedData.map((d) => d.segment)).range([0, width]).padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, (d3.max(sortedData, (d) => d.sales) ?? 0) * 1.1])
      .range([height, 0]);

    const colors = ["#8B5CF6", "#06B6D4", "#F59E0B", "#EC4899"];

    g
      .selectAll(".bar")
      .data(sortedData)
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
      .selectAll(".label")
      .data(sortedData)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.segment)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.sales) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-weight", "bold")
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
      .call(d3.axisLeft(y).tickFormat(((d: d3.NumberValue) => `$${Number(d) / 1000}K`) as any))
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

    const pie = d3.pie<{ label: string; value: number; color: string }>().value((d) => d.value);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>().innerRadius(radius * 0.6).outerRadius(radius);

    const returnData = [
      { label: "Returned", value: data.returnRate, color: "#EF4444" },
      { label: "Successful", value: 100 - data.returnRate, color: "#10B981" },
    ];

    const arcs = donutG.selectAll(".arc").data(pie(returnData)).enter().append("g").attr("class", "arc");

    arcs.append("path").attr("d", arc as any).attr("fill", (d) => d.data.color).attr("opacity", 0.8);

    donutG.append("text").attr("text-anchor", "middle").attr("dy", "-0.5em").attr("font-size", 18).attr("font-weight", "bold").attr("fill", "#EF4444").text(`${data.returnRate}%`);
    donutG.append("text").attr("text-anchor", "middle").attr("dy", "1em").attr("font-size", 12).attr("fill", "#6B7280").text("Return Rate");

    const metricsG = g.append("g").attr("transform", `translate(${radius * 2 + 60}, 30)`);

    const impactPercentage =
      data.lostRevenue > 0 && data.totalOrders > 0 ? (((data.lostRevenue as number) / (data.lostRevenue * 10)) * 100).toFixed(1) : "0.0";

    const metrics = [
      { label: "Total Orders", value: data.totalOrders.toLocaleString(), color: "#3B82F6" },
      { label: "Returned Orders", value: data.returnedOrders.toLocaleString(), color: "#EF4444" },
      { label: "Lost Revenue", value: `${(data.lostRevenue / 1000).toFixed(1)}K`, color: "#F59E0B" },
      { label: "Impact on Profit", value: `${impactPercentage}%`, color: "#8B5CF6" },
    ];

    const metricItems = metricsG
      .selectAll<SVGGElement, { label: string; value: string; color: string }>(".metric")
      .data(metrics)
      .enter()
      .append("g")
      .attr("class", "metric")
      .attr("transform", (_d, i) => `translate(0, ${i * 45})`);

    metricItems.append("rect").attr("width", 4).attr("height", 30).attr("fill", (d) => d.color);

    metricItems.append("text").attr("x", 12).attr("y", 12).attr("font-size", 11).attr("fill", "#6B7280").text((d) => d.label);

    metricItems.append("text").attr("x", 12).attr("y", 26).attr("font-size", 16).attr("font-weight", "bold").attr("fill", "#374151").text((d) => d.value);
  }, [data]);

  return <svg ref={svgRef} width={600} height={300} className="max-w-full h-auto" />;
};

export default SuperstoreDashboard;
