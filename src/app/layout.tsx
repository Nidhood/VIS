import "@/app/global.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <title>Transición Energética - Story Telling</title>
        <meta name="description" content="La historia de la transición energética global" />
      </head>
      <body>{children}</body>
    </html>
  );
}