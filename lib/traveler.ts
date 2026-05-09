import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const FIVE_YEARS_SECONDS = 60 * 60 * 24 * 365 * 5;

export async function getTraveler(): Promise<{
  id: string | null;
  name: string | null;
}> {
  const c = await cookies();
  return {
    id: c.get("traveler_id")?.value ?? null,
    name: c.get("traveler_name")?.value ?? null,
  };
}

export async function setTraveler(name: string): Promise<void> {
  const c = await cookies();
  if (!c.get("traveler_id")?.value) {
    c.set("traveler_id", randomUUID(), {
      path: "/",
      maxAge: FIVE_YEARS_SECONDS,
      sameSite: "lax",
    });
  }
  c.set("traveler_name", name, {
    path: "/",
    maxAge: FIVE_YEARS_SECONDS,
    sameSite: "lax",
  });
}
