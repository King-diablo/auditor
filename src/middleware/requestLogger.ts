import { NextFunction, Request, Response } from 'express';
import { AppConfig } from '../core/AppConfigs';
import { getFileLocation, getTimeStamp, getUserId, handleLog } from '../utils';
import { userProfile } from '../utils/user';


export const requestLogger = () => {
    const config = AppConfig.getAuditOption()!;
    const file = getFileLocation("request.log");

    return (req: Request, res: Response, next: NextFunction) => {
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
                const content = {
                    type: "request",
                    action: "incoming request",
                    outcome: "failure",
                    duration,
                    method: req.method,
                    statusCode: res.statusCode || 500,
                    ip,
                    route,
                    userAgent,
                    userId: id,
                    ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
                };
                handleLog(file, content);
                return;
            }
            const content = {
                type: "request",
                action: "incoming request",
                duration,
                method: req.method,
                statusCode: res.statusCode || 200,
                route: route,
                statusMessage: res.statusMessage || "success",
                ip,
                userAgent,
                userId: id,
                ...(config.useTimeStamp ? { timeStamp: getTimeStamp() } : {})
            };
            handleLog(file, content);
        });
        next();
    };
};

