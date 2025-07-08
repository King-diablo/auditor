import { NextFunction, Request, Response } from 'express';
import { FastifyError, FastifyReply } from 'fastify';
import { Context, Next } from 'koa';
import { AppConfig } from '../core/AppConfigs';
import { getFileLocation, getTimeStamp, getUserId, handleLog } from '../utils';
import { ExtendedFastifyRequest } from '../utils/interface';


const expressErrorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
    const config = AppConfig.getAuditOption()!;
    const file = getFileLocation("error.log");

    (res as any)._suppressAudit = true;
    const user = getUserId(req);
    let stackLine = "";
    if (err.stack) {
        const lines = err.stack.split('\n');
        stackLine = lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? "";
    }
    const content = {
        type: "error",
        action: "request failed",
        method: req.method,
        statusCode: res.statusCode || 500,
        route: req.originalUrl,
        statusMessage: res.statusMessage || "Internal Server Error",
        ip: req.ip ?? "unknown",
        userAgent: req.headers['user-agent'],
        errorMessage: err.message,
        stack: stackLine,
        userId: (typeof user === "string") ? user : user ? user?.id : "unknown",
        ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
    };

    handleLog(file, content);

    next(err); // pass to default error handler
};

const fastifyErrorLogger = (error: FastifyError, request: ExtendedFastifyRequest, reply: FastifyReply) => {
    const config = AppConfig.getAuditOption()!;
    const file = getFileLocation("error.log");
    let stackLine = "";
    if (error.stack) {
        const lines = error.stack?.split('\n');
        stackLine = lines ? lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? "" : error.message;
    }

    const content = {
        type: "error",
        action: "request failed",
        method: request.method,
        statusCode: reply.statusCode || 500,
        route: request.url,
        ip: request.ip ?? "unknown",
        userAgent: request.headers['user-agent'],
        errorMessage: error.message,
        stack: stackLine,
        userId: request.userId ?? "unknown",
        ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
    };

    handleLog(file, content);
};

const koaErrorLogger = async (ctx: Context, next: Next) => {
    const config = AppConfig.getAuditOption()!;
    const file = getFileLocation("error.log");
    const userId = ctx.state.userId ?? "unknown";

    try {
        await next();
    } catch (error) {

        if (ctx.status >= 400) {
            let stackLine = "";
            if (ctx.stack) {
                const lines = ctx.stack?.split('\n');
                stackLine = lines ? lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? null : ctx.message;
            }

            const content = {
                type: "error",
                action: "request failed",
                method: ctx.method,
                statusCode: ctx.statusCode || 500,
                route: ctx.url,
                ip: ctx.ip ?? "unknown",
                userAgent: ctx.headers['user-agent'],
                errorMessage: ctx.message,
                stack: stackLine,
                userId,
                ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
            };

            handleLog(file, content);
        }
    }
};


export const errorLogger = {
    express: expressErrorLogger,
    fastify: fastifyErrorLogger,
    koa: koaErrorLogger,
};


