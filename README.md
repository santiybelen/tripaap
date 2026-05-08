# Tripaap

Web app para organizar viajes en grupo: vuelos, hoteles, autos, excursiones, restaurantes y reservas — todo en un solo lugar, compartido con quien viaja con vos.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Postgres (Railway)
- Drizzle ORM
- Auth.js (NextAuth) con login por email/password
- Deploy: Railway

## Estructura

```
src/
├── app/              # Next.js App Router (UI + API)
├── auth.ts           # Auth.js config
├── db/
│   ├── index.ts      # Cliente Drizzle
│   ├── schema.ts     # Tablas en Drizzle
│   ├── init.sql      # Schema SQL idempotente (corre en cada deploy)
│   └── migrate.cjs   # Aplica init.sql a la DB
├── lib/utils.ts
└── types/
```

## Variables de entorno

Copiá `.env.example` a `.env` para referencia. En Railway, configurar en **Variables**:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string del Postgres de Railway (auto si Postgres está como servicio del mismo proyecto) |
| `AUTH_SECRET` | Secret para Auth.js. En Railway: clic en "Generate" para crearlo random. |
| `AUTH_URL` | En prod no hace falta — Auth.js lo detecta solo. |

## Setup en Railway (primera vez)

1. **Crear proyecto** → Railway → New Project → Deploy from GitHub → elegí `santiybelen/tripaap`.
2. **Agregar Postgres**: dentro del proyecto, "+ New" → "Database" → "Add PostgreSQL". Esto crea la variable `DATABASE_URL` y la inyecta al servicio web.
3. **Setear `AUTH_SECRET`**: en el servicio web → Variables → "+ New Variable" → `AUTH_SECRET` con valor random (botón "Generate").
4. **Deploy**: Railway hace push automático en cada commit a `main`. El comando de start corre las migraciones (`db:migrate`) y después arranca Next.js.

## Workflow

Cambios → push a `main` → Railway buildea y deploya.
