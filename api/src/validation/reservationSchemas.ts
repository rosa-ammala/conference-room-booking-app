import { z } from "zod";
import { ALLOWED_DURATIONS } from "../domain/reservation.js";

export const roomIdParamsSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
});

export const deleteReservationParamsSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
  reservationId: z.string().min(1, "reservationId is required"),
});

export const createReservationBodySchema = z.object({
  start: z
    .string()
    .min(1, "start is required"), // tarkempi ISO-check tehdään parsimalla
  durationMinutes: z
    .number()
    .int("durationMinutes must be an integer")
    .refine(
      (value) => ALLOWED_DURATIONS.includes(value as any),
      {
        message: `durationMinutes must be one of [${ALLOWED_DURATIONS.join(
          ", ",
        )}]`,
      },
    ),
  title: z.string().min(1, "title is required"),
  host: z.string().min(1, "host is required"),
});

export type RoomIdParams = z.infer<typeof roomIdParamsSchema>;
export type DeleteReservationParams = z.infer<
  typeof deleteReservationParamsSchema
>;
export type CreateReservationBody = z.infer<
  typeof createReservationBodySchema
>;
