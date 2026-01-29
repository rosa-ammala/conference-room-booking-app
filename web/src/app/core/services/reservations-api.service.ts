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

@Injectable({
  providedIn: 'root',
})
export class ReservationsApiService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  // Palauttaa kaikki annetun huoneen varaukset.
  getRoomReservations(roomId: RoomId): Observable<Reservation[]> {
    const url = this.buildRoomReservationsUrl(roomId);
    console.log('Haetaan varaukset palvelimelta:', url);
    return this.http.get<Reservation[]>(url);
  }

  // Luo uuden varauksen annetulle huoneelle.
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

  // Poistaa olemassa olevan varauksen.
  deleteReservation(
    roomId: RoomId,
    reservationId: ReservationId
  ): Observable<void> {
    const url = `${this.buildRoomReservationsUrl(
      roomId
    )}/${encodeURIComponent(reservationId)}`;
    return this.http.delete<void>(url);
  }

  // Rakentaa huoneen varaus-endpointin URL:n.
  private buildRoomReservationsUrl(roomId: RoomId): string {
    return `${this.apiBaseUrl}/rooms/${encodeURIComponent(roomId)}/reservations`;
  }
}
