import type { ITEM_KINDS } from "../drizzle/schema";

export const KIND_LABELS: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "Vuelo",
  hotel: "Hotel",
  auto: "Auto",
  restaurante: "Restaurante",
  bar: "Bar",
  disco: "Disco",
  excursion: "Excursión",
  otro: "Otro",
};

export const KIND_ICON: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "✈️",
  hotel: "🏨",
  auto: "🚗",
  restaurante: "🍽️",
  bar: "🍸",
  disco: "🪩",
  excursion: "🥾",
  otro: "📌",
};

export const KIND_PLURAL: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "Vuelos",
  hotel: "Hoteles",
  auto: "Autos",
  restaurante: "Restaurantes",
  bar: "Bares",
  disco: "Discos",
  excursion: "Excursiones",
  otro: "Otros",
};
