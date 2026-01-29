import { InMemoryReservationRepository } from "./repositories/inMemoryReservationRepository.js";
import type { RoomId } from "./domain/room.js";

const run = async () => {
  const repo = new InMemoryReservationRepository();
  const roomId: RoomId = "room-a";

  const now = new Date();
  const start = now;
  const end = new Date(now.getTime() + 30 * 60 * 1000); // +30min

  const created = await repo.create({
    roomId,
    durationMinutes: 30,
    start,
    end,
    title: "Test meeting",
    host: "Tester",
  });

  console.log("Created:", created);
  console.log("List by room:", await repo.listByRoom(roomId));
  console.log("List all:", await repo.listAll());

  const deleted = await repo.delete(created.id);
  console.log("Deleted:", deleted);
  console.log("List all after delete:", await repo.listAll());
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
