import {
  Reservation,
  ReservationDurationMinutes,
} from '../models/reservation.model';
import { UtcDateKey } from '../models/booking-state.model';
import {
  fromDateKeyUtc,
  toUtcIsoString,
  isStartInPast,
  parseUtcIsoString,
  toDateKeyUtc,
  formatTimeFromUtcIso,
} from './date-time.util';

export interface SlotInfo {
  /** Näytettävä label esim. "10:00" */
  label: string;
  /** Slotin aloitusaika ISO 8601 UTC -muodossa */
  startIsoUtc: string;
  /** Onko slotti menneisyydessä nykyhetkeen nähden (UTC) */
  isPast: boolean;
  /** Onko slotilla päällekkäisyyttä olemassa olevien varausten kanssa */
  hasConflict: boolean;
  /** Käytetäänkö slotti disablettuna UI:ssa (isPast || hasConflict) */
  disabled: boolean;
}

// Laskee työpäivän slotit (30 min step) annetulle päivälle ja kestolle.
export function computeDaySlots(params: {
  dateKey: UtcDateKey;
  durationMinutes: ReservationDurationMinutes;
  workdayStartHour: number; // esim. 8
  workdayEndHour: number;   // esim. 17
  reservations: Reservation[];
}): SlotInfo[] {
  const {
    dateKey,
    durationMinutes,
    workdayStartHour,
    workdayEndHour,
    reservations,
  } = params;

  const baseDate = fromDateKeyUtc(dateKey);
  const slots: SlotInfo[] = [];

  for (let hour = workdayStartHour; hour < workdayEndHour; hour++) {
    for (const minute of [0, 30]) {
      const startMinutes = hour * 60 + minute;
      const endMinutes = startMinutes + durationMinutes;
      const endHour = Math.floor(endMinutes / 60);

      // Slotin täytyy mahtua työpäivän sisään
      if (endHour > workdayEndHour || (endHour === workdayEndHour && endMinutes % 60 > 0)) {
        continue;
      }

      const slotDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, minute, 0, 0);

      // Konvertoi UTC:ksi backendille
      const startIsoUtc = toUtcIsoString(slotDate);
      const label = formatLabel(hour, minute);

      const isPast = isStartInPast(startIsoUtc);
      const hasConflict = hasOverlapWithReservations(
        startIsoUtc,
        durationMinutes,
        reservations
      );

      slots.push({
        label,
        startIsoUtc,
        isPast,
        hasConflict,
        disabled: isPast || hasConflict,
      });
    }
  }

  return slots;
}

function formatLabel(hour: number, minute: number): string {
  const hh = hour.toString().padStart(2, '0');
  const mm = minute.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function hasOverlapWithReservations(
  startIsoUtc: string,
  durationMinutes: number,
  reservations: Reservation[]
): boolean {
  const start = parseUtcIsoString(startIsoUtc).getTime();
  const end = start + durationMinutes * 60_000;

  return reservations.some((r) => {
    const resStart = parseUtcIsoString(r.start).getTime();
    const resEnd = parseUtcIsoString(r.end).getTime();

    // Yksinkertainen intervallien päällekkäisyystarkistus:
    // [start, end) ja [resStart, resEnd) overlappaavat jos:
    return start < resEnd && end > resStart;
  });
}

export function filterReservationsForDate(
  reservations: Reservation[],
  dateKey: UtcDateKey
): Reservation[] {
  return reservations.filter((r) => {
    const startDate = parseUtcIsoString(r.start);
    const startKey = toDateKeyUtc(startDate);
    return startKey === dateKey;
  });
}

/**
 * Muodostaa käyttäjälle näytettävän lyhyen tekstin yhdelle varaukselle,
 * muotoa:
 *
 * "10:00-11:30 Tiimipalaveri, Tiimi X"
 */
export function formatReservationSummary(reservation: Reservation): string {
  const startLabel = formatTimeFromUtcIso(reservation.start);
  const endLabel = formatTimeFromUtcIso(reservation.end);
  return `${startLabel}-${endLabel} ${reservation.title}, ${reservation.host}`;
}