export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Tripaap</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Organizá viajes en grupo: vuelos, hoteles, autos y más, todo en un solo lugar.
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card title="Tu viaje, todo junto" body="Vuelos, hoteles, autos, excursiones y restaurantes en un solo plan." />
        <Card title="Decisiones en grupo" body="Cargá opciones, votan los participantes, confirmás la ganadora." />
        <Card title="Presupuesto compartido" body="Suma automática y división por persona." />
        <Card title="Documentos a mano" body="Vouchers y reservas adjuntas a cada ítem." />
      </section>
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
