import { InMemoryReservationRepository } from "./repositories/inMemoryReservationRepository.js";
import { ReservationService } from "./services/reservationService.js";

export const createContainer = () => {
  const reservationRepository = new InMemoryReservationRepository();
  const reservationService = new ReservationService(reservationRepository);

  return {
    reservationService,
  };
};

export type Container = ReturnType<typeof createContainer>;