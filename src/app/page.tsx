'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

const SuperstoreDashboard = () => {
  const [data, setData] = useState({ orders: [], returns: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    profitMargin: 0
  });

  // Refs for D3 charts
  const regionalChartRef = useRef();
  const timeSeriesRef = useRef();
  const categoryChartRef = useRef();
  const segmentChartRef = useRef();

  // Helper function to parse European number format (comma as decimal separator)
  const parseNumber = (str) => {
    if (!str || str === '') return 0;
    return parseFloat(str.replace(',', '.'));
  };

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load orders data
        const ordersResponse = await fetch('/data/orders.csv');
        const ordersText = await ordersResponse.text();

        // Parse CSV with semicolon delimiter
        const ordersData = d3.dsvFormat(';').parse(ordersText, d => ({
          rowId: +d['Row ID'],
          orderId: d['Order ID'],
          orderDate: d3.timeParse('%m/%d/%Y')(d['Order Date']),
          shipDate: d3.timeParse('%m/%d/%Y')(d['Ship Date']),
          orderPriority: d['Order Priority'],
          shipMode: d['Ship Mode'],
          orderQuantity: +d['Order Quantity'],
          sales: parseNumber(d['Sales']),
          discount: parseNumber(d['Discount']),
          profit: parseNumber(d['Profit']),
          unitPrice: parseNumber(d['Unit Price']),
          shippingCost: parseNumber(d['Shipping Cost']),
          productBaseMargin: parseNumber(d['Product Base Margin']),
          customerName: d['Customer Name'],
          customerSegment: d['Customer Segment'],
          city: d['City'],
          state: d['State'],
          zipCode: d['Zip Code'],
          region: d['Region'],
          productCategory: d['Product Category'],
          productSubCategory: d['Product Sub-Category'],
          productName: d['Product Name'],
          productContainer: d['Product Container']
        })).filter(d => d.orderDate && !isNaN(d.sales)); // Filter out invalid records

        // Load returns data
        const returnsResponse = await fetch('/data/returns.csv');
        const returnsText = await returnsResponse.text();
        const returnsData = d3.dsvFormat(';').parse(returnsText);

        // Load users data
        const usersResponse = await fetch('/data/users.csv');
        const usersText = await usersResponse.text();
        const usersData = d3.dsvFormat(';').parse(usersText);

        setData({ orders: ordersData, returns: returnsData, users: usersData });

        // Calculate KPIs
        const totalSales = d3.sum(ordersData, d => d.sales);
        const totalProfit = d3.sum(ordersData, d => d.profit);
        const totalOrders = new Set(ordersData.map(d => d.orderId)).size;
        const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

        setKpis({ totalSales, totalProfit, totalOrders, profitMargin });
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Regional Performance Chart
  useEffect(() => {
    if (data.orders.length === 0 || !regionalChartRef.current) return;

    const svg = d3.select(regionalChartRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 60, bottom: 60, left: 80 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Group data by region
    const regionData = d3.rollup(data.orders,
      v => ({
        sales: d3.sum(v, d => d.sales),
        profit: d3.sum(v, d => d.profit),
        orders: v.length
      }),
      d => d.region
    );

    const regions = Array.from(regionData, ([region, values]) => ({
      region,
      ...values
    }));

    const x = d3.scaleBand()
      .domain(regions.map(d => d.region))
      .range([0, width])
      .padding(0.2);

    const yLeft = d3.scaleLinear()
      .domain([0, d3.max(regions, d => d.sales)])
      .range([height, 0]);

    const yRight = d3.scaleLinear()
      .domain([0, d3.max(regions, d => d.profit)])
      .range([height, 0]);

    // Color scales
    const salesColor = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(regions, d => d.sales)]);

    const profitColor = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(regions, d => d.profit)]);

    // Sales bars
    g.selectAll('.sales-bar')
      .data(regions)
      .enter().append('rect')
      .attr('class', 'sales-bar')
      .attr('x', d => x(d.region))
      .attr('width', x.bandwidth() / 2)
      .attr('y', d => yLeft(d.sales))
      .attr('height', d => height - yLeft(d.sales))
      .attr('fill', d => salesColor(d.sales))
      .attr('opacity', 0.8);

    // Profit bars
    g.selectAll('.profit-bar')
      .data(regions)
      .enter().append('rect')
      .attr('class', 'profit-bar')
      .attr('x', d => x(d.region) + x.bandwidth() / 2)
      .attr('width', x.bandwidth() / 2)
      .attr('y', d => yRight(d.profit))
      .attr('height', d => height - yRight(d.profit))
      .attr('fill', d => profitColor(d.profit))
      .attr('opacity', 0.8);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(yLeft).tickFormat(d => `$${d/1000}K`))
      .style('color', '#1f77b4');

    g.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(yRight).tickFormat(d => `$${d/1000}K`))
      .style('color', '#d62728');

    // Labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#1f77b4')
      .style('font-size', '12px')
      .text('Sales ($)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', width + margin.right)
      .attr('x', 0 - (height / 2))
      .attr('dy', '-1em')
      .style('text-anchor', 'middle')
      .style('fill', '#d62728')
      .style('font-size', '12px')
      .text('Profit ($)');

    // Legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 100}, 20)`);

    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#1f77b4')
      .attr('opacity', 0.8);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '12px')
      .text('Sales');

    legend.append('rect')
      .attr('y', 20)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#d62728')
      .attr('opacity', 0.8);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 32)
      .style('font-size', '12px')
      .text('Profit');

  }, [data]);

  // Time Series Chart
  useEffect(() => {
    if (data.orders.length === 0 || !timeSeriesRef.current) return;

    const svg = d3.select(timeSeriesRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 60, bottom: 60, left: 80 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.bottom - margin.top;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Group data by month
    const monthlyData = d3.rollup(data.orders,
      v => ({
        sales: d3.sum(v, d => d.sales),
        profit: d3.sum(v, d => d.profit)
      }),
      d => d3.timeMonth(d.orderDate)
    );

    const timeSeries = Array.from(monthlyData, ([date, values]) => ({
      date,
      ...values
    })).sort((a, b) => a.date - b.date);

    const x = d3.scaleTime()
      .domain(d3.extent(timeSeries, d => d.date))
      .range([0, width]);

    const ySales = d3.scaleLinear()
      .domain([0, d3.max(timeSeries, d => d.sales)])
      .range([height, 0]);

    const yProfit = d3.scaleLinear()
      .domain([0, d3.max(timeSeries, d => d.profit)])
      .range([height, 0]);

    // Line generators
    const salesLine = d3.line()
      .x(d => x(d.date))
      .y(d => ySales(d.sales))
      .curve(d3.curveMonotoneX);

    const profitLine = d3.line()
      .x(d => x(d.date))
      .y(d => yProfit(d.profit))
      .curve(d3.curveMonotoneX);

    // Gradient for area under curve
    const gradient = svg.append('defs').append('linearGradient')
      .attr('id', 'salesGradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', height)
      .attr('x2', 0).attr('y2', 0);

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.1);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.4);

    // Area under sales line
    const area = d3.area()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => ySales(d.sales))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(timeSeries)
      .attr('fill', 'url(#salesGradient)')
      .attr('d', area);

    // Sales line
    g.append('path')
      .datum(timeSeries)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', salesLine);

    // Profit line
    g.append('path')
      .datum(timeSeries)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', profitLine);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y')))
      .selectAll('text')
      .style('font-size', '10px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(ySales).tickFormat(d => `$${d/1000}K`))
      .style('color', '#3b82f6');

    g.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(yProfit).tickFormat(d => `$${d/1000}K`))
      .style('color', '#ef4444');

    // Labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#3b82f6')
      .style('font-size', '12px')
      .text('Sales ($)');

  }, [data]);

  // Category Performance Chart (Donut Chart)
  useEffect(() => {
    if (data.orders.length === 0 || !categoryChartRef.current) return;

    const svg = d3.select(categoryChartRef.current);
    svg.selectAll('*').remove();

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 10;

    const g = svg.append('g')
      .attr('transform', `translate(${width/2},${height/2})`);

    const categoryData = d3.rollup(data.orders,
      v => d3.sum(v, d => d.sales),
      d => d.productCategory
    );

    const pieData = Array.from(categoryData, ([category, sales]) => ({
      category,
      sales
    }));

    const color = d3.scaleOrdinal()
      .domain(pieData.map(d => d.category))
      .range(['#3b82f6', '#ef4444', '#10b981']);

    const pie = d3.pie()
      .value(d => d.sales)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    const arcs = g.selectAll('.arc')
      .data(pie(pieData))
      .enter().append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.category))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('opacity', 0.8);

    // Labels
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(d => d.data.category);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Categories');

  }, [data]);

  // Customer Segment Chart
  useEffect(() => {
    if (data.orders.length === 0 || !segmentChartRef.current) return;

    const svg = d3.select(segmentChartRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 20, bottom: 60, left: 80 };
    const width = 400 - margin.left - margin.right;
    const height = 250 - margin.bottom - margin.top;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const segmentData = d3.rollup(data.orders,
      v => ({
        sales: d3.sum(v, d => d.sales),
        customers: new Set(v.map(d => d.customerName)).size
      }),
      d => d.customerSegment
    );

    const segments = Array.from(segmentData, ([segment, values]) => ({
      segment,
      ...values
    }));

    const x = d3.scaleBand()
      .domain(segments.map(d => d.segment))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(segments, d => d.sales)])
      .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(segments.map(d => d.segment))
      .range(['#8b5cf6', '#06b6d4', '#f59e0b']);

    g.selectAll('.segment-bar')
      .data(segments)
      .enter().append('rect')
      .attr('class', 'segment-bar')
      .attr('x', d => x(d.segment))
      .attr('width', x.bandwidth())
      .attr('y', d => y(d.sales))
      .attr('height', d => height - y(d.sales))
      .attr('fill', d => colorScale(d.segment))
      .attr('rx', 4)
      .style('opacity', 0.8);

    // Value labels on bars
    g.selectAll('.value-label')
      .data(segments)
      .enter().append('text')
      .attr('class', 'value-label')
      .attr('x', d => x(d.segment) + x.bandwidth() / 2)
      .attr('y', d => y(d.sales) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(d => `$${(d.sales/1000).toFixed(0)}K`);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `$${d/1000}K`))
      .style('font-size', '10px');

  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-slate-600">Loading Superstore Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Superstore Sales Dashboard
          </h1>
          <p className="text-lg text-slate-600">
            Comprehensive analysis of sales performance, regional trends, and business insights
          </p>
          <div className="mt-4 text-sm text-slate-500">
            Data loaded: {data.orders.length} orders | Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Sales</p>
                <p className="text-2xl font-bold text-slate-800">
                  ${kpis.totalSales > 1000000 ? (kpis.totalSales / 1000000).toFixed(2) + 'M' : (kpis.totalSales / 1000).toFixed(0) + 'K'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Profit</p>
                <p className="text-2xl font-bold text-slate-800">
                  ${kpis.totalProfit > 1000 ? (kpis.totalProfit / 1000).toFixed(0) + 'K' : kpis.totalProfit.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-slate-800">
                  {kpis.totalOrders.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Profit Margin</p>
                <p className="text-2xl font-bold text-slate-800">
                  {kpis.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Regional Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-blue-200 pb-2">
              Regional Performance Analysis
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Sales and profit comparison across different geographical regions
            </p>
            <svg ref={regionalChartRef} width="500" height="300"></svg>
          </div>

          {/* Time Series */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-blue-200 pb-2">
              Temporal Trends Analysis
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Monthly evolution of sales and profit over time
            </p>
            <svg ref={timeSeriesRef} width="700" height="300"></svg>
          </div>
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Distribution */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-green-200 pb-2">
              Product Category Distribution
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Sales distribution across product categories
            </p>
            <div className="flex justify-center">
              <svg ref={categoryChartRef} width="300" height="300"></svg>
            </div>
          </div>

          {/* Customer Segments */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-purple-200 pb-2">
              Customer Segment Performance
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Sales performance by customer segment
            </p>
            <svg ref={segmentChartRef} width="400" height="250"></svg>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center bg-white rounded-xl shadow-lg p-6">
          <p className="text-slate-600">
            <strong>Dashboard Insights:</strong> This comprehensive analysis provides a holistic view of Superstore&apos;s performance,
            enabling data-driven decisions across regional strategies, temporal planning, and customer segment optimization.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperstoreDashboard;
