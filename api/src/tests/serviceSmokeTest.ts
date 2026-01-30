import { InMemoryReservationRepository } from "../repositories/inMemoryReservationRepository.js";
import { ReservationService } from "../services/reservationService.js";

const run = async () => {
  const repository = new InMemoryReservationRepository();
  const service = new ReservationService(repository);

  const roomId = "room-a";
  const now = new Date();

  // Tulevaisuuden aloitus (esim. +1h)
  const start = new Date(now.getTime() + 60 * 60 * 1000);

  console.log("=== Create first reservation ===");
  const result1 = await service.createReservation({
    roomId,
    start,
    durationMinutes: 60,
    title: "First meeting",
    host: "Tester",
  });
  console.log("result1:", result1);

  console.log("\n=== Try overlapping reservation ===");
  const overlappingStart = new Date(
    start.getTime() + 30 * 60 * 1000,
  ); // 30min päällekkäin
  const result2 = await service.createReservation({
    roomId,
    start: overlappingStart,
    durationMinutes: 60,
    title: "Overlapping meeting",
    host: "Tester 2",
  });
  console.log("result2:", result2);

  console.log("\n=== List reservations for room ===");
  const listResult = await service.listReservationsForRoom({
    roomId,
  });
  console.log("listResult:", listResult);

  console.log("\n=== Delete reservation ===");
  if (result1.ok) {
    const deleteResult = await service.deleteReservation({
      reservationId: result1.value.id,
    });
    console.log("deleteResult:", deleteResult);
  }

  console.log("\n=== List all reservations after delete ===");
  const allAfterDelete =
    await service.listAllReservations();
  console.log("allAfterDelete:", allAfterDelete);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
