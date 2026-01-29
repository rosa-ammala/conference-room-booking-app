import {
  Reservation,
  ReservationDurationMinutes,
  RoomId,
  ReservationId,
} from './reservation.model';

export type DateKey = string;

// Frontendin varausnäkymän tila. 
// Tämä on "sisäinen" malli BookingStateServicelle ja UI-komponenteille.
export interface BookingState {
  selectedRoomId: RoomId | null;
  selectedDateKey: DateKey;
  selectedDurationMinutes: ReservationDurationMinutes;
  selectedStartIsoUtc: string | null;
  reservationsByRoomId: Record<RoomId, Reservation[]>;
}

// Pieni helper-tyyppi, jos halutaan välittää varauksen tunnistamiseen liittyviä tietoja
//  yhdessä paketissa (huone + varaus).
export interface ReservationRef {
  roomId: RoomId;
  reservationId: ReservationId;
}
