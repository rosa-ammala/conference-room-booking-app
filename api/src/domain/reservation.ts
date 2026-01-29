import type { RoomId } from "./room.js";

export type ReservationId = string;

// Sallitut kestot minuutteina
export type DurationMinutes = 30 | 60 | 120 | 180;

export interface Reservation {
  id: ReservationId;
  roomId: RoomId;
  durationMinutes: DurationMinutes;

  // Sisäisesti käsitellään Date-olioina (UTC-hetkinä)
  start: Date;
  end: Date;
  
  title: string;
  host: string;
}

export type NewReservation = Omit<Reservation, "id">;

export const ALLOWED_DURATIONS: DurationMinutes[] = [30, 60, 120, 180];

export const isAllowedDuration = (
  duration: number,
): duration is DurationMinutes => {
  return ALLOWED_DURATIONS.includes(duration as DurationMinutes);
};
