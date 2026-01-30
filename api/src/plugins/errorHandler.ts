import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export const errorHandler = async (app: FastifyInstance) => {
  app.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        code: error.code,
        error: error.name,
        message: error.message,
      });
    }

    reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
    });
  });
};
