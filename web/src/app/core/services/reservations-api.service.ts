import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateReservationRequest,
  Reservation,
  ReservationId,
  RoomId,
} from '../models/reservation.model';
import { environment } from '../../../environments/environment';

/**
 * Vastaa varaus-API:n kutsuista.
 *
 * - Ei sisällä UI-logiikkaa (ei snackbareja, ei dialogeja).
 * - Palauttaa tyypitetyt Observablit, joita komponentit voivat käyttää.
 */
@Injectable({
  providedIn: 'root',
})
export class ReservationsApiService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Palauttaa kaikki annetun huoneen varaukset.
   *
   * GET /rooms/:roomId/reservations
   */
  getRoomReservations(roomId: RoomId): Observable<Reservation[]> {
    const url = this.buildRoomReservationsUrl(roomId);
    console.log('Haetaan varaukset palvelimelta:', url);
    return this.http.get<Reservation[]>(url);
  }

  /**
   * Luo uuden varauksen annetulle huoneelle.
   *
   * POST /rooms/:roomId/reservations
   *
   * Huom:
   * - roomId tulee URL-parametrista.
   * - Backend laskee end-ajan.
   */
  createReservation(
    request: CreateReservationRequest
  ): Observable<Reservation> {
    const url = this.buildRoomReservationsUrl(request.roomId);

    // Backend ei tarvitse roomId:tä bodyssa, se tulee URL:sta.
    const body = {
      durationMinutes: request.durationMinutes,
      start: request.start,
      title: request.title,
      host: request.host,
    };

    return this.http.post<Reservation>(url, body);
  }

  /**
   * Poistaa olemassa olevan varauksen.
   *
   * DELETE /rooms/:roomId/reservations/:reservationId
   */
  deleteReservation(
    roomId: RoomId,
    reservationId: ReservationId
  ): Observable<void> {
    const url = `${this.buildRoomReservationsUrl(
      roomId
    )}/${encodeURIComponent(reservationId)}`;
    return this.http.delete<void>(url);
  }

  /**
   * Rakentaa huoneen varaus-endpointin URL:n.
   *
   * Esim: http://localhost:3000/rooms/room-a/reservations
   */
  private buildRoomReservationsUrl(roomId: RoomId): string {
    return `${this.apiBaseUrl}/rooms/${encodeURIComponent(roomId)}/reservations`;
  }
}
