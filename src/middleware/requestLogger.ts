import { NextFunction, Request, Response } from 'express';
import { FastifyReply, HookHandlerDoneFunction } from "fastify";
import { Context, Next } from "koa";
import { SupportedLoggersRequest } from '../types';
import { generateAuditContent, getFileLocation, getUserId, handleLog } from '../utils';
import { ExtendedFastifyRequest } from '../utils/interface';
import { userProfile } from '../utils/user';


/**
* Middleware function for logging HTTP request details with express framework.
* @example
* expressLogger(req, res, next)
* No return value as it is middleware.
* @param {Request} req - Express request object containing HTTP request details.
* @param {Response} res - Express response object to capture status and headers.
* @param {NextFunction} next - Callback to pass control to the next middleware or handler.
* @returns {void} This function does not return a value, it passes control to the next middleware.
* @description
*   - The function initializes logging parameters such as start time, route, IP, user agent, and user ID.
*   - Utilizes helper methods like `getUserId`, `BuildProfile`, `getFileLocation`, and `handleLog`.
*   - Suppress audit feature checks the response object flag to alter logging behavior.
*   - Configurable timestamp inclusion based on application settings.
*/
const expressLogger = (req: Request, res: Response, next: NextFunction) => {
    const file = getFileLocation("request.log");
    const start = Date.now();
    const route = req.originalUrl;
    const ip = req.ip ?? "unknown";
    const userAgent = req.headers['user-agent'] || '';
    const user = getUserId(req);
    const id = (typeof user === "string") ? user : user ? user?.id : "unknown";

    userProfile.BuildProfile(id, route, ip, userAgent);

    res.on('finish', () => {
        const duration = Date.now() - start;

        if ((res as any)._suppressAudit) {
            const content = generateAuditContent({
                type: "request",
                action: "incoming request",
                message: req.statusMessage ?? res.statusMessage ?? `[${route}]||[${req.method}]||[${[res.statusCode]}]`,
                outcome: "failure",
                duration,
                method: req.method,
                statusCode: res.statusCode || 500,
                ip,
                route,
                userAgent,
                userId: id,
            });
            handleLog(file, content);
            return;
        }
        const content = generateAuditContent({
            type: "request",
            action: "incoming request",
            outcome: "success",
            duration,
            method: req.method,
            statusCode: res.statusCode || 200,
            message: req.statusMessage ?? res.statusMessage ?? `[${route}]||[${req.method}]||[${[res.statusCode]}]`,
            route: route,
            statusMessage: res.statusMessage || "success",
            ip,
            userAgent,
            userId: id,
        });
        handleLog(file, content);
    });
    next();
};

/**
* Sets up Fastify request logging middleware functions.
* @example
* fastifyLogger()
* No return value as it is middleware.
* @returns {object} An object with `onRequest` and `OnResponse` methods for lifecycle event handling.
* @description
*   - Initializes request start time and calculates duration for response.
*   - Incorporates failure condition for logging based on status code.
*   - Logs essential request details using `handleLog` function.
*   - Configurable timestamp inclusion via global settings.
*/
const fastifyLogger = {
    onRequest: (request: ExtendedFastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
        request.startTime = Date.now();
        const id = request.userId ?? "unknown";
        const route = request.url;
        const { ip } = request;
        const userAgent = request.headers['user-agent'] || '';

        userProfile.BuildProfile(id, route, ip, userAgent);

        done();
    },
    onResponse: (request: ExtendedFastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
        const file = getFileLocation("request.log");
        const duration = Date.now() - (request.startTime || Date.now());
        const route = userProfile.getEndPoint() ?? "unknown";
        const content = generateAuditContent({
            type: "request",
            action: "incoming request",
            duration,
            method: request.method,
            statusCode: reply.statusCode || 500,
            message: `[${route}]||[${request.method}]||[${[reply.statusCode]}]`,
            ip: userProfile.getIp() ?? "unknown",
            route,
            userAgent: userProfile.getUserAgent() ?? "unknown",
            userId: request.userId ?? "unknown",
        });
        handleLog(file, content);
        done();
    },
};

/**
* Middleware function for Koa that logs HTTP request details and audits requests.
* @example
* async koaLogger(ctx, next)
* No return value as it is middleware.
* @param {Context} ctx - Koa context object containing HTTP request and response details.
* @param {Next} next - Function to pass control to the next middleware or handler.
* @returns {Promise<void>} This function does not return a value, it awaits the next middleware.
* @description
*   - Extracts user ID from the Koa context state and defaults to "unknown" if absent.
*   - Calculates duration of request handling for performance auditing.
*   - Configures log content including request and response details.
*   - Utilizes helper methods like `getTimeStamp` and `handleLog`.
*/
const koaLogger = async (ctx: Context, next: Next) => {
    const file = getFileLocation("request.log");
    const start = Date.now();
    const userId = ctx.state.userId ?? "unknown";
    const route = ctx.request.url;
    const ip = ctx.request.ip ?? "unknown";
    const userAgent = ctx.request.headers["user-agent"] || "";
    userProfile.BuildProfile(userId, route, ip, userAgent);

    try {
        await next();
    } finally {
        const duration = Date.now() - start;

        const content = generateAuditContent({
            type: "request",
            action: "incoming request",
            duration,
            method: ctx.request.method,
            statusCode: ctx.res.statusCode || 500,
            message: ctx.message ?? `[${route}]||[${ctx.request.method}]||[${[ctx.status]}]`,
            ip,
            route,
            userAgent,
            userId,
        });
        handleLog(file, content);
    }
};

export const requestLogger: SupportedLoggersRequest = {
    express: expressLogger,
    fastify: fastifyLogger,
    koa: koaLogger,
};