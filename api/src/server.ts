import Fastify from "fastify";
import cors from '@fastify/cors';
import { InMemoryReservationRepository } from "./repositories/inMemoryReservationRepository.js";
import { ReservationService } from "./services/reservationService.js";
import { registerReservationRoutes } from "./routes/reservation.routes.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: 'http://localhost:4200', // Angular dev server
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

// DI: repo → service → reitit
const reservationRepository = new InMemoryReservationRepository();
const reservationService = new ReservationService(
  reservationRepository,
);

// Rekisteröidään varausreitit
registerReservationRoutes(app, reservationService);

app.get("/health", async () => {
  return { status: "ok" };
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
