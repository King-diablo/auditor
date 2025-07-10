import { NextFunction, Request, Response } from 'express';
import { FastifyError, FastifyReply } from 'fastify';
import { Context, Next } from 'koa';
import { generateAuditContent, getFileLocation, getUserId, handleLog } from '../utils';
import { ExtendedFastifyRequest } from '../utils/interface';


const expressErrorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
    const file = getFileLocation("error.log");

    (res as any)._suppressAudit = true;
    const user = getUserId(req);
    let stackLine = "";
    if (err.stack) {
        const lines = err.stack.split('\n');
        stackLine = lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? "";
    }
    const content = generateAuditContent({
        type: "error",
        action: "request failed",
        method: req.method,
        statusCode: res.statusCode >= 400 ? res.statusCode : 500,
        route: req.originalUrl,
        statusMessage: res.statusMessage || "Internal Server Error",
        ip: req.ip ?? "unknown",
        userAgent: req.headers['user-agent'],
        message: err.message,
        stack: stackLine,
        fullStack: err.stack ?? "Invalid",
        userId: (typeof user === "string") ? user : user ? user?.id : "unknown",
    });

    handleLog(file, content);

    next(err); // pass to default error handler
};

const fastifyErrorLogger = (error: FastifyError, request: ExtendedFastifyRequest, reply: FastifyReply) => {
    const file = getFileLocation("error.log");
    let stackLine = "";
    if (error.stack) {
        const lines = error.stack?.split('\n');
        stackLine = lines ? lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? "" : error.message;
    }

    const content = generateAuditContent({
        type: "error",
        action: "request failed",
        method: request.method,
        statusCode: reply.statusCode || 500,
        route: request.url,
        ip: request.ip ?? "unknown",
        userAgent: request.headers['user-agent'],
        message: error.message,
        stack: stackLine,
        fullStack: error.stack ?? "Invalid",
        userId: request.userId ?? "unknown",
    });

    handleLog(file, content);
    return reply.send(error);
};

const koaErrorLogger = async (ctx: Context, next: Next) => {
    const file = getFileLocation("error.log");
    const userId = ctx.state.userId ?? "unknown";

    try {
        await next();
    } catch (error: any) {

        if (ctx.status >= 400) {
            let stackLine = "";
            if ((error as any).stack) {
                const lines = (error as any).stack.split('\n');
                stackLine = lines ? lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? null : (error as any).message;
            }

            const content = generateAuditContent({
                type: "error",
                action: "request failed",
                method: ctx.method,
                statusCode: ctx.statusCode || 500,
                message: (error as any).message,
                route: ctx.url,
                ip: ctx.ip ?? "unknown",
                userAgent: ctx.headers['user-agent'],
                stack: stackLine,
                fullStack: error.stack ?? "Invalid",
                userId,
            });

            handleLog(file, content);
        }
    }
};


export const errorLogger = {
    express: expressErrorLogger,
    fastify: fastifyErrorLogger,
    koa: koaErrorLogger,
};


