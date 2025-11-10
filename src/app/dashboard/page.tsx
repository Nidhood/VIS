"use client";
import { useEffect } from "react";
import { Provider, useStore } from "@/app/graphs/utils/useData";
import Filters from "@/app/graphs/utils/Filters";
import dynamic from "next/dynamic";
import AnimatedBackground from "@/app/graphs/utils/AnimatedBackground";

const StackedArea = dynamic(() => import("../graphs/idiom-1/StackedArea"), { ssr: false });
const LineChart = dynamic(() => import("../graphs/idiom-2/LineChart"), { ssr: false });
const SlopeChart = dynamic(() => import("../graphs/idiom-3/SlopeChart"), { ssr: false });
const HeatMap = dynamic(() => import("../graphs/idiom-4/HeatMap"), { ssr: false });
const GraphBundle = dynamic(() => import("../graphs/idiom-5/GraphBundle"), { ssr: false });

function Header() {
  const goToStory = () => {
    window.location.href = "/";
  };
  const { clearFocus } = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearFocus]);
  return (
    <div style={{ position: "relative", zIndex: 100, background: "rgba(22,33,62,.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(167,199,231,.2)", padding: "12px 20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 20, maxWidth: 1600, margin: "0 auto" }}>
        <button onClick={goToStory} style={{ padding: "10px 24px", fontSize: 14, fontWeight: 600, background: "rgba(167,199,231,.15)", color: "#a7c7e7", border: "1px solid rgba(167,199,231,.3)", borderRadius: 8, cursor: "pointer", width: "fit-content" }}>Volver al Story</button>
        <h1 style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(90deg,#a7c7e7,#bae1a4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1, margin: 0, textAlign: "center" }}>Dashboard Interactivo</h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ fontSize: 13, color: "#9faec7", fontWeight: 500 }}>Santiago Castro Zuluaga</span>
          <span style={{ fontSize: 13, color: "#9faec7", fontWeight: 500 }}>Iván Darío Orozco Ibáñez</span>
        </div>
      </div>
      <div style={{ maxWidth: 1600, margin: "10px auto 0" }}>
        <Filters />
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", background: "rgba(22,33,62,.6)", border: "1px solid rgba(167,199,231,.2)", borderRadius: 16, padding: 12, boxSizing: "border-box", minHeight: 0 }}>
      {children}
    </div>
  );
}

function DashboardContent() {
  return (
    <>
      <AnimatedBackground />
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <Header />
        <div style={{ flex: 1, maxWidth: 1600, width: "100%", margin: "0 auto", padding: "14px 20px 20px", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(0, 0.55fr) minmax(0, 0.45fr)", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 0 }}>
            <Card>
              <StackedArea />
            </Card>
            <Card>
              <LineChart />
            </Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, minHeight: 0 }}>
            <Card>
              <HeatMap />
            </Card>
            <Card>
              <GraphBundle />
            </Card>
            <Card>
              <SlopeChart />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Provider>
      <DashboardContent />
    </Provider>
  );
}
