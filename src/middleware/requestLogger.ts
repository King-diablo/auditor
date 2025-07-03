import { Request, Response, NextFunction } from 'express';
import { getTimeStamp, getUserId, handleLog } from '../utils';
import { TAuditOptions, TFileConfig, TSaveContext } from '../types';
import { userProfile } from '../utils/user';


export const requestLogger = (config: TAuditOptions, fileConfig: TFileConfig) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        const route = req.originalUrl;
        const ip = req.ip ?? "unknown";
        const user = getUserId(req);
        const id = (typeof user === "string") ? user : user ? user?.id : "unknown";

        userProfile.BuildProfile(id, route, ip);

        res.on('finish', () => {
            const duration = Date.now() - start;

            if ((res as any)._suppressAudit) {
                const content = {
                    type: "request",
                    action: "incoming request",
                    outcome: "failure",
                    duration,
                    method: req.method,
                    statusCode: req.statusCode || 500,
                    ip,
                    route,
                    userAgent: req.headers['user-agent'],
                    ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
                };
                handleLog(config, fileConfig, content);
                return;
            }
            const content = {
                type: "request",
                action: "incoming request",
                duration,
                method: req.method,
                statusCode: req.statusCode || 200,
                route: route,
                statusMessage: req.statusMessage || "success",
                ip,
                userAgent: req.headers['user-agent'],
                userId: id,
                ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {})

            };
            handleLog(config, fileConfig, content);
        });
        next();
    };
};

