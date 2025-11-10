"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { useStore } from "./useData";

export default function Filters() {
  const { continentData, globalEnergyData, selectedYear, setSelectedYear, selectedContinent, setSelectedContinent } = useStore();
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-container')) {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (openFilter && dropdownRefs.current[openFilter]) {
      const dropdown = dropdownRefs.current[openFilter]!;
      const rect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      if (rect.right > viewportWidth - 10) {
        dropdown.style.left = 'auto';
        dropdown.style.right = '0';
      } else {
        dropdown.style.left = '0';
        dropdown.style.right = 'auto';
      }
    }
  }, [openFilter]);

  // Obtener años y continentes disponibles
  const allYears = useMemo(() => {
    const years = [...new Set(globalEnergyData.map(d => d.year))];
    return years.sort((a, b) => a - b);
  }, [globalEnergyData]);

  const allContinents = useMemo(() => {
    const continents = [...new Set(continentData.map(d => d.continent))];
    return ["All", ...continents.sort()];
  }, [continentData]);

  // Verificar si hay datos para un año específico
  const hasDataForYear = (year: number) => {
    if (selectedContinent === "All") {
      return globalEnergyData.some(d => d.year === year);
    }
    return continentData.some(d => d.year === year && d.continent === selectedContinent);
  };

  // Verificar si hay datos para un continente específico
  const hasDataForContinent = (continent: string) => {
    if (continent === "All") return true;
    return continentData.some(d => d.year === selectedYear && d.continent === continent);
  };

  const onYear = (year: number) => {
    if (hasDataForYear(year)) {
      setSelectedYear(year);
      setOpenFilter(null);
    }
  };

  const onContinent = (continent: string) => {
    if (hasDataForContinent(continent)) {
      setSelectedContinent(continent);
      setOpenFilter(null);
    }
  };

  const toggleFilter = (filterName: string) => {
    setOpenFilter(openFilter === filterName ? null : filterName);
  };

  return (
    <div className="row">
      {/* Years Filter */}
      <div className="filter-container" style={{ position: 'relative' }}>
        <button
          className="sel"
          onClick={() => toggleFilter('years')}
          style={{
            cursor: 'pointer',
            width: '200px',
            textAlign: 'left'
          }}
        >
          📅 {selectedYear}
        </button>
        {openFilter === 'years' && (
          <div
            ref={(el) => { dropdownRefs.current['years'] = el; }}
            className="card custom-scrollbar"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 200,
              padding: 12,
              width: 'fit-content',
              minWidth: '340px',
              maxWidth: '480px',
              maxHeight: allYears.length > 24 ? '420px' : 'fit-content',
              overflowY: allYears.length > 24 ? 'auto' : 'visible',
              boxShadow: '0 8px 24px rgba(0,0,0,.6)'
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(55px, 1fr))", gap: 8 }}>
              {allYears.map((y) => {
                const available = hasDataForYear(y);
                const isSelected = selectedYear === y;

                return (
                  <button
                    key={y}
                    className="sel"
                    onClick={() => onYear(y)}
                    disabled={!available}
                    style={{
                      background: isSelected ? "#065f46" : "#0f1016",
                      cursor: available ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                      padding: '10px 8px',
                      color: available ? '#d1d5db' : '#4b5563',
                      opacity: available ? 1 : 0.4
                    }}>
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Continents Filter */}
      <div className="filter-container" style={{ position: 'relative' }}>
        <button
          className="sel"
          onClick={() => toggleFilter('continents')}
          style={{
            cursor: 'pointer',
            width: '200px',
            textAlign: 'left'
          }}
        >
          🌍 {selectedContinent === "All" ? "Todos" : selectedContinent}
        </button>
        {openFilter === 'continents' && (
          <div
            ref={(el) => { dropdownRefs.current['continents'] = el; }}
            className="card custom-scrollbar"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 200,
              padding: 12,
              width: 'fit-content',
              minWidth: '280px',
              maxWidth: '400px',
              height: 'fit-content',
              boxShadow: '0 8px 24px rgba(0,0,0,.6)'
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gap: 8 }}>
              {allContinents.map((c) => {
                const available = hasDataForContinent(c);
                const isSelected = selectedContinent === c;

                return (
                  <button
                    key={c}
                    className="sel"
                    onClick={() => onContinent(c)}
                    disabled={!available}
                    style={{
                      background: isSelected ? "#065f46" : "#0f1016",
                      cursor: available ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                      padding: '10px 8px',
                      whiteSpace: 'nowrap',
                      color: available ? '#d1d5db' : '#4b5563',
                      opacity: available ? 1 : 0.4
                    }}>
                    {c === "All" ? "Todos" : c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginLeft: 'auto',
        fontSize: '12px',
        color: '#94a3b8',
        background: 'rgba(16, 185, 129, 0.1)',
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        fontWeight: '600'
      }}>
        💡 Hover para detalles
      </div>
    </div>
  );
}