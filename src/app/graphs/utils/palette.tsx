"use server";

// Fondo y superficie
export const BG = "#1a1a2e";
export const SURFACE = "#16213e";
export const INK = "#eef2ff";
export const GRID = "rgba(238, 242, 255, 0.15)";
export const STROKE = "rgba(238, 242, 255, 0.25)";

// Paleta de colores pasteles categóricos (inspirada en las imágenes)
export const PASTEL_CAT = [
  "#a7c7e7",  // Azul pastel (América)
  "#ffb3ba",  // Rosa pastel (Asia)
  "#bae1a4",  // Verde pastel (Europa)
  "#ffffba",  // Amarillo pastel (Oceanía)
  "#d4a5d6",  // Púrpura pastel (África)
  "#ffdfba",  // Naranja pastel
  "#b8e6e6",  // Cyan pastel
  "#e6b8d8"   // Lavanda pastel
];

// Paleta secuencial para mapas de calor (tonos azul-verde pastel)
export const PASTEL_SEQ = [
  "#e8f4f8",
  "#c8e4f0",
  "#a8d4e8",
  "#88c4e0",
  "#68b4d8",
  "#4fa4d0",
  "#3794c8"
];

// Colores temáticos
export const RENEWABLE_COLOR = "#bae1a4";  // Verde pastel
export const FOSSIL_COLOR = "#ffb3ba";     // Rosa pastel
export const CLEAN_COLOR = "#a7c7e7";      // Azul pastel
export const TREND_UP_COLOR = "#bae1a4";   // Verde pastel
export const TREND_DOWN_COLOR = "#ffb3ba"; // Rosa pastel

// Colores adicionales para gráficos específicos
export const CONTINENT_COLORS: Record<string, string> = {
  "América": "#a7c7e7",   // Azul pastel
  "Asia": "#ffb3ba",      // Rosa pastel
  "Europa": "#bae1a4",    // Verde pastel
  "Oceanía": "#ffffba",   // Amarillo pastel
  "África": "#d4a5d6"     // Púrpura pastel
};

// Colores para criptomonedas
export const CRYPTO_COLORS: Record<string, string> = {
  "BTC": "#a7c7e7",   // Azul pastel
  "ETH": "#bae1a4",   // Verde pastel
  "BNB": "#ffffba",   // Amarillo pastel
  "SOL": "#ffb3ba",   // Rosa pastel
  "DOGE": "#ffdfba"   // Naranja pastel
};