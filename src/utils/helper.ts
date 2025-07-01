import { Request } from 'express';
import { TAuditOptions } from '../types';

export const getTimeStamp = () => new Date().toISOString();
export const getUserId = (req: Request) => {
    if ("user" in req) {
        const user = req?.user as { id: string; } | { _id: string; };
        if (!user) return "unknown";
        if ("id" in user) {
            return user;
        } else return "unknown";
    }
    else "unknown";
};

export const handleLog = (config: TAuditOptions, saveContent: (content: any) => void, content: any) => {
    if (config.destinations?.includes("console"))
        config.logger.info(content);
    if (config.destinations?.includes("file"))
        saveContent(content);
};