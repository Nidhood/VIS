import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as d3 from "d3";

const DATA_DIR = path.resolve(process.cwd(), "public", "data");
const EMBER = path.join(DATA_DIR, "yearly_full_release_long_format_clean.csv");
const COINS_UNIFIED = path.join(DATA_DIR, "crypto_clean.csv");
const WDI = path.join(DATA_DIR, "worldbank_cleaned.csv");

type EmberRow = {
  area: string;
  iso_3_code?: string;
  year: number;
  category: string;
  subcategory: string;
  variable: string;
  unit: string;
  value: number;
};

type CoinRow = {
  sno: number;
  name: string;
  symbol: string;
  date: Date;
  year: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  marketcap: number;
};

type WdiRow = {
  country_name: string;
  country_code: string;
  series_name: string;
  series_code: string;
  year: number;
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
    iso_3_code: (r.iso_3_code || r["ISO 3 Code"] || "").trim() || undefined,
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
    const symbol = (r.Symbol || r.symbol || "").toUpperCase().trim();
    if (!symbol) return;
    const dateStr = r.Date || r.date || "";
    const date = new Date(dateStr);
    if (!Number.isFinite(date.getTime())) return;
    const close = toNum(r.Close || r.close);
    if (close == null || close <= 0) return;

    out.push({
      sno: +(r.Sno || r.sno || 0),
      name: (r.Name || r.name || "").trim(),
      symbol,
      date,
      year: +(r.Year || r.year || date.getUTCFullYear()),
      high: toNum(r.High || r.high) ?? 0,
      low: toNum(r.Low || r.low) ?? 0,
      open: toNum(r.Open || r.open) ?? 0,
      close,
      volume: toNum(r.Volume || r.volume) ?? 0,
      marketcap: toNum(r.Marketcap || r.marketcap) ?? 0
    });
  });
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const isRenew = (v: string, s: string = "") =>
  /clean|hydro|wind|solar|bio|renew/i.test(v) || /clean|hydro|wind|solar|bio|renew/i.test(s);

const isFossil = (v: string, s: string = "") =>
  /fossil|coal|gas|oil/i.test(v) || /fossil|coal|gas|oil/i.test(s);

// Mapeo de países a continentes
const CONTINENT_MAP: Record<string, string> = {
  "United States": "América", "Canada": "América", "Mexico": "América", "Brazil": "América",
  "Argentina": "América", "Chile": "América", "Colombia": "América", "Peru": "América",
  "Germany": "Europa", "France": "Europa", "United Kingdom": "Europa", "Italy": "Europa",
  "Spain": "Europa", "Poland": "Europa", "Netherlands": "Europa", "Sweden": "Europa",
  "China": "Asia", "India": "Asia", "Japan": "Asia", "Korea, Rep.": "Asia",
  "Indonesia": "Asia", "Thailand": "Asia", "Viet Nam": "Asia", "Malaysia": "Asia",
  "Egypt, Arab Rep.": "África", "Nigeria": "África", "Kenya": "África", "South Africa": "África",
  "Australia": "Oceanía", "New Zealand": "Oceanía"
};

export function seriesGlobalEnergy(emberRows: EmberRow[]) {
  const relevant = emberRows.filter((d) => d.category && d.variable && d.value > 0);
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

export function continentCleanShare(emberRows: EmberRow[]) {
  const relevant = emberRows.filter((d) =>
    d.year >= 2000 && d.value > 0 && d.category && d.variable
  );

  const countryToContinent = new Map<string, string>();
  Object.entries(CONTINENT_MAP).forEach(([country, continent]) => {
    countryToContinent.set(country, continent);
  });

  const byContinentYear = d3.rollups(
    relevant.filter(d => countryToContinent.has(d.area)),
    (arr) => {
      const sumRenew = d3.sum(arr.filter((x) => isRenew(x.variable, x.subcategory)), (d) => d.value);
      const sumFossil = d3.sum(arr.filter((x) => isFossil(x.variable, x.subcategory)), (d) => d.value);
      const total = sumRenew + sumFossil;
      const cleanShare = total > 0 ? sumRenew / total : 0;
      return { cleanShare, total };
    },
    (d) => countryToContinent.get(d.area)!,
    (d) => d.year
  );

  const result: Array<{ continent: string; year: number; cleanShare: number }> = [];
  byContinentYear.forEach(([continent, years]) => {
    years.forEach(([year, data]) => {
      if (data.total > 0) {
        result.push({ continent, year: +year, cleanShare: data.cleanShare });
      }
    });
  });
  return result.sort((a, b) => a.year - b.year || a.continent.localeCompare(b.continent));
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
        const mcap = d3.mean(vs, (v) => v.marketcap) || 0;
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