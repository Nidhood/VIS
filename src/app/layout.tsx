/* src/app/layout.tsx */
import "./globals.css";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="font-sans bg-[var(--color-bg)] text-[var(--color-ink)]">
        {children}
      </body>
    </html>
  );
}
