import "./globals.css";

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
    <html lang="es">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-sky-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
