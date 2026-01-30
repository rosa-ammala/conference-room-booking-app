import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4200",
  nodeEnv: process.env.NODE_ENV || "development",
} as const;
