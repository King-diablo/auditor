import { Request, Response, NextFunction } from 'express';

export const errorLogger = (logger: any) => {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
        const customLogger = handleLog(logger, req, res);
        const start = Date.now();

        if (err instanceof Error) {
            const duration = Date.now() - start;
            customLogger(err, duration);
        }


        next(err); // pass to default error handler
    };
};

const handleLog = <T extends Error>(logger: any, req: Request, res: Response) => {
    return (err: T, duration: number) => {
        logger.info({
            type: "error",
            duration,
            method: req.method,
            statusCode: req.statusCode ?? 500,
            route: req.originalUrl,
            statusMessage: req.statusMessage ?? "Internal Server Error",
            errorMessage: err.message,
            stack: err.stack
        });
    };
};
