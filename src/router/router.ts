import chalk from "chalk";
import { constants, createWriteStream } from "fs";
import { access, mkdir, rm } from "fs/promises";
import path from "path";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from "url";
import { AppConfig } from "../core/AppConfigs";
import { checkForModule } from "../utils";
import { createExpressRouter } from "./expressRouter";
import { createFastifyRouter } from "./fastifyRouter";
import { createKoaRouter } from "./koaRouter";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiPath = path.join(__dirname, "ui");

const expressRouter = createExpressRouter(uiPath);
const koaRouter = createKoaRouter(uiPath);
const fastifyRouter = createFastifyRouter(uiPath);

export const checkForFramework = () => {
    const activeFramework = AppConfig.getFramework() as string;
    return checkForModule(activeFramework);
};


/**
 * An object that maps supported web frameworks to their corresponding router implementations.
 *
 * @property {Router} express - The router implementation for Express.js.
 * @property {Router} fastify - The router implementation for Fastify.
 * @property {Router} koa - The router implementation for Koa.
 */
export const UIRouter = {
    express: expressRouter,
    fastify: fastifyRouter,
    koa: koaRouter,
};


/**
* Downloads necessary dependencies if they do not already exist locally.
* @example
* downloadDependency()
* No direct return value, performs asynchronous file download operations.
* @returns {Promise<void>} Completes once all files are downloaded. No explicit return value.
* @description
*   - Utilizes the `downloadFile` function to fetch files from specified URLs.
*   - Checks local existence of files to avoid redundant downloads.
*   - Logs progress and errors using the application's logging configuration.
*   - Downloads occur in sequence, ensuring operations are completed orderly.
*/
export const downloadDependency = async () => {
    const logger = AppConfig.getAuditOption()?.logger;
    const baseUrl = 'https://raw.githubusercontent.com/King-diablo/auditor/refs/heads/master/src/ui';
    const dependenciesBaseUrl = 'https://cdn.jsdelivr.net/npm';
    const downloadable = [
        {
            url: `${dependenciesBaseUrl}/html2canvas@1.4.1/dist/html2canvas.min.js`,
            fileName: 'html2canvas.min.js',
        },
        {
            url: `${baseUrl}/auditor.svg`,
            fileName: 'auditor.svg',
        },
        {
            url: `${dependenciesBaseUrl}/chart.js`,
            fileName: 'chart.min.js',
        },
        {
            url: `${baseUrl}/index.css`,
            fileName: 'index.css',
        },
        {
            url: `${baseUrl}/index.js`,
            fileName: 'index.js',
        },
        {
            url: `${baseUrl}/auth.html`,
            fileName: 'auth.html',
        },
        {
            url: `${baseUrl}/index.html`,
            fileName: 'index.html',
        },
    ];

    const hasUIPath = await hasFileAccess(uiPath);

    if (!hasUIPath) {
        try {
            mkdir(uiPath, { recursive: true });
            logger?.info(chalk.greenBright("ui folder generated successfully"));
        } catch (error: any) {
            logger?.error(chalk.redBright("failed to generate folder"));
            if ("message" in error)
                logger?.error(chalk.redBright(error.message));
            else logger?.error(chalk.redBright(error));
            return;
        }
    }

    let didDownload = false;

    for (const { url, fileName } of downloadable) {
        didDownload = await downloadFile(url, fileName);
    }

    if (didDownload) {
        logger?.info((chalk.green("Files downloaded successfully")));
    }
};

export const deleteDownloadedDependency = async () => {
    const hasUIPath = await hasFileAccess(uiPath);
    const logger = AppConfig.getAuditOption()?.logger;

    if (!hasUIPath) return;

    try {
        await rm(uiPath, { recursive: true });
        logger?.info(chalk.greenBright("ui content deleted successfully"));
    } catch (error: any) {
        logger?.error(chalk.redBright("failed to delete ui content"));
        if ("message" in error)
            logger?.error(chalk.redBright(error.message));
        else logger?.error(chalk.redBright(error));
    }
};

async function downloadFile(url: string, fileName: string): Promise<boolean> {
    const location = path.join(uiPath, fileName);
    const logger = AppConfig.getAuditOption()?.logger;
    const hasLocation = await hasFileAccess(location);

    if (hasLocation) {
        logger?.info(chalk.gray(`Skipping ${fileName}, already exists.`));
        return false;
    }

    logger?.info(chalk.yellow(`Downloading ${fileName}`));

    const res = await fetch(url);

    if (!res.ok || !res.body) {
        logger?.error(chalk.red(`Failed to fetch ${url}: ${res.status}`));
        return false;
    }

    const nodeStream = Readable.fromWeb(res.body as any);
    const fileStream = createWriteStream(location);

    try {
        await pipeline(nodeStream, fileStream);
        logger?.info(chalk.green(`Downloaded ${fileName} successfully.`));
        return true;
    } catch (err) {
        logger?.error(chalk.red(`Error writing ${fileName}: ${err}`));
        return false;
    }
}

const hasFileAccess = async (path: string) => {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch (error) {
        return false;
    }
};
