import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ReservationService } from "../services/reservationService.js";
import type { ReservationError } from "../services/reservationService.js";
import type { Reservation } from "../domain/reservation.js";
import {
  roomIdParamsSchema,
  deleteReservationParamsSchema,
  createReservationBodySchema,
  type RoomIdParams,
  type DeleteReservationParams,
  type CreateReservationBody,
} from "../validation/reservationSchemas.js";
import { parseIsoDateTime } from "../utils/dateParsing.js";
import type { RoomId } from "../domain/room.js";

interface ReservationDto {
  id: string;
  roomId: RoomId;
  durationMinutes: number;
  start: string;
  end: string;
  title: string;
  host: string;
}

const toReservationDto = (reservation: Reservation): ReservationDto => {
  return {
    id: reservation.id,
    roomId: reservation.roomId,
    durationMinutes: reservation.durationMinutes,
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    title: reservation.title,
    host: reservation.host,
  };
};

const mapReservationErrorToStatus = (error: ReservationError): number => {
  switch (error.code) {
    case "INVALID_ROOM":
      return 404;
    case "RESERVATION_NOT_FOUND":
      return 404;
    case "OVERLAPPING_RESERVATION":
      return 409;
    case "INVALID_DURATION":
    case "START_IN_PAST":
    case "END_BEFORE_START":
      return 400;
    default:
      return 400;
  }
};

export const registerReservationRoutes = (
  app: FastifyInstance,
  service: ReservationService,
) => {
  // Palauttaa huoneen kaikki varaukset.
  app.get("/rooms/:roomId/reservations", async (request: FastifyRequest<{ Params: RoomIdParams }>) => {
    const { roomId } = roomIdParamsSchema.parse(request.params);

    const result = await service.listReservationsForRoom({ roomId });

    if (!result.ok) {
      const status = mapReservationErrorToStatus(result.error);
      throw { statusCode: status, ...result.error };
    }

    return result.value.map(toReservationDto);
  });

  // Palauttaa kaikki varaukset huoneesta riippumatta. (debug / admin -henkinen reitti)
  app.get("/reservations", async (_request, reply) => {
    const reservations = await service.listAllReservations();
    return reservations.map(toReservationDto);
  });

  // Luo uuden varauksen.
  app.post("/rooms/:roomId/reservations", async (
      request: FastifyRequest<{
        Params: RoomIdParams;
        Body: CreateReservationBody;
      }>,
    ) => {
      // Params-validointi
      const { roomId } = roomIdParamsSchema.parse(request.params);
      const { start, durationMinutes, title, host } = createReservationBodySchema.parse(request.body);
      
      const startDate = parseIsoDateTime(start);

      if (!startDate) {
        throw {
          statusCode: 400,
          code: "INVALID_DATETIME",
          message: "Invalid start datetime format",
        };
      }

      const result = await service.createReservation({
        roomId,
        start: startDate,
        durationMinutes,
        title,
        host,
      });

      if (!result.ok) {
        const status = mapReservationErrorToStatus(result.error);
        throw { statusCode: status, ...result.error };
      }

      const dto = toReservationDto(result.value);

      // Peruslogitus
      request.log.info(
        { reservationId: dto.id, roomId: dto.roomId },
        "Reservation created",
      );

      return dto;
    }
  );

  // Poistaa varauksen id:n perusteella.
  // Huom: roomId on mukana URL:ssa REST-tyylisesti, mutta
  // poistologikka perustuu reservationId:hen.
  app.delete("/rooms/:roomId/reservations/:reservationId", async (
      request: FastifyRequest<{
        Params: DeleteReservationParams;
      }>
    ) => {
      const { reservationId } = deleteReservationParamsSchema.parse(request.params);

      const result = await service.deleteReservation({ reservationId });

      if (!result.ok) {
        const status = mapReservationErrorToStatus(result.error);
        throw { statusCode: status, ...result.error };
      }

      // Logita onnistunut poisto
      request.log.info({ reservationId }, "Reservation deleted");

      return { success: true };
    },
  );
};
