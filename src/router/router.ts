import chalk from "chalk";
import express, { Router } from "express";
import fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";
import { AppConfig } from "../core/AppConfigs";

const expressRouter = () => {
    const router = Router();
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Now resolve your UI path based on the package's actual location:
    const uiPath = path.join(__dirname, "ui");

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
    const activeFrameWork = AppConfig.getFrameWork();
    try {
        console.log(`Checking for framework: ${activeFrameWork}`);
        require.resolve(`express`);
        console.log(`Framework ${activeFrameWork} found.`);

        return true;
    } catch (error) {
        AppConfig.getAuditOption()?.logger?.info(chalk.redBright("Failed to find framework. UI will not be available"));
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