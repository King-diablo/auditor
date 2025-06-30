import { Request, Response, NextFunction } from 'express';

export const requestLogger = (logger: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.info({
                type: "request",
                duration,
                method: req.method,
                statusCode: req.statusCode ?? 200,
                route: req.originalUrl,
                statusMessage: req.statusMessage ?? "success",
            });

        });

        next();
    };
};
