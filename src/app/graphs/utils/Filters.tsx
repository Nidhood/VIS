"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { useStore } from "./useData";

export default function Filters() {
  const {
    continentData,
    globalEnergyData,
    selectedYears,
    setSelectedYears,
    toggleYear,
    selectedContinents,
    setSelectedContinents,
    toggleContinent
  } = useStore();

  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".filter-container")) setOpenFilter(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (openFilter && dropdownRefs.current[openFilter]) {
      const dropdown = dropdownRefs.current[openFilter]!;
      const rect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      if (rect.right > viewportWidth - 10) {
        dropdown.style.left = "auto";
        dropdown.style.right = "0";
      } else {
        dropdown.style.left = "0";
        dropdown.style.right = "auto";
      }
    }
  }, [openFilter]);

  const allYears = useMemo(() => {
    const years = [...new Set(globalEnergyData.map(d => d.year))];
    return years.sort((a, b) => a - b);
  }, [globalEnergyData]);

  const allContinents = useMemo(() => {
    const continents = [...new Set(continentData.map(d => d.continent))];
    return continents.sort();
  }, [continentData]);

  const clearYears = () => setSelectedYears([]);
  const clearContinents = () => setSelectedContinents([]);

  return (
    <div className="row" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div className="filter-container" style={{ position: "relative" }}>
        <button className="sel" onClick={() => setOpenFilter(openFilter === "years" ? null : "years")} style={{ cursor: "pointer", width: "220px", textAlign: "left" }}>
          Años seleccionados ({selectedYears.length})
        </button>
        {openFilter === "years" && (
          <div
            ref={(el) => { dropdownRefs.current["years"] = el; }}
            className="card custom-scrollbar"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 200,
              padding: 12,
              minWidth: "360px",
              maxHeight: "360px",
              overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,.6)"
            }}
          >
            <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
              <button className="sel" onClick={() => setSelectedYears(allYears)} style={{ padding: "8px 10px" }}>Todos</button>
              <button className="sel" onClick={clearYears} style={{ padding: "8px 10px" }}>Limpiar</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(44px, 1fr))", gap: 6 }}>
              {allYears.map((y) => {
                const isSelected = selectedYears.includes(y);
                return (
                  <button
                    key={y}
                    className="sel"
                    onClick={(e) => toggleYear(y, e.altKey)}
                    style={{
                      background: isSelected ? "#065f46" : "#0f1016",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: "12px",
                      padding: "10px 6px",
                      color: "#d1d5db"
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="filter-container" style={{ position: "relative" }}>
        <button className="sel" onClick={() => setOpenFilter(openFilter === "continents" ? null : "continents")} style={{ cursor: "pointer", width: "240px", textAlign: "left" }}>
          Continentes ({selectedContinents.length})
        </button>
        {openFilter === "continents" && (
          <div
            ref={(el) => { dropdownRefs.current["continents"] = el; }}
            className="card custom-scrollbar"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 200,
              padding: 12,
              minWidth: "320px",
              boxShadow: "0 8px 24px rgba(0,0,0,.6)"
            }}
          >
            <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
              <button className="sel" onClick={() => setSelectedContinents(allContinents)} style={{ padding: "8px 10px" }}>Todos</button>
              <button className="sel" onClick={clearContinents} style={{ padding: "8px 10px" }}>Limpiar</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(130px, 1fr))", gap: 6 }}>
              {allContinents.map((c) => {
                const isSelected = selectedContinents.includes(c);
                return (
                  <button
                    key={c}
                    className="sel"
                    onClick={(e) => toggleContinent(c, e.altKey)}
                    style={{
                      background: isSelected ? "#065f46" : "#0f1016",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: "13px",
                      padding: "10px 8px",
                      whiteSpace: "nowrap",
                      color: "#d1d5db"
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
