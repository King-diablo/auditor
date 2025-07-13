import chalk from "chalk";
import fs, { createWriteStream, existsSync } from 'fs';
import path from "path";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from "url";
import { AppConfig } from "../core/AppConfigs";
import { checkForModule } from "../utils";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiPath = path.join(__dirname, "ui");


const getLogs = () => {
    const hasSplitFiles = AppConfig.getAuditOption()?.splitFiles;
    const file = AppConfig.getFileConfig();

    if (hasSplitFiles) {
        const files = AppConfig.getDefaultFileConfig();
        if (!files) return [];

        const data = files.flatMap((item) => {
            const logData = fs.readFileSync(item.fullPath, "utf-8");
            return logData.trim().split("\n").filter(Boolean).map((line, i) => ({
                id: i,
                ...JSON.parse(line),
            }));
        });

        return data.sort((a, b) => b.timeStamp.localeCompare(a.timeStamp));
    }

    if (!file) return [];

    const logData = fs.readFileSync(file.fullPath, "utf-8");
    const item = logData.trim().split("\n").filter(Boolean).map((line, i) => ({
        id: i,
        ...JSON.parse(line),
    }));

    return item.sort((a, b) => b.timeStamp.localeCompare(a.timeStamp));
};


/**
 * Asynchronously creates and configures an Express router for serving the audit UI and logs.
 *
 * - Dynamically imports the `express` module. If `express` is not installed, logs a message and returns a no-op middleware.
 * - Serves static files from the `uiPath` directory.
 * - Handles GET requests to `/audit-ui` by serving the main UI HTML file.
 * - Handles GET requests to `/audit-log` by returning audit logs as JSON.
 *
 * @returns {Promise<import("express").Router | import("express").RequestHandler>} 
 *   A Promise that resolves to an Express router instance, or a no-op middleware if `express` is not available.
 */
const expressRouter = async () => {
    let express;
    try {
        express = await import("express");
    } catch (error) {
        AppConfig.getAuditOption()?.logger?.info(chalk.redBright("Please install express in order to use this module"));
        return (req: any, res: any, next: any) => next();
    }

    const router = express.Router();

    router.use(express.static(uiPath));

    router.get('/audit-ui', (_req, res) => {
        res.statusMessage = "Fetched audit UI";
        res.sendFile(path.join(uiPath, "index.html"));
    });

    router.get('/audit-log', (_req, res) => {
        const logs = getLogs();
        res.statusMessage = "Fetched audit logs";
        res.status(200).json({ logs });
    });

    return router;
};

/**
 * Asynchronously creates a Fastify plugin for serving static files and API endpoints.
 *
 * This function attempts to dynamically import the `@fastify/static` module. If the import fails,
 * it returns a no-op async function. Otherwise, it returns an async function that registers the static
 * file handler and sets up two routes:
 * 
 * - `/audit-ui`: Serves the `index.html` file as an HTML response.
 * - `/audit-log`: Returns audit logs as a JSON object.
 *
 * @returns {Promise<(fastify: any, opts: any) => Promise<void>>} A promise that resolves to a Fastify plugin function.
 */
const fastifyRouter = async () => {

    let fastifyStatic;
    try {
        fastifyStatic = await import('@fastify/static');
    } catch {
        return async () => { };
    }

    return async function (fastify: any, opts: any) {
        await fastify.register(fastifyStatic.default, {
            root: uiPath,
            prefix: '/',
        });

        /**
                * Sends an HTML file as the response for the '/audit-ui' route in Fastify.
                * @example
                * (_req, reply) => {
                *   reply.type('text/html').sendFile('index.html');
                * }
                * @param {any} _ - The incoming request object (not used in this function).
                * @param {any} reply - The Fastify reply object used to send responses.
                * @description
                *   - This function sets the response type to 'text/html'.
                *   - It sends 'index.html' located in the static files directory specified in uiPath.
                */
        fastify.get('/audit-ui', (_: any, reply: any) => {
            reply.type('text/html').sendFile('index.html');
        });

        fastify.get('/audit-log', (_: any, reply: any) => {
            reply.send({ logs: getLogs() });
        });
    };
};

/**
* Initializes a Koa router for serving audit-related endpoints
* @example
* koaRouter()
* @returns {Function} Middleware function composed with Koa static server and router.
* @description
*   - Dynamically imports necessary Koa modules and registers routes.
*   - Serves the audit UI from a static HTML file.
*   - Returns the audit logs in JSON format.
*   - Logs a message if required packages are not installed.
*/
const koaRouter = async () => {
    let Router, serve, compose;

    try {
        Router = (await import('@koa/router')).default;
        serve = (await import('koa-static')).default;
        compose = (await import('koa-compose')).default;
    } catch {
        AppConfig.getAuditOption()?.logger?.info(
            chalk.redBright("Please install koa, @koa/router, koa-static, and koa-compose to use the audit UI."),
        );
        return async (ctx: any, next: any) => await next();
    }

    const router = new Router();


    router.get('/audit-ui', (ctx: any) => {
        ctx.type = 'html';
        ctx.body = fs.createReadStream(path.join(uiPath, 'index.html'));
    });

    router.get('/audit-log', (ctx: any) => {
        ctx.body = { logs: getLogs() };
    });

    return compose([
        serve(uiPath),
        router.routes(),
        router.allowedMethods(),
    ]);
};


export const checkForFramework = () => {
    const activeFramework = AppConfig.getFrameWork() as string;
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
