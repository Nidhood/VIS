"use client";
import * as d3 from "d3";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Row = {
  company: string;
  location: string;
  date: Date | null;
  year: number | null;
  month: number | null;
  statusRocket: string;
  cost: number | null;
  statusMission: string;
};

export type Filters = {
  companies: string[];
  years: number[];
  statuses: string[];
};

export type Highlight = {
  company?: string;
  status?: string;
  year?: number;
  month?: number;
} | null;

type Store = {
  raw: Row[];
  view: Row[];
  allCompanies: string[];
  allYears: number[];
  allStatuses: string[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
  selectedCompanies: string[];
  setSelectedCompanies: (companies: string[]) => void;
  randomizeCompanies: () => void;
};

const Ctx = createContext<Store | null>(null);

export function Provider({ children }: { children: React.ReactNode }) {
  const [raw, setRaw] = useState<Row[]>([]);
  const [filters, setFilters] = useState<Filters>({ companies: [], years: [], statuses: [] });
  const [highlight, setHighlight] = useState<Highlight>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  useEffect(() => {
    d3.csv("/data/Space_Corrected.csv").then((rows) => {
      const parse = d3.timeParse("%a %b %d, %Y %H:%M UTC");
      const out: Row[] = rows.map((r) => {
        const s = (r["Status Mission"] || "").toString().trim();
        const dt = r["Datum"] ? parse(r["Datum"].toString().trim()) : null;
        const cstr = (r[" Rocket"] || r["Rocket"] || "").toString().replace(/[^0-9.\-]/g, "").trim();
        const cost = cstr === "" ? null : +cstr;
        const y = dt ? dt.getUTCFullYear() : null;
        const m = dt ? dt.getUTCMonth() : null;
        return {
          company: (r["Company Name"] || "").toString().trim(),
          location: (r["Location"] || "").toString().trim(),
          date: dt,
          year: y,
          month: m,
          statusRocket: (r["Status Rocket"] || "").toString().trim(),
          cost: Number.isFinite(cost as number) ? (cost as number) : null,
          statusMission: s,
        };
      });
      setRaw(out.filter((r) => r.company && r.statusMission));
    });
  }, []);

  const allCompanies = useMemo(() => Array.from(new Set(raw.map((r) => r.company))).sort(), [raw]);
  const allYears = useMemo(
    () => Array.from(new Set(raw.map((r) => r.year).filter((v): v is number => v !== null))).sort((a, b) => a - b),
    [raw]
  );
  const allStatuses = useMemo(() => Array.from(new Set(raw.map((r) => r.statusMission))).sort(), [raw]);

  const randomizeCompanies = () => {
    let selected: string[];
    if (allCompanies.length <= 10) {
      selected = allCompanies;
    } else {
      const shuffled = [...allCompanies].sort(() => Math.random() - 0.5);
      selected = shuffled.slice(0, 10);
    }
    setSelectedCompanies(selected);
    setFilters({ ...filters, companies: selected });
  };
  useEffect(() => {
    if (allCompanies.length > 0 && selectedCompanies.length === 0) {
      randomizeCompanies();
    }
  }, [allCompanies]);

  const view = useMemo(() => {
    return raw.filter((r) => {
      const okSelected = selectedCompanies.length === 0 || selectedCompanies.includes(r.company);
      const okC = filters.companies.length === 0 || filters.companies.includes(r.company);
      const okY = filters.years.length === 0 || (r.year !== null && filters.years.includes(r.year));
      const okS = filters.statuses.length === 0 || filters.statuses.includes(r.statusMission);

      return okSelected && okC && okY && okS;
    });
  }, [raw, filters, selectedCompanies]);

  const value: Store = useMemo(
    () => ({
      raw,
      view,
      allCompanies,
      allYears,
      allStatuses,
      filters,
      setFilters,
      highlight,
      setHighlight,
      selectedCompanies,
      setSelectedCompanies,
      randomizeCompanies
    }),
    [raw, view, allCompanies, allYears, allStatuses, filters, highlight, selectedCompanies]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("no store");
  return s;
}

export function useColorCategStatus() {
  const { allStatuses } = useStore();
  const css = getComputedStyle(document.documentElement);
  const cat = [
    css.getPropertyValue("--cat-1").trim(),
    css.getPropertyValue("--cat-2").trim(),
    css.getPropertyValue("--cat-3").trim(),
    css.getPropertyValue("--cat-4").trim(),
    css.getPropertyValue("--cat-5").trim(),
    css.getPropertyValue("--cat-6").trim(),
    css.getPropertyValue("--cat-7").trim(),
    css.getPropertyValue("--cat-8").trim(),
  ];
  const scale = d3.scaleOrdinal<string,string>().domain(allStatuses).range(cat);
  return (s: string) => scale(s);
}

export function useColorSequentialCost() {
  const css = getComputedStyle(document.documentElement);
  const seq = [
    css.getPropertyValue("--seq-0").trim(),
    css.getPropertyValue("--seq-1").trim(),
    css.getPropertyValue("--seq-2").trim(),
    css.getPropertyValue("--seq-3").trim(),
    css.getPropertyValue("--seq-4").trim(),
    css.getPropertyValue("--seq-5").trim(),
    css.getPropertyValue("--seq-6").trim(),
  ];
  return d3.scaleQuantize<string>().domain([0, 120]).range(seq);
}

export function useColorDiverging() {
  const css = getComputedStyle(document.documentElement);
  const neg = css.getPropertyValue("--div-neg").trim();
  const mid = css.getPropertyValue("--div-mid").trim();
  const pos = css.getPropertyValue("--div-pos").trim();
  return d3
    .scaleDiverging<string>()
    .domain([-1, 0, 1])
    .interpolator((t) =>
      t < 0.5
        ? d3.interpolate(neg, mid)(t * 2)
        : d3.interpolate(mid, pos)((t - 0.5) * 2)
    );
}
