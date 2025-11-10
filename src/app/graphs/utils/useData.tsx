"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import Papa from "papaparse";

type EmberRow = {
  area: string;
  year: number;
  category: string;
  subcategory: string;
  variable: string;
  value: number;
};

type CoinRow = { symbol: string; date: Date; year: number; close: number; volume: number; marketcap: number };

type ContinentData = { continent: string; year: number; cleanShare: number };

type ContinentEnergy = {
  continent: string;
  year: number;
  renew: number;
  fossil: number;
  total: number;
  production: number;
  consumption: number;
};

type GlobalEnergyData = { year: number; total: number; sumRenew: number; sumFossil: number; cleanShare: number };
type CryptoData = { year: number; symbol: string; cleanShare: number; volAnn: number; mcap: number };

type Focus = { type: "year" | "continent" | "country" | "crypto" | null; value: string | number | null };

type DataContextType = {
  selectedYears: number[];
  setSelectedYears: (years: number[]) => void;
  toggleYear: (year: number, exclusive?: boolean) => void;
  selectedContinents: string[];
  setSelectedContinents: (c: string[]) => void;
  toggleContinent: (c: string, exclusive?: boolean) => void;
  focused: Focus;
  setFocused: (f: Focus) => void;
  clearFocus: () => void;
  continentData: ContinentData[];
  continentEnergy: ContinentEnergy[];
  globalEnergyData: GlobalEnergyData[];
  cryptoData: CryptoData[];
  countriesByContinent: Record<string, string[]>;
  loading: boolean;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const CONTINENT_MAP: Record<string, string> = {
  "United States": "América",
  Canada: "América",
  Mexico: "América",
  Brazil: "América",
  Argentina: "América",
  Chile: "América",
  Colombia: "América",
  Peru: "América",
  Germany: "Europa",
  France: "Europa",
  "United Kingdom": "Europa",
  Italy: "Europa",
  Spain: "Europa",
  Poland: "Europa",
  Netherlands: "Europa",
  Sweden: "Europa",
  China: "Asia",
  India: "Asia",
  Japan: "Asia",
  "Korea, Rep.": "Asia",
  Indonesia: "Asia",
  Thailand: "Asia",
  "Viet Nam": "Asia",
  Malaysia: "Asia",
  "Egypt, Arab Rep.": "África",
  Nigeria: "África",
  Kenya: "África",
  "South Africa": "África",
  Australia: "Oceanía",
  "New Zealand": "Oceanía"
};

const isRenew = (v: string, s: string = "") => /clean|hydro|wind|solar|bio|renew/i.test(v) || /clean|hydro|wind|solar|bio|renew/i.test(s);
const isFossil = (v: string, s: string = "") => /fossil|coal|gas|oil/i.test(v) || /fossil|coal|gas|oil/i.test(s);
const isProduction = (a: string, b: string, c: string) => /(generation|production|generación|producción)/i.test(a) || /(generation|production|generación|producción)/i.test(b) || /(generation|production|generación|producción)/i.test(c);
const isConsumption = (a: string, b: string, c: string) => /(consumption|demand|use|consumo|demanda|uso)/i.test(a) || /(consumption|demand|use|consumo|demanda|uso)/i.test(b) || /(consumption|demand|use|consumo|demanda|uso)/i.test(c);

export function Provider({ children }: { children: ReactNode }) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);
  const [focused, setFocused] = useState<Focus>({ type: null, value: null });

  const [continentData, setContinentData] = useState<ContinentData[]>([]);
  const [continentEnergy, setContinentEnergy] = useState<ContinentEnergy[]>([]);
  const [globalEnergyData, setGlobalEnergyData] = useState<GlobalEnergyData[]>([]);
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const emberResponse = await fetch("/data/yearly_full_release_long_format_clean.csv");
        const emberText = await emberResponse.text();
        const emberParsed = Papa.parse<any>(emberText, { header: true, dynamicTyping: true });

        const emberRows: EmberRow[] = (emberParsed.data as any[])
          .filter((r) => r && (r.area || r.Area) && (r.year || r.Year) && (r.value || r.Value))
          .map((r) => ({
            area: String(r.area ?? r.Area ?? "").trim(),
            year: +(r.year ?? r.Year ?? 0),
            category: String(r.category ?? r.Category ?? "").trim(),
            subcategory: String(r.subcategory ?? r.Subcategory ?? "").trim(),
            variable: String(r.variable ?? r.Variable ?? "").trim(),
            value: +(r.value ?? r.Value ?? 0)
          }))
          .filter((d) => d.area && d.year > 0 && d.value > 0);

        const cryptoResponse = await fetch("/data/crypto_clean.csv");
        const cryptoText = await cryptoResponse.text();
        const cryptoParsed = Papa.parse<any>(cryptoText, { header: true, dynamicTyping: true });
        const coinRows: CoinRow[] = (cryptoParsed.data as any[])
          .filter((r) => r && (r.Symbol || r.symbol) && (r.Date || r.date) && (r.Close || r.close))
          .map((r) => {
            const d = new Date(r.Date ?? r.date);
            return {
              symbol: String(r.Symbol ?? r.symbol ?? "").toUpperCase().trim(),
              date: d,
              year: +(r.Year ?? r.year ?? d.getFullYear()),
              close: +(r.Close ?? r.close ?? 0),
              volume: +(r.Volume ?? r.volume ?? 0),
              marketcap: +(r.Marketcap ?? r.marketcap ?? 0)
            };
          })
          .filter((d) => d.symbol && d.close > 0);

        const yearMap = new Map<number, { sumRenew: number; sumFossil: number }>();
        emberRows.forEach((d) => {
          const y = d.year;
          const curr = yearMap.get(y) || { sumRenew: 0, sumFossil: 0 };
          if (isRenew(d.variable, d.subcategory)) curr.sumRenew += d.value;
          else if (isFossil(d.variable, d.subcategory)) curr.sumFossil += d.value;
          yearMap.set(y, curr);
        });

        const processedGlobal = Array.from(yearMap.entries())
          .map(([year, v]) => {
            const total = v.sumRenew + v.sumFossil;
            return { year, total, sumRenew: v.sumRenew, sumFossil: v.sumFossil, cleanShare: total > 0 ? v.sumRenew / total : 0 };
          })
          .filter((d) => d.total > 0)
          .sort((a, b) => a.year - b.year);

        type YearAgg = { renew: number; fossil: number; prod: number; cons: number };
        const continentMap = new Map<string, Map<number, YearAgg>>();

        emberRows
          .filter((d) => d.year >= 2000 && CONTINENT_MAP[d.area])
          .forEach((d) => {
            const cont = CONTINENT_MAP[d.area];
            if (!continentMap.has(cont)) continentMap.set(cont, new Map());
            const ymap = continentMap.get(cont)!;
            const agg = ymap.get(d.year) || { renew: 0, fossil: 0, prod: 0, cons: 0 };

            if (isRenew(d.variable, d.subcategory)) agg.renew += d.value;
            else if (isFossil(d.variable, d.subcategory)) agg.fossil += d.value;

            const a = d.variable.toLowerCase();
            const b = d.category.toLowerCase();
            const c = d.subcategory.toLowerCase();
            if (isProduction(a, b, c)) agg.prod += d.value;
            if (isConsumption(a, b, c)) agg.cons += d.value;

            ymap.set(d.year, agg);
          });

        const processedContinent: ContinentData[] = [];
        const processedEnergy: ContinentEnergy[] = [];
        continentMap.forEach((ymap, continent) => {
          ymap.forEach((agg, year) => {
            const total = agg.renew + agg.fossil;
            if (total > 0) processedContinent.push({ continent, year, cleanShare: agg.renew / total });
            if (total > 0 || agg.prod > 0 || agg.cons > 0) {
              processedEnergy.push({
                continent,
                year,
                renew: agg.renew,
                fossil: agg.fossil,
                total,
                production: agg.prod > 0 ? agg.prod : total,
                consumption: agg.cons
              });
            }
          });
        });

        const energyByYear = new Map(processedGlobal.map((d) => [d.year, d.cleanShare]));
        const coinsBySymbol = new Map<string, CoinRow[]>();
        coinRows.forEach((coin) => {
          if (!coinsBySymbol.has(coin.symbol)) coinsBySymbol.set(coin.symbol, []);
          coinsBySymbol.get(coin.symbol)!.push(coin);
        });

        const processedCrypto: CryptoData[] = [];
        coinsBySymbol.forEach((coins) => {
          const byYear = new Map<number, CoinRow[]>();
          coins.forEach((coin) => {
            if (!byYear.has(coin.year)) byYear.set(coin.year, []);
            byYear.get(coin.year)!.push(coin);
          });
          byYear.forEach((yearCoins, year) => {
            const closes = yearCoins.map((c) => c.close).filter((v) => v > 0);
            if (closes.length < 2) return;
            const rets: number[] = [];
            for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
            const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
            const variance = rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rets.length;
            const sd = Math.sqrt(variance);
            const volAnn = sd * Math.sqrt(365);
            const avgMcap = yearCoins.reduce((a, b) => a + b.marketcap, 0) / yearCoins.length;
            const cleanShare = energyByYear.get(year);
            if (cleanShare != null && volAnn > 0) processedCrypto.push({ year, symbol: yearCoins[0].symbol, cleanShare, volAnn, mcap: avgMcap });
          });
        });

        setContinentData(processedContinent.sort((a, b) => a.year - b.year || a.continent.localeCompare(b.continent)));
        setContinentEnergy(processedEnergy.sort((a, b) => a.year - b.year || a.continent.localeCompare(b.continent)));
        setGlobalEnergyData(processedGlobal);
        setCryptoData(processedCrypto);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const countriesByContinent = useMemo(() => {
    const map: Record<string, string[]> = {};
    Object.entries(CONTINENT_MAP).forEach(([country, cont]) => {
      if (!map[cont]) map[cont] = [];
      map[cont].push(country);
    });
    return map;
  }, []);

  const toggleYear = (year: number, exclusive?: boolean) => {
    setFocused({ type: "year", value: year });
    setSelectedYears((prev) => {
      if (exclusive) return [year];
      const has = prev.includes(year);
      return has ? prev.filter((y) => y !== year) : [...prev, year];
    });
  };

  const toggleContinent = (c: string, exclusive?: boolean) => {
    setFocused({ type: "continent", value: c });
    setSelectedContinents((prev) => {
      if (exclusive) return [c];
      const has = prev.includes(c);
      return has ? prev.filter((x) => x !== c) : [...prev, c];
    });
  };

  const clearFocus = () => setFocused({ type: null, value: null });

  return (
    <DataContext.Provider
      value={{
        selectedYears,
        setSelectedYears,
        toggleYear,
        selectedContinents,
        setSelectedContinents,
        toggleContinent,
        focused,
        setFocused,
        clearFocus,
        continentData,
        continentEnergy,
        globalEnergyData,
        cryptoData,
        countriesByContinent,
        loading
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useStore() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useStore must be used within a Provider");
  return context;
}
