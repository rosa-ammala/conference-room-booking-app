import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BookingStateService } from '../core/services/booking-state.service';
import { UtcDateKey } from '../core/models/booking-state.model';
import {
  fromDateKeyUtc,
  toDateKeyUtc,
  todayDateKeyUtc,
  addDaysToDateKey,
} from '../core/utils/date-time.util';

interface WeekDayViewModel {
  dateKey: UtcDateKey;
  labelShort: string;   // esim. "Ma"
  dayOfMonth: number;   // esim. 28
  isSelected: boolean;
  isWeekendOrPast: boolean;
}

@Component({
  selector: 'app-week-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './week-strip.component.html',
  styleUrls: ['./week-strip.component.scss'],
})
export class WeekStripComponent implements OnInit, OnDestroy {
  days: WeekDayViewModel[] = [];

  private subscription?: Subscription;

  constructor(private readonly bookingState: BookingStateService) {}

  ngOnInit(): void {
    this.subscription = this.bookingState.state$.subscribe((state) => {
      this.buildWeek(state.selectedDateKey);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onPrevWeek(): void {
    const snapshot = this.bookingState.getSnapshot();
    const newDateKey = addDaysToDateKey(snapshot.selectedDateKey, -7);
    this.bookingState.setSelectedDateKey(newDateKey);
  }

  onNextWeek(): void {
    const snapshot = this.bookingState.getSnapshot();
    const newDateKey = addDaysToDateKey(snapshot.selectedDateKey, +7);
    this.bookingState.setSelectedDateKey(newDateKey);
  }

  onSelectDay(day: WeekDayViewModel): void {
    if (day.isWeekendOrPast) {
      return;
    }
    this.bookingState.setSelectedDateKey(day.dateKey);
  }

  private buildWeek(selectedDateKey: UtcDateKey): void {
    const selectedDate = fromDateKeyUtc(selectedDateKey);
    const todayKey = todayDateKeyUtc();

    // Haetaan viikon maanantai (paikallinen aika)
    const jsDay = selectedDate.getDay(); // 0=Su,1=Ma,...6=La
    const diffToMonday = (jsDay + 6) % 7;  // Ma ->0, Ti->1, Su->6
    const monday = new Date(selectedDate.getTime());
    monday.setDate(monday.getDate() - diffToMonday);

    const days: WeekDayViewModel[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime());
      d.setDate(monday.getDate() + i);

      const dateKey = toDateKeyUtc(d);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isPast = dateKey < todayKey;
      const isWeekendOrPast = isWeekend || isPast;
      const isSelected = dateKey === selectedDateKey;

      days.push({
        dateKey,
        labelShort: this.getWeekdayLabel(d.getDay()),
        dayOfMonth: d.getDate(),
        isSelected,
        isWeekendOrPast,
      });
    }

    this.days = days;
  }

  private getWeekdayLabel(jsDay: number): string {
    // 0=Su, 1=Ma, ..., 6=La
    const labels = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
    return labels[jsDay] ?? '';
  }
}
