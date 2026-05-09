import type { TRANSPORT_MODES } from "../drizzle/schema";

export const TRANSPORT_LABELS: Record<(typeof TRANSPORT_MODES)[number], string> = {
  avion: "Avión",
  auto: "Auto",
  tren: "Tren",
  bus: "Bus",
  barco: "Barco",
  otro: "Otro",
};

export const TRANSPORT_ICON: Record<(typeof TRANSPORT_MODES)[number], string> = {
  avion: "✈️",
  auto: "🚗",
  tren: "🚂",
  bus: "🚌",
  barco: "⛴️",
  otro: "📍",
};
