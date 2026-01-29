import {
  Reservation,
  ReservationDurationMinutes,
  RoomId,
  ReservationId,
} from './reservation.model';

/**
 * Päiväavain muodossa "YYYY-MM-DD".
 * Käytetään aina UTC-kalenteripäivän kuvaamiseen.
 */
export type UtcDateKey = string;

/**
 * Frontendin varausnäkymän tila.
 *
 * Tämä on "sisäinen" malli BookingStateServicelle ja UI-komponenteille.
 */
export interface BookingState {
  /**
   * Valittu huone varausta varten.
   * Voidaan tulevaisuudessa alustaa esim. ensimmäiseen huoneeseen.
   */
  selectedRoomId: RoomId | null;

  /**
   * Valitun päivän päiväavain (UTC).
   * Alustetaan nykyiseen päivään.
   */
  selectedDateKey: UtcDateKey;

  /**
   * Valittu varauksen kesto minuutteina.
   * Alustetaan esim. 60 minuuttiin (voi säätää myöhemmin).
   */
  selectedDurationMinutes: ReservationDurationMinutes;

  /**
   * Valittu aloitusaika uutena varauksena.
   *
   * ISO 8601 UTC -string (esim. "2026-01-28T10:00:00Z") tai null,
   * jos käyttäjä ei ole vielä valinnut slottia.
   */
  selectedStartIsoUtc: string | null;

  /**
   * Huonekohtainen varausten cache.
   *
   * Esimerkki:
   * {
   *   "room-a": [Reservation, Reservation, ...],
   *   "room-b": [...]
   * }
   */
  reservationsByRoomId: Record<RoomId, Reservation[]>;
}

/**
 * Pieni helper-tyyppi, jos halutaan välittää varauksen tunnistamiseen
 * liittyviä tietoja yhdessä paketissa (huone + varaus).
 */
export interface ReservationRef {
  roomId: RoomId;
  reservationId: ReservationId;
}
