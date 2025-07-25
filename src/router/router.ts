import chalk from "chalk";
import fs, { createWriteStream, existsSync } from 'fs';
import path from "path";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from "url";
import { AppConfig } from "../core/AppConfigs";
import { checkForModule } from "../utils";
import { createKoaRouter } from "./koaRouter";
import { TRouter } from "../types";


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
* Sets up Express routes for authentication and logging with optional credentials.
* @example
* expressRouter({Username: "admin", Password: "admin", secret: "yourSecretKey"})
* returns Express Router instance
* @param {TRouter} {Username="admin", Password="admin", secret} - Configuration for Express Router including default credentials and a secret.
* @returns {Router} Returns an Express Router configured with routes for authentication and log display.
* @description
*   - If `secret` is not provided, the function logs an error and allows progression without middleware blocking.
*   - Requests to the '/audit-log' route require a valid session cookie set by successful authentication.
*   - Post route authentication requires base64-encoded credentials combining username, password, and secret query parameters.
*/
const expressRouter = async ({ Username = "admin", Password = "admin", Secret }: TRouter) => {
    let express;
    try {
        express = await import("express");
        if (!Secret) {
            AppConfig.getAuditOption()?.logger?.info(chalk.redBright("You must provide a secret to use this route"));
            return (req: any, res: any, next: any) => next();
        }
    } catch (error) {
        AppConfig.getAuditOption()?.logger?.info(chalk.redBright("Please install express in order to use this module"));
        return (req: any, res: any, next: any) => next();
    }

    const router = express.Router();

    router.use(express.json());
    router.use(express.static(uiPath));

    router.post('/login', (req: any, res: any) => {
        const incomingCredentials = req.body;

        if (!incomingCredentials?.id) {
            res.statusMessage = "Missing information";
            return res.status(404).json({ message: "Id is required" });
        }

        const decodedString = atob(incomingCredentials.id);

        const [username, password] = decodedString.split(':');

        const credentials = btoa(`${Username}:${Password}:${Secret}`);

        if (username != Username) return res.status(400).json({ message: "incorrect username" });
        if (password != Password) return res.status(400).json({ message: "incorrect password" });

        res.statusMessage = "Authenticated";

        return res.redirect(303, `/audit-ui?id=${encodeURIComponent(credentials)}`);
    });

    router.get('/auth-ui', (req, res) => {
        res.statusMessage = "Fetched auth UI";
        res.sendFile(path.join(uiPath, "auth.html"));
    });

    router.get('/audit-ui', (req: any, res: any) => {
        const credentials = req.query.id;

        if (!credentials) return res.redirect(303, "/auth-ui");

        try {
            const decodedString = atob(credentials as string);

            const [username, password, secret] = decodedString.split(':');

            if (username != Username) return res.redirect(303, "/auth-ui");
            if (password != Password) return res.redirect(303, "/auth-ui");
            if (secret != Secret) return res.redirect(303, "/auth-ui");

            req.headers.cookie?.split(';').forEach((cookie: any) => {
                const [name, value] = cookie.trim().split('=');
                if (name === "session") return;
                res.setHeader('Set-Cookie', [
                    `session=${credentials}; ` +
                    `Path=/; ` +
                    `HttpOnly; ` +
                    `SameSite=Strict`,
                ]);
            });


        } catch (error) {
            return res.redirect(303, "/auth-ui");
        }

        res.statusMessage = "Fetched audit UI";

        res.sendFile(path.join(uiPath, "index.html"));
    });

    router.get('/audit-log', (req: any, res: any) => {

        let session = null;

        req.headers.cookie?.split(';').forEach((cookie: any) => {
            const [name, value] = cookie.trim().split('=');
            if (name === "session") session = value;
        });

        if (!session) return res.status(403).send('Forbidden');

        const decodedString = atob(session);

        const [username, password, secret] = decodedString.split(':');

        if (username != Username) return res.status(403).send('Forbidden');
        if (password != Password) return res.status(403).send('Forbidden');
        if (secret != Secret) return res.status(403).send('Forbidden');


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

const koaRouter = createKoaRouter(uiPath);


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
