import chalk from "chalk";
import { createWriteStream, existsSync } from 'fs';
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
    await downloadFile('https://cdn.jsdelivr.net/npm/chart.js', 'chart.min.js');
    await downloadFile('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', 'html2canvas.min.js');
    logger?.info((chalk.green("Files downloaded successfully")));
};

async function downloadFile(url: string, fileName: string): Promise<void> {
    const location = path.join(uiPath, fileName);
    const logger = AppConfig.getAuditOption()?.logger;

    if (existsSync(location)) {
        logger?.info(chalk.gray(`Skipping ${fileName}, already exists.`));
        return;
    }

    logger?.info(chalk.yellow(`Downloading ${fileName}`));

    const res = await fetch(url);

    if (!res.ok || !res.body) {
        logger?.error(chalk.red(`Failed to fetch ${url}: ${res.status}`));
        return;
    }

    const nodeStream = Readable.fromWeb(res.body as any);
    const fileStream = createWriteStream(location);

    try {
        await pipeline(nodeStream, fileStream);
        logger?.info(chalk.green(`Downloaded ${fileName} successfully.`));
    } catch (err) {
        logger?.error(chalk.red(`Error writing ${fileName}: ${err}`));
    }
}
