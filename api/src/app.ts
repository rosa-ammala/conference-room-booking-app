import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerReservationRoutes } from "./routes/reservation.routes.js";
import { corsConfig } from "./config/cors.js";
import type { Container } from "./container.js";
import { errorHandler } from "./plugins/errorHandler.js";

export const createApp = (container: Container) => {
  const app = Fastify({ logger: true });

  app.register(cors, corsConfig);
  app.register(errorHandler);

  registerReservationRoutes(app, container.reservationService);

  app.get("/health", async () => ({ status: "ok" }));

  return app;
};