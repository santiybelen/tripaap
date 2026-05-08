import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-5xl font-bold tracking-tight">Tripaap</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-700">
        Organizá viajes en grupo — vuelos, hoteles, autos, excursiones,
        restaurantes — en un solo lugar.
      </p>
      <div className="mt-10">
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-white shadow-sm transition hover:bg-slate-800"
        >
          Ver mis viajes
          <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  );
}
