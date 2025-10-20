"use server";

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as d3 from "d3";

const DATA_DIR = path.resolve("public", "data");
const EMBER = path.join(DATA_DIR, "ember_tidy.csv");
const COINS_UNIFIED = path.join(DATA_DIR, "crypto_clean.csv");
const WDI_TIDY = path.join(DATA_DIR, "worldbank_tidy.csv");

type EmberRow = {
  area: string;
  year: number;
  category: string;
  variable: string;
  subcategory?: string;
  unit: string;
  value: number;
};

type CoinRow = {
  symbol: string;
  date: Date;
  year: number;
  close: number;
  marketcap: number | null;
  volume: number | null;
};

type WdiRow = {
  country_name: string;
  country_code: string;
  series_name: string;
  series_code: string;
  Year: number;
  value: number;
};

const toNum = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const readCSV = (file: string) =>
  fs.existsSync(file)
    ? (parse(fs.readFileSync(file, "utf8"), {
        columns: true,
        skip_empty_lines: true,
        bom: true
      }) as Record<string, string>[])
    : [];

export function loadEmberLong(): EmberRow[] {
  const rows = readCSV(EMBER).map((r) => ({
    area: (r.area || r.Area || "").trim(),
    year: +(r.year || r.Year || 0),
    category: (r.category || r.Category || "").trim(),
    subcategory: (r.subcategory || r.Subcategory || "").trim(),
    variable: (r.variable || r.Variable || "").trim(),
    unit: (r.unit || r.Unit || "").trim(),
    value: toNum(r.value || r.Value) ?? 0
  }));
  return rows.filter((d) => d.area && Number.isFinite(d.year) && d.year > 0 && Number.isFinite(d.value) && d.value !== 0);
}

export function loadCoins(): CoinRow[] {
  const rows = readCSV(COINS_UNIFIED);
  const out: CoinRow[] = [];
  rows.forEach((r) => {
    const symbol = (r.symbol || r.Symbol || "").toUpperCase().trim();
    if (!symbol) return;
    const date = new Date(r.date || r.Date || "");
    if (!Number.isFinite(date.getTime())) return;
    const close = toNum(r.close || r.Close);
    if (close == null || close <= 0) return;
    out.push({
      symbol,
      date,
      year: date.getUTCFullYear(),
      close,
      marketcap: toNum(r.marketcap || r.Marketcap || r.MarketCap),
      volume: toNum(r.volume || r.Volume)
    });
  });
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function loadWDI(): WdiRow[] {
  const rows = readCSV(WDI_TIDY);
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  const mapped = rows
    .map((r) => ({
      country_name: (r[keys[0]] || "").trim(),
      country_code: (r[keys[1]] || "").trim(),
      series_name: (r[keys[2]] || "").trim(),
      series_code: (r[keys[3]] || "").trim(),
      Year: +(r[keys[4]] || 0),
      value: toNum(r[keys[5]]) ?? 0
    }))
    .filter(
      (d) =>
        d.country_name &&
        d.series_name &&
        Number.isFinite(d.Year) &&
        d.Year > 0 &&
        Number.isFinite(d.value) &&
        d.value > 0
    ) as WdiRow[];
  return mapped;
}

const isRenew = (v: string, s: string = "") =>
  /clean|hydro|wind|solar|bio|renew/i.test(v) || /clean|hydro|wind|solar|bio|renew/i.test(s);

const isFossil = (v: string, s: string = "") =>
  /fossil|coal|gas|oil/i.test(v) || /fossil|coal|gas|oil/i.test(s);

export function seriesGlobalEnergy(emberRows: EmberRow[]) {
  const relevant = emberRows.filter((d) =>
    d.category && d.variable && d.value > 0
  );

  const byYear = d3.rollups(
    relevant,
    (arr) => {
      const sumRenew = d3.sum(arr.filter((x) => isRenew(x.variable, x.subcategory)), (d) => d.value);
      const sumFossil = d3.sum(arr.filter((x) => isFossil(x.variable, x.subcategory)), (d) => d.value);
      const total = sumRenew + sumFossil;
      const cleanShare = total > 0 ? sumRenew / total : 0;
      return { total, sumRenew, sumFossil, cleanShare };
    },
    (d) => d.year
  )
    .map(([year, m]) => ({ year: +year, ...m }))
    .sort((a, b) => a.year - b.year);

  return byYear.filter((d) => d.total > 0);
}

export function topCountriesCleanShare(emberRows: EmberRow[], topN = 5, yearMin = 2000) {
  const base = emberRows.filter((d) => d.year >= yearMin && d.value > 0);

  const byCountryYear = d3.rollups(
    base,
    (arr) => {
      const sumRenew = d3.sum(arr.filter((x) => isRenew(x.variable, x.subcategory)), (d) => d.value);
      const sumFossil = d3.sum(arr.filter((x) => isFossil(x.variable, x.subcategory)), (d) => d.value);
      const total = sumRenew + sumFossil;
      const cleanShare = total > 0 ? sumRenew / total : 0;
      return { total, cleanShare };
    },
    (d) => d.area,
    (d) => d.year
  );

  const lastYear = d3.max(base, (d) => d.year) || yearMin;
  const lastTotals = byCountryYear.map(([area, yrs]) => ({
    area,
    rec: yrs.find((y) => y[0] === lastYear) || yrs.at(-1)!
  }));

  const validTotals = lastTotals.filter((x) => x.rec && x.rec[1].total > 0);
  const sortedTotals = validTotals.map((x) => x.rec[1].total).sort(d3.ascending);
  const thr = d3.quantile(sortedTotals, 0.85) || 0;

  const filteredAreas = new Set(
    validTotals.filter((x) => x.rec[1].total >= thr).map((x) => x.area)
  );

  const recent = byCountryYear
    .filter(([area]) => filteredAreas.has(area))
    .map(([area, yrs]) => {
      const yrec = yrs.find((y) => y[0] === lastYear) || yrs.at(-1)!;
      const cs = yrec ? yrec[1].cleanShare : 0;
      return {
        area,
        cleanShare: cs,
        years: yrs.map(([year, m]) => ({ year, ...m })).sort((a, b) => a.year - b.year)
      };
    })
    .filter((d) => d.area && d.years.length > 0);

  return recent.sort((a, b) => d3.descending(a.cleanShare, b.cleanShare)).slice(0, topN);
}

export function cryptoVsCleanShare(
  energySeries: { year: number; cleanShare: number }[],
  coins: CoinRow[]
) {
  const energyByYear = new Map(energySeries.map((d) => [d.year, d.cleanShare]));
  const bySym = d3.group(coins, (d) => d.symbol);
  const out: { year: number; symbol: string; cleanShare: number; volAnn: number; mcap: number }[] = [];

  for (const [sym, arr] of bySym) {
    const byYear = d3.rollups(
      arr.sort((a, b) => a.date.getTime() - b.date.getTime()),
      (vs) => {
        const cl = vs.map((v) => v.close).filter((c) => Number.isFinite(c) && c > 0);
        if (cl.length < 2) return { volAnn: 0, mcap: 0 };
        const rets = d3.pairs(cl).map(([a, b]) => Math.log(b / a)).filter(Number.isFinite);
        if (rets.length === 0) return { volAnn: 0, mcap: 0 };
        const sd = d3.deviation(rets) || 0;
        const volAnn = sd * Math.sqrt(365);
        const mcap = d3.mean(vs, (v) => v.marketcap ?? 0) || 0;
        return { volAnn, mcap };
      },
      (v) => v.year
    );

    byYear.forEach(([year, m]) => {
      const cs = energyByYear.get(year);
      if (cs != null && m.volAnn > 0) {
        out.push({ year: +year, symbol: sym, cleanShare: cs, volAnn: m.volAnn, mcap: m.mcap });
      }
    });
  }
  return out;
}

export function wdiEnergyVsGdp(wdi: WdiRow[], country = "China") {
  const pick = (name: string) => wdi.filter((d) =>
    d.country_name === country && d.series_name.includes(name)
  );

  const euse = pick("Energy use");
  const gdp = pick("GDP per capita");

  if (euse.length === 0 || gdp.length === 0) return [];

  const map = new Map(gdp.map((d) => [d.Year, d.value]));
  const rows = euse.map((d) => ({
    year: d.Year,
    energy_per_capita_kg: d.value,
    gdp_per_capita: map.get(d.Year) ?? null
  }));

  return rows.filter((r) => r.gdp_per_capita != null && r.gdp_per_capita > 0 && r.energy_per_capita_kg > 0);
}
