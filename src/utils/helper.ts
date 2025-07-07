import chalk from 'chalk';
import { Request } from 'express';
import fs from "fs";
import path from "path";
import { AppConfig } from '../core/AppConfigs';
import { AuditContentParams, TFileConfig } from '../types';

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

export const handleLog = (fileConfig: TFileConfig, content: any) => {
    const config = AppConfig.getAuditOption()!;

    if (config.destinations?.includes("console"))
        logAuditEvent(content);
    if (config.destinations?.includes("file"))
        logAuditEvent(content, fileConfig);
};

export const saveToFile = (file: TFileConfig, content: any) => {
    const config = AppConfig.getAuditOption()!;

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

export const logAuditEvent = (content: any, file?: TFileConfig) => {
    const config = AppConfig.getAuditOption()!;
    if (file) {
        saveToFile(file, content);
        return;
    }
    config.logger?.info(content);
};

export const getFileLocation = (location: string) => {
    const config = AppConfig.getAuditOption()!;
    const defaultFileConfigs = AppConfig.getDefaultFileConfig()!;

    if (config.splitFiles) {
        const dbFile = defaultFileConfigs.find(x => x.fileName === location) as TFileConfig;
        return dbFile;
    }

    return AppConfig.getFileConfig()!;
};

export const generateAuditContent = ({
    type,
    action,
    message,
    ...rest
}: AuditContentParams) => {
    return {
        type,
        action,
        message,
        ...rest,
        ...(AppConfig.getAuditOption()?.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
    };
};
