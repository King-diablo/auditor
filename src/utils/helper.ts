import chalk from 'chalk';
import { Request } from 'express';
import fs from "fs/promises";
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
            }
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

export const saveToFile = async (file: TFileConfig, content: any) => {
    const config = AppConfig.getAuditOption()!;

    try {
        await handleLogRotation(file);
        await fs.appendFile(file.fullPath, `${JSON.stringify(content)}\n`, { encoding: "utf-8" });

    } catch (error) {
        config?.logger?.error(chalk.red("Failed to save log to file"));
    }
};

export const createFile = async (config: TFileConfig) => {
    const fullPath = path.join(process.cwd(), config.folderName);
    if (!await pathExist(fullPath)) {
        await fs.mkdir(fullPath, { recursive: true });
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
    try {
        const requireFromUserProject = createRequire(path.join(process.cwd(), 'index.js'));
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

export const generateByte = (value: number = 5) => {
    return value * 1024 * 1024;
};


const handleLogRotation = async (fileConfig: TFileConfig) => {
    if (!fileLimitExceeded(fileConfig)) return;

    AppConfig.getAuditOption()?.logger?.warn(chalk.yellowBright(`${fileConfig.fileName} has reached or exceeded the size limit ${formatBytes(fileConfig.maxSizeBytes)}`));
    await createLogArchive(fileConfig);
    await clearOriginalArchive(fileConfig);
    await deleteArchives(fileConfig);
};

const fileLimitExceeded = async (fileConfig: TFileConfig) => {
    return (await fs.stat(fileConfig.fullPath)).size >= fileConfig.maxSizeBytes;
};

const createLogArchive = async (fileConfig: TFileConfig) => {
    const fullPath = path.join(process.cwd(), `${fileConfig.folderName}/archive`);
    if (!await pathExist(fullPath)) {
        await fs.mkdir(fullPath, { recursive: true });
    }
    const safeTimestamp = getTimeStamp().replace(/:/g, "-");
    const archiveName = `${fileConfig.fileName}_${safeTimestamp}.log`;
    const dir = path.join(fullPath, archiveName);

    await fs.copyFile(fileConfig.fullPath, dir);
};

const clearOriginalArchive = async (fileConfig: TFileConfig) => {
    await fs.writeFile(fileConfig.fullPath, "");
};

const deleteArchives = async (fileConfig: TFileConfig) => {
    const days = AppConfig.getAuditOption()?.maxRetention ?? 0;
    const logger = AppConfig.getAuditOption()?.logger;
    if (days <= 0) return;

    const archiveLocation = path.join(process.cwd(), `${fileConfig.folderName}/archive`);
    if (!await pathExist(archiveLocation)) return;

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() - days);

    const files = await fs.readdir(archiveLocation);

    for (const file of files) {
        const parts = file.split("_");
        const timeStamp = parts[1]?.replace(".log", "");
        if (!timeStamp) continue;

        let date: Date;
        try {
            date = restoreTimestamp(timeStamp);
        } catch {
            return;
        }

        if (date < expireDate) {
            const filePath = path.join(archiveLocation, file);
            await fs.rm(filePath);
        } else
            logger?.warn(chalk.yellowBright(`archive logs ${file} will be deleted soon after ${days} day(s) from now at ${expireDate}`));

    }
};

function restoreTimestamp(safe: string): Date {
    const [datePart, timePart] = safe.split('T');
    const restoredTime = timePart.replace(/-/g, ':');
    return new Date(`${datePart}T${restoredTime}`);
}

const pathExist = async (path: string) => {
    try {
        await fs.access(path);
        return true;
    } catch (error) {
        AppConfig.getAuditOption()?.logger?.error(chalk.redBright("failed to located directory/file"));
        return false;
    }
};



/**
* Converts a given number of bytes into a more readable string format with specified decimal places.
* @example
* formatBytes(1024)
* "1 KB"
* @param {number} bytes - The number of bytes to be converted.
* @param {number} decimals - The number of decimal places to include in the result. Defaults to 2.
* @returns {string} The formatted string representing the bytes in more convenient units.
* @description
*   - Handles different units ranging from bytes to petabytes.
*   - Uses logarithmic calculation to determine appropriate unit.
*/
function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / k ** i).toFixed(dm));

    return `${size} ${sizes[i]}`;
}



