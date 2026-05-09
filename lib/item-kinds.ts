import type { ITEM_KINDS } from "../drizzle/schema";

export const KIND_LABELS: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "Vuelo",
  hotel: "Hotel",
  auto: "Auto",
  excursion: "Excursión",
  restaurante: "Restaurante",
  otro: "Otro",
};

export const KIND_ICON: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "✈️",
  hotel: "🏨",
  auto: "🚗",
  excursion: "🥾",
  restaurante: "🍽️",
  otro: "📌",
};
