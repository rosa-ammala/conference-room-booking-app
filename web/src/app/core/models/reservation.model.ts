/**
 * Sallitut varauksen kestot minuutteina.
 *
 * Päätetty: 30, 60, 120, 180.
 */
export type ReservationDurationMinutes = 30 | 60 | 120 | 180;

export type RoomId = string;
export type ReservationId = string;

/**
 * Backendin palauttama varausmalli.
 *
 * Huom:
 * - start ja end ovat ISO 8601 UTC -stringejä (esim. "2026-01-28T10:00:00Z").
 * - UI näyttää ajat muodossa "HH:mm" käyttäen UTC-aikaa "toimistoaikana".
 */
export interface Reservation {
  id: ReservationId;
  roomId: RoomId;
  durationMinutes: ReservationDurationMinutes;
  start: string; // ISO datetime (UTC)
  end: string;   // ISO datetime (UTC)
  title: string; // pakollinen, max 100 merkkiä (validoidaan UI:ssa/backendissä)
  host: string;  // pakollinen, max 100 merkkiä (validoidaan UI:ssa/backendissä)
}

/**
 * POST /rooms/:roomId/reservations body.
 *
 * Backend laskee end-ajan durationMinutes + start-arvoista.
 *
 * Huom:
 * - roomId tulee URL-parametrista, mutta pidetään mukana tyypissä dokumentaation vuoksi.
 * - Kaikki kentät pakollisia (business-päätös).
 */
export interface CreateReservationRequest {
  roomId: RoomId;
  durationMinutes: ReservationDurationMinutes;
  start: string; // ISO datetime (UTC)
  title: string; // max 100
  host: string;  // max 100
}
