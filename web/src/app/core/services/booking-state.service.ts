import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  BookingState,
  DateKey,
} from '../models/booking-state.model';
import {
  Reservation,
  ReservationDurationMinutes,
  RoomId,
  ReservationId,
} from '../models/reservation.model';
import { todayDateKeyUtc } from '../utils/date-time.util';

@Injectable({
  providedIn: 'root',
})
export class BookingStateService {
  private readonly initialState: BookingState = {
    selectedRoomId: null,
    selectedDateKey: todayDateKeyUtc(),
    selectedDurationMinutes: 60,
    selectedStartIsoUtc: null,
    reservationsByRoomId: {},
  };

  private readonly stateSubject = new BehaviorSubject<BookingState>(
    this.initialState
  );

  /** Koko tila read-onlynä UI:lle */
  readonly state$ = this.stateSubject.asObservable();

  constructor() {}

  setSelectedRoomId(roomId: RoomId | null): void {
    this.patchState({ selectedRoomId: roomId });
  }

  setSelectedDateKey(dateKey: DateKey): void {
    this.patchState({
      selectedDateKey: dateKey,
      selectedStartIsoUtc: null,
    });
  }

  setSelectedDurationMinutes(duration: ReservationDurationMinutes): void {
    this.patchState({
      selectedDurationMinutes: duration,
      selectedStartIsoUtc: null,
    });
  }

  setSelectedStartIsoUtc(startIsoUtc: string | null): void {
    this.patchState({ selectedStartIsoUtc: startIsoUtc });
  }

  setReservationsForRoom(roomId: RoomId, reservations: Reservation[]): void {
    const current = this.stateSubject.value;
    const updatedByRoom = {
      ...current.reservationsByRoomId,
      [roomId]: reservations,
    };
    console.log('Säädetään varaukset huoneelle', roomId, reservations);

    this.patchState({ reservationsByRoomId: updatedByRoom });
  }

  removeReservationFromRoom(
    roomId: RoomId,
    reservationId: ReservationId
  ): void {
    const current = this.stateSubject.value;
    const currentList = current.reservationsByRoomId[roomId] ?? [];
    const nextList = currentList.filter((r) => r.id !== reservationId);

    const updatedByRoom = {
      ...current.reservationsByRoomId,
      [roomId]: nextList,
    };

    this.patchState({ reservationsByRoomId: updatedByRoom });
  }

  resetSelectionForNewReservation(): void {
    const current = this.stateSubject.value;
    this.patchState({
      selectedStartIsoUtc: null,
      selectedDurationMinutes: current.selectedDurationMinutes,
    });
  }

  resetAll(): void {
    this.stateSubject.next(this.initialState);
  }

  // Palauttaa nykyisen tilan synkronisesti (esim. lomakkeen submitissa).
  getSnapshot(): BookingState {
    return this.stateSubject.value;
  }

  private patchState(partial: Partial<BookingState>): void {
    const current = this.stateSubject.value;
    const next: BookingState = {
      ...current,
      ...partial,
    };
    this.stateSubject.next(next);
  }
}
