"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Papa from "papaparse";

type EmberRow = {
  area: string;
  year: number;
  category: string;
  subcategory: string;
  variable: string;
  value: number;
};

type CoinRow = {
  symbol: string;
  date: Date;
  year: number;
  close: number;
  volume: number;
  marketcap: number;
};

type ContinentData = {
  continent: string;
  year: number;
  cleanShare: number;
};

type GlobalEnergyData = {
  year: number;
  total: number;
  sumRenew: number;
  sumFossil: number;
  cleanShare: number;
};

type CryptoData = {
  year: number;
  symbol: string;
  cleanShare: number;
  volAnn: number;
  mcap: number;
};

type DataContextType = {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedContinent: string;
  setSelectedContinent: (continent: string) => void;
  selectedCrypto: string;
  setSelectedCrypto: (crypto: string) => void;
  continentData: ContinentData[];
  globalEnergyData: GlobalEnergyData[];
  cryptoData: CryptoData[];
  loading: boolean;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

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

const isRenew = (v: string, s: string = "") =>
  /clean|hydro|wind|solar|bio|renew/i.test(v) || /clean|hydro|wind|solar|bio|renew/i.test(s);

const isFossil = (v: string, s: string = "") =>
  /fossil|coal|gas|oil/i.test(v) || /fossil|coal|gas|oil/i.test(s);

export function Provider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedContinent, setSelectedContinent] = useState("All");
  const [selectedCrypto, setSelectedCrypto] = useState("All");
  const [continentData, setContinentData] = useState<ContinentData[]>([]);
  const [globalEnergyData, setGlobalEnergyData] = useState<GlobalEnergyData[]>([]);
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar datos de Ember
        const emberResponse = await fetch('/data/yearly_full_release_long_format_clean.csv');
        const emberText = await emberResponse.text();
        const emberParsed = Papa.parse<any>(emberText, { header: true, dynamicTyping: true });

        const emberRows: EmberRow[] = emberParsed.data
          .filter(r => r.area && r.year && r.value)
          .map(r => ({
            area: String(r.area || r.Area || '').trim(),
            year: +(r.year || r.Year || 0),
            category: String(r.category || r.Category || '').trim(),
            subcategory: String(r.subcategory || r.Subcategory || '').trim(),
            variable: String(r.variable || r.Variable || '').trim(),
            value: +(r.value || r.Value || 0)
          }))
          .filter(d => d.area && d.year > 0 && d.value > 0);

        // Cargar datos de crypto
        const cryptoResponse = await fetch('/data/crypto_clean.csv');
        const cryptoText = await cryptoResponse.text();
        const cryptoParsed = Papa.parse<any>(cryptoText, { header: true, dynamicTyping: true });

        const coinRows: CoinRow[] = cryptoParsed.data
          .filter(r => r.Symbol && r.Date && r.Close)
          .map(r => ({
            symbol: String(r.Symbol || r.symbol || '').toUpperCase().trim(),
            date: new Date(r.Date || r.date),
            year: +(r.Year || r.year || new Date(r.Date || r.date).getFullYear()),
            close: +(r.Close || r.close || 0),
            volume: +(r.Volume || r.volume || 0),
            marketcap: +(r.Marketcap || r.marketcap || 0)
          }))
          .filter(d => d.symbol && d.close > 0);

        // Procesar datos globales
        const yearMap = new Map<number, { sumRenew: number; sumFossil: number }>();

        emberRows.forEach(d => {
          if (!d.category || !d.variable || d.value <= 0) return;

          const current = yearMap.get(d.year) || { sumRenew: 0, sumFossil: 0 };

          if (isRenew(d.variable, d.subcategory)) {
            current.sumRenew += d.value;
          } else if (isFossil(d.variable, d.subcategory)) {
            current.sumFossil += d.value;
          }

          yearMap.set(d.year, current);
        });

        const processedGlobal = Array.from(yearMap.entries())
          .map(([year, data]) => ({
            year,
            total: data.sumRenew + data.sumFossil,
            sumRenew: data.sumRenew,
            sumFossil: data.sumFossil,
            cleanShare: data.sumRenew + data.sumFossil > 0
              ? data.sumRenew / (data.sumRenew + data.sumFossil)
              : 0
          }))
          .filter(d => d.total > 0)
          .sort((a, b) => a.year - b.year);

        // Procesar datos por continente
        const continentMap = new Map<string, Map<number, { sumRenew: number; sumFossil: number }>>();

        emberRows
          .filter(d => d.year >= 2000 && CONTINENT_MAP[d.area])
          .forEach(d => {
            const continent = CONTINENT_MAP[d.area];
            if (!continentMap.has(continent)) {
              continentMap.set(continent, new Map());
            }

            const yearData = continentMap.get(continent)!;
            const current = yearData.get(d.year) || { sumRenew: 0, sumFossil: 0 };

            if (isRenew(d.variable, d.subcategory)) {
              current.sumRenew += d.value;
            } else if (isFossil(d.variable, d.subcategory)) {
              current.sumFossil += d.value;
            }

            yearData.set(d.year, current);
          });

        const processedContinent: ContinentData[] = [];
        continentMap.forEach((yearData, continent) => {
          yearData.forEach((data, year) => {
            const total = data.sumRenew + data.sumFossil;
            if (total > 0) {
              processedContinent.push({
                continent,
                year,
                cleanShare: data.sumRenew / total
              });
            }
          });
        });

        // Procesar datos de crypto vs energía
        const energyByYear = new Map(processedGlobal.map(d => [d.year, d.cleanShare]));
        const coinsBySymbol = new Map<string, CoinRow[]>();

        coinRows.forEach(coin => {
          if (!coinsBySymbol.has(coin.symbol)) {
            coinsBySymbol.set(coin.symbol, []);
          }
          coinsBySymbol.get(coin.symbol)!.push(coin);
        });

        const processedCrypto: CryptoData[] = [];

        coinsBySymbol.forEach((coins, symbol) => {
          const byYear = new Map<number, CoinRow[]>();
          coins.forEach(coin => {
            if (!byYear.has(coin.year)) {
              byYear.set(coin.year, []);
            }
            byYear.get(coin.year)!.push(coin);
          });

          byYear.forEach((yearCoins, year) => {
            const closes = yearCoins.map(c => c.close).filter(c => c > 0);
            if (closes.length < 2) return;

            const returns = [];
            for (let i = 1; i < closes.length; i++) {
              returns.push(Math.log(closes[i] / closes[i - 1]));
            }

            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
            const sd = Math.sqrt(variance);
            const volAnn = sd * Math.sqrt(365);

            const avgMcap = yearCoins.reduce((a, b) => a + b.marketcap, 0) / yearCoins.length;
            const cleanShare = energyByYear.get(year);

            if (cleanShare != null && volAnn > 0) {
              processedCrypto.push({
                year,
                symbol,
                cleanShare,
                volAnn,
                mcap: avgMcap
              });
            }
          });
        });

        setContinentData(processedContinent.sort((a, b) => a.year - b.year));
        setGlobalEnergyData(processedGlobal);
        setCryptoData(processedCrypto);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <DataContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        selectedContinent,
        setSelectedContinent,
        selectedCrypto,
        setSelectedCrypto,
        continentData,
        globalEnergyData,
        cryptoData,
        loading
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useStore() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useStore must be used within a Provider");
  }
  return context;
}