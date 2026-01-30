import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class BookingPageComponent implements OnInit, OnDestroy {
  rooms: Room[] = [];
  selectedRoomId: string | null = null;
  loadError: string | null = null;
  isLoadingRooms = true;

  private subscription?: Subscription;

  constructor(
    private readonly bookingState: BookingStateService,
    private readonly reservationsApi: ReservationsApiService
  ) {}

  ngOnInit(): void {
    this.reservationsApi.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.isLoadingRooms = false;

        // Aseta oletushuone, jos mikään ei ole vielä valittuna
        const defaultRoomId = this.rooms[0]?.id ?? null;
        if (defaultRoomId) {
          this.bookingState.setSelectedRoomId(defaultRoomId);
          this.selectedRoomId = defaultRoomId;
        }
      }, 
      error: (error) => {
        console.error('Virhe haettaessa huoneita', error);
        this.loadError = 'Huoneiden lataaminen epäonnistui.';
        this.isLoadingRooms = false;
      }
    });

    // Kuunnellaan huoneen vaihtumista ja haetaan varaukset uudelle huoneelle
    this.subscription = this.bookingState.state$.subscribe((state) => {
      this.selectedRoomId = state.selectedRoomId;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onRoomSelected(roomId: string): void {
    this.bookingState.setSelectedRoomId(roomId);
  }
}
