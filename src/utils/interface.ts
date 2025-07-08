import { FastifyRequest } from "fastify/types/request";

export interface ExtendedFastifyRequest extends FastifyRequest {
    startTime: number;
    userId: string;
}