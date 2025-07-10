import chalk from "chalk";
import express, { Router } from "express";
import fs, { createWriteStream, existsSync } from 'fs';
import { createRequire } from 'module';
import path from "path";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from "url";
import { AppConfig } from "../core/AppConfigs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiPath = path.join(__dirname, "ui");

const expressRouter = () => {
    const router = Router();

    router.use(express.static(uiPath));

    router.get('/audit-ui', (_req, res) => {
        res.sendFile(path.join(uiPath, "index.html"));
    });

    router.get('/audit-log', (_req, res) => {
        const hasSplitFiles = AppConfig.getAuditOption()?.splitFiles;
        const data = [];

        if (hasSplitFiles) {
            const files = AppConfig.getDefaultFileConfig();
            if (!files) return;

            for (const item of files) {
                const logData = fs.readFileSync(item.fullPath, "utf-8");
                const latestData = logData.split('\n').filter(Boolean);
                data.push(...latestData);
            }
        }

        const file = AppConfig.getFileConfig();
        if (!file) return;
        const logData = fs.readFileSync(file.fullPath, "utf-8");
        res.status(200).json(logData);
    });

    return router;
};

const fastifyRouter = () => {

};

const koaRouter = () => {

};


export const checkForFramework = () => {

    const activeFramework = AppConfig.getFrameWork() as string;
    const requireFromUserProject = createRequire(path.join(process.cwd(), 'index.js'));

    try {
        console.log(`Checking for framework: ${activeFramework}`);
        requireFromUserProject.resolve(activeFramework);  // resolved from user's project root
        console.log(`Framework ${activeFramework} found.`);
        return true;
    } catch (error) {
        AppConfig.getAuditOption()?.logger?.info(
            chalk.redBright(`Failed to find framework "${activeFramework}". UI will not be available.`),
        );
        return false;
    }
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
