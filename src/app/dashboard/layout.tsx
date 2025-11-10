import "@/app/global.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <title>Dashboard - Transición Energética</title>
        <meta name="description" content="Dashboard interactivo de la transición energética global" />
      </head>
      <body>{children}</body>
    </html>
  );
}
