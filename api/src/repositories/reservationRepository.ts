import type {
  Reservation,
  NewReservation,
  ReservationId,
} from "../domain/reservation.js";
import type { RoomId } from "../domain/room.js";

export interface ReservationRepository {
  listByRoom(roomId: RoomId): Promise<Reservation[]>;
  listAll(): Promise<Reservation[]>;

  findById(id: ReservationId): Promise<Reservation | null>;
  create(data: NewReservation): Promise<Reservation>;
  delete(id: ReservationId): Promise<boolean>;
}
