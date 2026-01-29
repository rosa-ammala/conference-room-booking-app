import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Reservation, ReservationDurationMinutes } from '../core/models/reservation.model';
import { BookingStateService } from '../core/services/booking-state.service';
import {
  SlotInfo,
  computeDaySlots,
  filterReservationsForDate,
} from '../core/utils/slot.util';
import { environment } from '../../environments/environment';
import { ReservationsApiService } from '../core/services/reservations-api.service';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.scss'],
})
export class ReservationFormComponent implements OnInit, OnDestroy {
  readonly durations: ReservationDurationMinutes[] = [30, 60, 120, 180];

  selectedDuration: ReservationDurationMinutes = 60;
  timeSlots: SlotInfo[] = [];
  selectedStartIsoUtc: string | null = null;

  title = '';
  host = '';

  private subscription?: Subscription;

  constructor(
    private readonly bookingState: BookingStateService,
    private readonly reservationsApi: ReservationsApiService
  ) {}

  ngOnInit(): void {
    this.subscription = this.bookingState.state$.subscribe((state) => {
      const roomId = state.selectedRoomId;
      const dateKey = state.selectedDateKey;
      const duration = state.selectedDurationMinutes;

      this.selectedDuration = duration;
      this.selectedStartIsoUtc = state.selectedStartIsoUtc;

      const allReservationsForRoom = roomId
        ? state.reservationsByRoomId[roomId] ?? []
        : [];

      const reservationsForDay = filterReservationsForDate(
        allReservationsForRoom,
        dateKey
      );

      this.timeSlots = computeDaySlots({
        dateKey,
        durationMinutes: duration,
        workdayStartHour: environment.workdayStartHour,
        workdayEndHour: environment.workdayEndHour,
        reservations: reservationsForDay,
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onSelectDuration(duration: ReservationDurationMinutes): void {
    this.bookingState.setSelectedDurationMinutes(duration);
  }

  onSelectStart(slot: SlotInfo): void {
    if (slot.disabled) {
      return;
    }
    this.bookingState.setSelectedStartIsoUtc(slot.startIsoUtc);
  }

  onSubmit(): void {
    const snapshot = this.bookingState.getSnapshot();
    const roomId = snapshot.selectedRoomId;
    const duration = snapshot.selectedDurationMinutes;
    const startIsoUtc = snapshot.selectedStartIsoUtc;

    if (!roomId || !startIsoUtc || !this.title || !this.host) {
      console.warn('Varaus ei ole validi (puuttuu kenttiä), ei lähetetä.');
      return;
    }

    const request = {
      roomId,
      durationMinutes: duration,
      start: startIsoUtc,
      title: this.title,
      host: this.host,
    };

    this.reservationsApi.createReservation(request).subscribe({
      next: (created: Reservation) => {
        // Päivitetään huoneen varauslista lisäämällä uusi varaus
        const current = this.bookingState.getSnapshot();
        const existingForRoom =
          current.reservationsByRoomId[roomId] ?? [];
        const updatedForRoom = [...existingForRoom, created];

        this.bookingState.setReservationsForRoom(
          roomId,
          updatedForRoom
        );

        // Resetoi uusi-varaus -valinnat (mutta pidä huone ja päivä)
        this.bookingState.resetSelectionForNewReservation();

        // Tyhjennetään kentät
        this.title = '';
        this.host = '';

        console.log('Varaus luotu', created);
      },
      error: (error) => {
        // Tässä vaiheessa vain konsoli – myöhemmin näytetään käyttäjälle virhe
        console.error('Varauksen luonti epäonnistui', error);
      },
    });
  }
}
