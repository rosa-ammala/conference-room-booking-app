export type ReservationDurationMinutes = 30 | 60 | 120 | 180;
export type RoomId = string;
export type ReservationId = string;

// Backendin palauttama varausmalli.
export interface Reservation {
  id: ReservationId;
  roomId: RoomId;
  durationMinutes: ReservationDurationMinutes;
  start: string;
  end: string;
  title: string;
  host: string;
}

export interface CreateReservationRequest {
  roomId: RoomId;
  durationMinutes: ReservationDurationMinutes; // Backend laskee end-ajan durationMinutes + start-arvoista.
  start: string;
  title: string;
  host: string;
}
