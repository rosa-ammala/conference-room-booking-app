import { randomUUID } from "node:crypto";
import type { ReservationRepository } from "./reservationRepository.js";
import type {
  Reservation,
  NewReservation,
  ReservationId,
} from "../domain/reservation.js";
import type { RoomId } from "../domain/room.js";

export class InMemoryReservationRepository
  implements ReservationRepository
{
  private reservations: Reservation[] = [];

  async listByRoom(roomId: RoomId): Promise<Reservation[]> {
    return this.reservations
      .filter((reservation) => reservation.roomId === roomId)
      .sort(
        (a, b) =>
          a.start.getTime() - b.start.getTime(),
      );
  }

  async listAll(): Promise<Reservation[]> {
    return [...this.reservations].sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime(),
    );
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    const reservation = this.reservations.find(
      (r) => r.id === id,
    );
    return reservation ?? null;
  }

  async create(data: NewReservation): Promise<Reservation> {
    const reservation: Reservation = {
      id: randomUUID(),
      ...data,
    };

    this.reservations.push(reservation);
    return reservation;
  }

  async delete(id: ReservationId): Promise<boolean> {
    const index = this.reservations.findIndex(
      (r) => r.id === id,
    );

    if (index === -1) {
      return false;
    }

    this.reservations.splice(index, 1);
    return true;
  }
}
