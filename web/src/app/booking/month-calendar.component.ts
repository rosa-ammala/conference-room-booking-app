import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BookingStateService } from '../core/services/booking-state.service';
import { UtcDateKey } from '../core/models/booking-state.model';
import {
  addMonthsToDateKey,
  fromDateKeyUtc,
  getMonthNameFi,
  toDateKeyUtc,
  todayDateKeyUtc,
} from '../core/utils/date-time.util';
import {
  filterReservationsForDate,
  formatReservationSummary,
} from '../core/utils/slot.util';
import { Reservation } from '../core/models/reservation.model';
import { ReservationsApiService } from '../core/services/reservations-api.service';

interface MonthDayViewModel {
  dateKey: UtcDateKey;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isWeekendOrPast: boolean;
  reservations: Reservation[];
}

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './month-calendar.component.html',
  styleUrls: ['./month-calendar.component.scss'],
})
export class MonthCalendarComponent implements OnInit, OnDestroy {
  /** Päiväavaimet ruudussa (sis. edellisen/ seuraavan kuun päivät). */
  days: MonthDayViewModel[] = [];

  /** Teksti esim. "tammikuu 2026". */
  monthTitle = '';

  /** Poistovirheen viesti */
  deleteError: string | null = null;

  private currentMonthAnchorDateKey: UtcDateKey;
  private subscription?: Subscription;

  constructor(
    private readonly bookingState: BookingStateService,
    private readonly reservationsApi: ReservationsApiService,
    private readonly cdr: ChangeDetectorRef
  ) {
    // Ankkurikuukausi alussa = valitun päivän kuukausi
    this.currentMonthAnchorDateKey =
      bookingState.getSnapshot().selectedDateKey;
  }

  ngOnInit(): void {
    this.subscription = this.bookingState.state$.subscribe((state) => {
      this.rebuildCalendar(
        state.selectedDateKey,
        state.selectedRoomId,
        state.reservationsByRoomId[state.selectedRoomId ?? ''] ?? []
      );
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onPrevMonth(): void {
    this.currentMonthAnchorDateKey = addMonthsToDateKey(
      this.currentMonthAnchorDateKey,
      -1
    );
    const snapshot = this.bookingState.getSnapshot();
    this.rebuildCalendar(
      snapshot.selectedDateKey,
      snapshot.selectedRoomId,
      snapshot.selectedRoomId
        ? snapshot.reservationsByRoomId[snapshot.selectedRoomId] ?? []
        : []
    );
  }

  onNextMonth(): void {
    this.currentMonthAnchorDateKey = addMonthsToDateKey(
      this.currentMonthAnchorDateKey,
      +1
    );
    const snapshot = this.bookingState.getSnapshot();
    this.rebuildCalendar(
      snapshot.selectedDateKey,
      snapshot.selectedRoomId,
      snapshot.selectedRoomId
        ? snapshot.reservationsByRoomId[snapshot.selectedRoomId] ?? []
        : []
    );
  }

  onSelectDay(day: MonthDayViewModel): void {
    if (day.isWeekendOrPast) {
      return;
    }
    this.bookingState.setSelectedDateKey(day.dateKey);
  }

  onReservationClick(day: MonthDayViewModel, reservation: Reservation, event: MouseEvent): void {
    event.stopPropagation(); // estetään, ettei päivän klikkaus laukea

    const snapshot = this.bookingState.getSnapshot();
    const roomId = snapshot.selectedRoomId;
    if (!roomId) return;

    const message = `Poistetaanko varaus?\n${formatReservationSummary(reservation)}`;
    const ok = window.confirm(message);
    if (!ok) return;

    this.reservationsApi.deleteReservation(roomId, reservation.id).subscribe({
      next: () => {
        // Poistetaan varaus frontin tilasta
        this.bookingState.removeReservationFromRoom(roomId, reservation.id);
        this.deleteError = null;
        console.log('Varaus poistettu', reservation.id);
      },
      error: (error) => {
        console.error('Varauksen poisto epäonnistui', error);
        this.deleteError = 'Varauksen poisto epäonnistui. Yritä uudelleen.';
      },
    });
  }

  getReservationSummary(reservation: Reservation): string {
    return formatReservationSummary(reservation);
  }


  private rebuildCalendar(
    selectedDateKey: UtcDateKey,
    selectedRoomId: string | null,
    allReservationsForRoom: Reservation[]
  ): void {
    // Ankkuriksi currentMonthAnchorDateKey (huom: voi erota valitusta päivästä)
    const anchorDate = fromDateKeyUtc(this.currentMonthAnchorDateKey);
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth(); // 0-11

    const firstOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const firstJsDay = firstOfMonth.getDay(); // 0=Su,...6=La
    const diffToMonday = (firstJsDay + 6) % 7;  // Ma->0, Ti->1, Su->6

    // Kalenterin ensimmäinen näkyvä päivä = kuukauden eka maanantai tai sitä edeltävä
    const gridStart = new Date(firstOfMonth.getTime());
    gridStart.setDate(firstOfMonth.getDate() - diffToMonday);

    const todayKey = todayDateKeyUtc();

    const days: MonthDayViewModel[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getTime());
      d.setDate(gridStart.getDate() + i);

      const dateKey = toDateKeyUtc(d);
      const isCurrentMonth = d.getMonth() === month;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isPast = dateKey < todayKey;
      const isWeekendOrPast = isWeekend || isPast;
      const isSelected = dateKey === selectedDateKey;

      let reservationsForDay: Reservation[] = [];
      if (selectedRoomId) {
        reservationsForDay = filterReservationsForDate(
          allReservationsForRoom,
          dateKey
        );
      }

      days.push({
        dateKey,
        dayOfMonth: d.getDate(),
        isCurrentMonth,
        isSelected,
        isWeekendOrPast,
        reservations: reservationsForDay,
      });
    }

    this.days = days;

    console.log('Kalenteri rakennettu:', days);

    // Kuukausiotsikko
    const monthName = getMonthNameFi(firstOfMonth);
    this.monthTitle = `${monthName} ${year}`;
  }
}
