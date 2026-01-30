import type { FastifyCorsOptions } from "@fastify/cors";
import { env } from "./env.js";

export const corsConfig: FastifyCorsOptions = {
  origin: env.corsOrigin,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};