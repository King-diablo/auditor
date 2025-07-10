import chalk from 'chalk';
import { Request } from 'express';
import fs from "fs";
import path from "path";
import { AppConfig } from '../core/AppConfigs';
import { AuditContentParams, TFileConfig } from '../types';
import crypto from "crypto";
import { createRequire } from 'module';

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
        fs.appendFileSync(file.fullPath, `${JSON.stringify(content)}\n`, { encoding: "utf-8" });

    } catch (error) {
        config?.logger?.error(chalk.red("Failed to save log to file"));
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

    const cleanContent = { ...content };
    delete cleanContent.fullStack;

    config?.logger?.info(cleanContent);
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
        id: generateId(),
        type,
        action,
        message,
        ...rest,
        ...(AppConfig.getAuditOption()?.useTimeStamp ? { timeStamp: getTimeStamp() } : {}),
    };
};

export const generateId = () => {
    const time = Date.now().toString(36);
    const rand = crypto.randomBytes(3).toString('hex');
    return `${time}-${rand}`;
};

export const checkForModule = (item: string) => {
    const requireFromUserProject = createRequire(path.join(process.cwd(), 'index.js'));

    try {
        AppConfig.getAuditOption()?.logger?.info(
            chalk.blueBright(`Checking for ${item}`),
        );
        requireFromUserProject.resolve(item);
        AppConfig.getAuditOption()?.logger?.info(
            chalk.greenBright(`${item} found.`),
        );
        return true;
    } catch (error) {
        AppConfig.getAuditOption()?.logger?.info(
            chalk.redBright(`Failed to find "${item}"`),
        );
        return false;
    }
};


