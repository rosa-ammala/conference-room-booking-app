import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Room } from '../core/models/room.model';
import { BookingStateService } from '../core/services/booking-state.service';
import { ReservationsApiService } from '../core/services/reservations-api.service';
import { RoomSelectorComponent } from './room-selector.component';
import { WeekStripComponent } from './week-strip.component';
import { MonthCalendarComponent } from './month-calendar.component';
import { ReservationFormComponent } from './reservation-form.component';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [
    CommonModule,
    RoomSelectorComponent,
    WeekStripComponent,
    MonthCalendarComponent,
    ReservationFormComponent,
  ],
  templateUrl: './booking-page.component.html',
  styleUrls: ['./booking-page.component.scss'],
})
export class BookingPageComponent implements OnDestroy {
  readonly rooms: Room[] = [
    { id: 'room-a', name: 'Room A' },
    { id: 'room-b', name: 'Room B' },
    { id: 'room-c', name: 'Room C' },
  ];

  loadError: string | null = null;

  private subscription?: Subscription;
  /** Pidetään kirjaa huoneista, joille varaukset on jo ladattu. */
  private loadedRoomIds = new Set<string>();

  constructor(
    private readonly bookingState: BookingStateService,
    private readonly reservationsApi: ReservationsApiService
  ) {
    // Alusta oletushuoneeksi ensimmäinen listasta
    const defaultRoomId = this.rooms[0]?.id ?? null;
    if (defaultRoomId) {
      this.bookingState.setSelectedRoomId(defaultRoomId);
      this.loadReservationsForRoomIfNeeded(defaultRoomId);
    }

    // Kuunnellaan huoneen vaihtumista ja haetaan varaukset uudelle huoneelle
    this.subscription = this.bookingState.state$.subscribe((state) => {
      const roomId = state.selectedRoomId;
      if (roomId) {
        this.loadReservationsForRoomIfNeeded(roomId);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onRoomSelected(roomId: string): void {
    this.bookingState.setSelectedRoomId(roomId);
    // varmuuden vuoksi varmistetaan haku tässäkin
    this.loadReservationsForRoomIfNeeded(roomId);
  }

  private loadReservationsForRoomIfNeeded(roomId: string): void {
    if (this.loadedRoomIds.has(roomId)) return;

    this.reservationsApi.getRoomReservations(roomId).subscribe({
      next: (reservations) => {
        this.bookingState.setReservationsForRoom(roomId, reservations);
        this.loadedRoomIds.add(roomId);
        this.loadError = null;
      },
      error: (error) => {
        console.error('Virhe haettaessa varauksia huoneelle', roomId, error);
        this.loadError = 'Huoneen varausten lataaminen epäonnistui. Yritä päivittää sivu.';
      },
    });
  }
}
