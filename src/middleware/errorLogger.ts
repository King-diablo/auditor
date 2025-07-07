import { NextFunction, Request, Response } from 'express';
import { AppConfig } from '../core/AppConfigs';
import { getFileLocation, getTimeStamp, getUserId, handleLog } from '../utils';

export const errorLogger = () => {
    const config = AppConfig.getAuditOption()!;
    const file = getFileLocation("error.log");

    return (err: any, req: Request, res: Response, next: NextFunction) => {
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
};


