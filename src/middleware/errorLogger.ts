import { Request, Response, NextFunction } from 'express';
import { getTimeStamp, getUserId, handleLog } from '../utils';
import { TAuditOptions } from '../types';

export const errorLogger = (config: TAuditOptions, saveContent: (content: any) => void) => {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
        (res as any)._suppressAudit = true;
        const user = getUserId(req);
        const content = {
            type: "error",
            action: "request failed",
            method: req.method,
            statusCode: req.statusCode || 500,
            route: req.originalUrl,
            statusMessage: req.statusMessage || "Internal Server Error",
            ip: req.ip ?? "unknown",
            userAgent: req.headers['user-agent'],
            errorMessage: err.message,
            stack: (err.stack?.split('\n')[1] as string).trim(),
            userId: (typeof user === "string") ? user : user ? user?.id : "unknown",
            timeStamp: getTimeStamp()
        };
        handleLog(config, saveContent, content);

        next(err); // pass to default error handler
    };
};


