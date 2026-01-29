import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { ReservationService } from "../services/reservationService.js";
import type {
  ReservationError,
} from "../services/reservationService.js";
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

const sendReservationError = (
  reply: FastifyReply,
  error: ReservationError,
) => {
  const status = mapReservationErrorToStatus(error);
  return reply.status(status).send({
    code: error.code,
    message: error.message,
  });
};

export const registerReservationRoutes = (
  app: FastifyInstance,
  service: ReservationService,
) => {
  // Palauttaa huoneen kaikki varaukset.
  app.get(
    "/rooms/:roomId/reservations",
    async (
      request: FastifyRequest<{ Params: RoomIdParams }>,
      reply: FastifyReply,
    ) => {
      const parseResult = roomIdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          message: "Invalid params",
          issues: parseResult.error.issues,
        });
      }

      const { roomId } = parseResult.data;

      const result = await service.listReservationsForRoom({
        roomId,
      });

      if (!result.ok) {
        return sendReservationError(reply, result.error);
      }

      const dtos = result.value.map(toReservationDto);
      return reply.status(200).send(dtos);
    },
  );

  // Palauttaa kaikki varaukset huoneesta riippumatta. (debug / admin -henkinen reitti)
  app.get("/reservations", async (_request, reply) => {
    const reservations = await service.listAllReservations();
    const dtos = reservations.map(toReservationDto);
    return reply.status(200).send(dtos);
  });

  // Luo uuden varauksen.
  app.post(
    "/rooms/:roomId/reservations",
    async (
      request: FastifyRequest<{
        Params: RoomIdParams;
        Body: CreateReservationBody;
      }>,
      reply: FastifyReply,
    ) => {
      // Params-validointi
      const paramsParse = roomIdParamsSchema.safeParse(
        request.params,
      );
      if (!paramsParse.success) {
        return reply.status(400).send({
          message: "Invalid params",
          issues: paramsParse.error.issues,
        });
      }

      // Body-validointi
      const bodyParse = createReservationBodySchema.safeParse(
        request.body,
      );
      if (!bodyParse.success) {
        return reply.status(400).send({
          message: "Invalid body",
          issues: bodyParse.error.issues,
        });
      }

      const { roomId } = paramsParse.data;
      const { start, durationMinutes, title, host } =
        bodyParse.data;

      const startDate = parseIsoDateTime(start);
      if (!startDate) {
        return reply.status(400).send({
          message: "Invalid start datetime format",
        });
      }

      const result = await service.createReservation({
        roomId,
        start: startDate,
        durationMinutes,
        title,
        host,
      });

      if (!result.ok) {
        return sendReservationError(reply, result.error);
      }

      const dto = toReservationDto(result.value);

      // Peruslogitus
      request.log.info(
        { reservationId: dto.id, roomId: dto.roomId },
        "Reservation created",
      );

      return reply.status(201).send(dto);
    },
  );

  // Poistaa varauksen id:n perusteella.
  // Huom: roomId on mukana URL:ssa REST-tyylisesti, mutta
  // poistologikka perustuu reservationId:hen.
  app.delete(
    "/rooms/:roomId/reservations/:reservationId",
    async (
      request: FastifyRequest<{
        Params: DeleteReservationParams;
      }>,
      reply: FastifyReply,
    ) => {
      const paramsParse =
        deleteReservationParamsSchema.safeParse(request.params);
      if (!paramsParse.success) {
        return reply.status(400).send({
          message: "Invalid params",
          issues: paramsParse.error.issues,
        });
      }

      const { reservationId } = paramsParse.data;

      const result = await service.deleteReservation({
        reservationId,
      });

      if (!result.ok) {
        return sendReservationError(reply, result.error);
      }

      // Logita onnistunut poisto
      request.log.info(
        { reservationId },
        "Reservation deleted",
      );

      return reply.status(204).send();
    },
  );
};
