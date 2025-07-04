import { Request } from 'express';
import { TAuditOptions, TFileConfig, } from '../types';
import fs from "fs";
import path from "path";
import chalk from 'chalk';

export const getTimeStamp = () => new Date().toISOString();
export const getUserId = (req: Request) => {
    try {
        if ("user" in req) {
            const user = req?.user as { id: string; } | { _id: string; };
            if (!user) return "unknown";
            if ("id" in user) {
                return user;
            } else return "unknown";
        }
        else "unknown";
        return "unknown";
    } catch (error) {
        return "unknown";
    }
};

export const handleLog = (config: TAuditOptions, fileConfig: TFileConfig, content: any) => {

    if (config.destinations?.includes("console"))
        logAuditEvent(config, content);
    if (config.destinations?.includes("file"))
        logAuditEvent(config, content, fileConfig);
};

export const saveToFile = (config: TAuditOptions, file: TFileConfig, content: any) => {
    try {
        fs.appendFileSync(file.fullPath, JSON.stringify(content, null, 4) + '\n', { encoding: "utf-8" });
    } catch (error) {
        config.logger?.error(chalk.red("Failed to save log to file"));
    }
};

export const createFile = (config: TFileConfig) => {
    const fullPath = path.join(process.cwd(), config.folderName);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }

    const dir = path.join(fullPath, config.fileName);

    return dir;
};

export const logAuditEvent = (config: TAuditOptions, content: any, file?: TFileConfig) => {
    if (file) {
        saveToFile(config, file, content);
        return;
    }
    config.logger?.info(content);
};