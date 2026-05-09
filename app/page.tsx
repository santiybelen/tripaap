import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="bg-gradient-to-r from-sky-600 via-violet-600 to-rose-500 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
        Tripaap
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-700">
        Organizá viajes en grupo — vuelos, hoteles, autos, excursiones,
        restaurantes — en un solo lugar.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-2xl">
        <span title="Vuelos">✈️</span>
        <span title="Hoteles">🏨</span>
        <span title="Autos">🚗</span>
        <span title="Excursiones">🥾</span>
        <span title="Restaurantes">🍽️</span>
      </div>
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
