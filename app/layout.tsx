import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "Tripaap",
  description: "Organizá viajes en grupo en un solo lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={jakarta.variable}>
      <body className="min-h-screen bg-gradient-to-br from-sky-100 via-violet-100 to-rose-100 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
