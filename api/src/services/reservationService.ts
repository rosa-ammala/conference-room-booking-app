import type { ReservationRepository } from "../repositories/reservationRepository.js";
import type {
  Reservation,
  ReservationId,
} from "../domain/reservation.js";
import {
  isAllowedDuration,
} from "../domain/reservation.js";
import { isValidRoomId, type RoomId } from "../domain/room.js";
import {
  addMinutes,
  intervalsOverlap,
  isInPast,
} from "../utils/time.js";
import type { Result } from "../utils/result.js";
import { ok, err } from "../utils/result.js";

export type ReservationErrorCode =
  | "INVALID_ROOM"
  | "INVALID_DURATION"
  | "START_IN_PAST"
  | "END_BEFORE_START"
  | "OVERLAPPING_RESERVATION"
  | "RESERVATION_NOT_FOUND";

export interface ReservationError {
  code: ReservationErrorCode;
  message: string;
}

export interface CreateReservationInput {
  roomId: string;          // validoidaan isValidRoomId:llä
  start: Date;             // tulkittu Europe/Helsinki-ajasta Date-olioksi aiemmassa kerroksessa
  durationMinutes: number; // validoidaan isAllowedDuration:llä
  title: string;
  host: string;
}

export interface DeleteReservationInput {
  reservationId: ReservationId;
}

export interface ListReservationsForRoomInput {
  roomId: string;
}

export class ReservationService {
  constructor(
    private readonly repository: ReservationRepository,
  ) {}

  // Listaa kaikki varaukset yhdelle huoneelle.
  async listReservationsForRoom(
    input: ListReservationsForRoomInput,
  ): Promise<Result<Reservation[], ReservationError>> {
    const { roomId } = input;

    if (!isValidRoomId(roomId)) {
      return err({
        code: "INVALID_ROOM",
        message: `Unknown room id: ${roomId}`,
      });
    }

    const typedRoomId: RoomId = roomId;
    const reservations = await this.repository.listByRoom(
      typedRoomId,
    );

    return ok(reservations);
  }

  // Listaa kaikki varaukset riippumatta huoneesta. 
  // Tälle ei ole käytännössä virhetilaa, joten palautetaan suoraan lista.
  async listAllReservations(): Promise<Reservation[]> {
    return this.repository.listAll();
  }

  // Luo uuden varauksen business-sääntöjä noudattaen.
  async createReservation(
    input: CreateReservationInput,
  ): Promise<Result<Reservation, ReservationError>> {
    const {
      roomId,
      start,
      durationMinutes,
      title,
      host,
    } = input;

    // 1) Tarkista huone
    if (!isValidRoomId(roomId)) {
      return err({
        code: "INVALID_ROOM",
        message: `Unknown room id: ${roomId}`,
      });
    }
    const typedRoomId: RoomId = roomId;

    // 2) Tarkista kesto
    if (!isAllowedDuration(durationMinutes)) {
      return err({
        code: "INVALID_DURATION",
        message: `Invalid durationMinutes: ${durationMinutes}`,
      });
    }

    // 3) Laske end-aika
    const end = addMinutes(start, durationMinutes);

    // 4) Varmista, että start < end
    if (end.getTime() <= start.getTime()) {
      return err({
        code: "END_BEFORE_START",
        message:
          "Reservation end time must be after start time.",
      });
    }

    // 5) Ei menneisyyteen (start < now)
    if (isInPast(start)) {
      return err({
        code: "START_IN_PAST",
        message:
          "Reservation start time cannot be in the past.",
      });
    }

    // 6) Päällekkäisten varausten tarkistus
    const existingReservations =
      await this.repository.listByRoom(typedRoomId);

    const hasOverlap = existingReservations.some((r) =>
      intervalsOverlap(start, end, r.start, r.end),
    );

    if (hasOverlap) {
      return err({
        code: "OVERLAPPING_RESERVATION",
        message:
          "Reservation overlaps with an existing reservation.",
      });
    }

    // 7) Kaikki ok → luodaan varaus
    const created = await this.repository.create({
      roomId: typedRoomId,
      durationMinutes,
      start,
      end,
      title,
      host,
    });

    return ok(created);
  }

  // Poistaa varauksen id:n perusteella.
  async deleteReservation(
    input: DeleteReservationInput,
  ): Promise<Result<void, ReservationError>> {
    const { reservationId } = input;

    const deleted = await this.repository.delete(
      reservationId,
    );

    if (!deleted) {
      return err({
        code: "RESERVATION_NOT_FOUND",
        message: `Reservation not found: ${reservationId}`,
      });
    }

    return ok(undefined);
  }
}
