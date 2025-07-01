import { Request, Response, NextFunction } from 'express';
import { getTimeStamp, getUserId, handleLog } from '../utils';
import { TAuditOptions, TFileConfig } from '../types';

export const requestLogger = (config: TAuditOptions, fileConfig: TFileConfig, saveContent: (config: TFileConfig, content: any) => void) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        res.on('finish', () => {
            const user = getUserId(req);
            const duration = Date.now() - start;

            if ((res as any)._suppressAudit) {
                const content = {
                    type: "request",
                    action: "incoming request",
                    outcome: "failure",
                    duration,
                    method: req.method,
                    statusCode: req.statusCode || 500,
                    ip: req.ip ?? "unknown",
                    route: req.originalUrl,
                    userAgent: req.headers['user-agent'],
                    ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
                };
                handleLog(config, fileConfig, saveContent, content);
                return;
            }

            const content = {
                type: "request",
                action: "incoming request",
                duration,
                method: req.method,
                statusCode: req.statusCode || 200,
                route: req.originalUrl,
                statusMessage: req.statusMessage || "success",
                ip: req.ip ?? "unknown",
                userAgent: req.headers['user-agent'],
                userId: (typeof user === "string") ? user : user ? user?.id : "unknown",
                ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {})

            };
            handleLog(config, fileConfig, saveContent, content);
        });

        next();
    };
};

