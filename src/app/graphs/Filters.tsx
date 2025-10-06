"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { useStore } from "@/app/graphs/useData";

export default function Filters() {
  const { raw, allCompanies, allYears, allStatuses, filters, setFilters } = useStore();
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

  // Función para verificar si una combinación tiene datos
  const hasData = (filterType: 'company' | 'year' | 'status', value: string | number) => {
    return raw.some((row) => {
      const okC = filterType === 'company' || filters.companies.length === 0 || filters.companies.includes(row.company);
      const okY = filterType === 'year' || filters.years.length === 0 || (row.year !== null && filters.years.includes(row.year));
      const okS = filterType === 'status' || filters.statuses.length === 0 || filters.statuses.includes(row.statusMission);

      const matchValue =
        (filterType === 'company' && row.company === value) ||
        (filterType === 'year' && row.year === value) ||
        (filterType === 'status' && row.statusMission === value);

      return okC && okY && okS && matchValue;
    });
  };

  const onCompany = (v: string) => {
    if (!hasData('company', v) && !filters.companies.includes(v)) return;
    const next = filters.companies.includes(v) ? filters.companies.filter((x) => x !== v) : [...filters.companies, v];
    setFilters({ ...filters, companies: next });
  };

  const onYear = (v: number) => {
    if (!hasData('year', v) && !filters.years.includes(v)) return;
    const next = filters.years.includes(v) ? filters.years.filter((x) => x !== v) : [...filters.years, v];
    setFilters({ ...filters, years: next });
  };

  const onStatus = (v: string) => {
    if (!hasData('status', v) && !filters.statuses.includes(v)) return;
    const next = filters.statuses.includes(v) ? filters.statuses.filter((x) => x !== v) : [...filters.statuses, v];
    setFilters({ ...filters, statuses: next });
  };

  const labelC = useMemo(() => {
    if (filters.companies.length === 0) return "Todas las compañías";
    if (filters.companies.length === 1) return filters.companies[0];
    return `${filters.companies.length} compañías`;
  }, [filters.companies]);

  const labelY = useMemo(() => {
    if (filters.years.length === 0) return "Todos los años";
    if (filters.years.length === 1) return filters.years[0].toString();
    return `${filters.years.length} años`;
  }, [filters.years]);

  const labelS = useMemo(() => {
    if (filters.statuses.length === 0) return "Todos los estados";
    if (filters.statuses.length === 1) return filters.statuses[0];
    return `${filters.statuses.length} estados`;
  }, [filters.statuses]);

  const toggleFilter = (filterName: string) => {
    setOpenFilter(openFilter === filterName ? null : filterName);
  };

  return (
    <div className="row">
      {/* Companies Filter */}
      <div className="filter-container" style={{ position: 'relative' }}>
        <button
          className="sel"
          onClick={() => toggleFilter('companies')}
          style={{
            cursor: 'pointer',
            width: '200px',
            textAlign: 'left'
          }}
        >
          {labelC}
        </button>
        {openFilter === 'companies' && (
          <div
            ref={(el) => { dropdownRefs.current['companies'] = el; }}
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
              maxHeight: allCompanies.length > 12 ? '420px' : 'fit-content',
              overflowY: allCompanies.length > 12 ? 'auto' : 'visible',
              boxShadow: '0 8px 24px rgba(0,0,0,.6)'
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(100px, 1fr))", gap: 8 }}>
              {allCompanies.map((c) => {
                const available = hasData('company', c);
                const isSelected = filters.companies.includes(c);

                return (
                  <button
                    key={c}
                    className="sel"
                    onClick={() => onCompany(c)}
                    disabled={!available && !isSelected}
                    style={{
                      background: isSelected ? "#172554" : "#0f1016",
                      cursor: (available || isSelected) ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                      padding: '10px 8px',
                      whiteSpace: 'nowrap',
                      color: (available || isSelected) ? '#d1d5db' : '#4b5563',
                      opacity: (available || isSelected) ? 1 : 0.4
                    }}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
          {labelY}
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
                const available = hasData('year', y);
                const isSelected = filters.years.includes(y);

                return (
                  <button
                    key={y}
                    className="sel"
                    onClick={() => onYear(y)}
                    disabled={!available && !isSelected}
                    style={{
                      background: isSelected ? "#172554" : "#0f1016",
                      cursor: (available || isSelected) ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                      padding: '10px 8px',
                      color: (available || isSelected) ? '#d1d5db' : '#4b5563',
                      opacity: (available || isSelected) ? 1 : 0.4
                    }}>
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Statuses Filter */}
      <div className="filter-container" style={{ position: 'relative' }}>
        <button
          className="sel"
          onClick={() => toggleFilter('statuses')}
          style={{
            cursor: 'pointer',
            width: '200px',
            textAlign: 'left'
          }}
        >
          {labelS}
        </button>
        {openFilter === 'statuses' && (
          <div
            ref={(el) => { dropdownRefs.current['statuses'] = el; }}
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
              {allStatuses.map((s) => {
                const available = hasData('status', s);
                const isSelected = filters.statuses.includes(s);

                return (
                  <button
                    key={s}
                    className="sel"
                    onClick={() => onStatus(s)}
                    disabled={!available && !isSelected}
                    style={{
                      background: isSelected ? "#172554" : "#0f1016",
                      cursor: (available || isSelected) ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                      padding: '10px 8px',
                      whiteSpace: 'nowrap',
                      color: (available || isSelected) ? '#d1d5db' : '#4b5563',
                      opacity: (available || isSelected) ? 1 : 0.4
                    }}>
                    {s}
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
