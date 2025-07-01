import { Request } from 'express';
import { TAuditOptions, TFileConfig, } from '../types';

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

export const handleLog = (config: TAuditOptions, fileConfig: TFileConfig, saveContent: (fileConfig: TFileConfig, content: any) => void, content: any) => {
    if (config.destinations?.includes("console"))
        config.logger?.info(content);
    if (config.destinations?.includes("file"))
        saveContent(fileConfig, content);
};