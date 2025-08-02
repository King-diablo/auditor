import chalk from "chalk";
import path from "path";
import { AppConfig } from "../core/AppConfigs";
import { TRouter } from "../types";
import { getLogs } from "../utils";

let uiPath: string;

export const createExpressRouter = (path: string) => {
    uiPath = path;
    return expressRouter;
};

/**
* Creates an Express router supporting authentication and audit functionalities.
* @example
* expressRouter({ Username: "admin", Password: "admin", Secret })
* Returns an Express router instance with configured routes.
* @param {TRouter} {Username, Password, Secret} - Credentials required for route authentication.
* @returns {express.Router} An Express router handling authentication and audit-related routes.
* @description
*   - The function dynamically imports the express module and handles missing installation gracefully.
*   - It verifies routes with a secret key and credentials provided in request headers and body.
*   - Configures routes for handling login, authentication UI, audit UI, and audit logs.
*   - Uses session cookies for maintaining authenticated state across requests.
*/
const expressRouter = async ({ Username = "admin", Password = "admin", Secret }: TRouter) => {
    let express;
    const logs = await getLogs();
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
        const decodedString = Buffer.from(incomingCredentials.id, "base64").toString("utf-8");

        const [username, password] = decodedString.split(':');


        const credentials = Buffer.from(`${Username}:${Password}:${Secret}`).toString("base64");

        if (username != Username) return res.status(400).json({ message: "incorrect username" });
        if (password != Password) return res.status(400).json({ message: "incorrect password" });

        res.statusMessage = "Authenticated";

        res.cookie('session', credentials, {
            httpOnly: true,
            secure: false,         
            sameSite: 'Strict',
            maxAge: 3600 * 1000,
        });

        return res.redirect(303, `/audit-ui`);
    });

    router.get('/auth-ui', (req, res) => {
        res.statusMessage = "Fetched auth UI";
        res.sendFile(path.join(uiPath, "auth.html"));
    });

    router.get('/audit-ui', (req: any, res: any) => {

        let session = null;

        req.headers.cookie?.split(';').forEach((cookie: any) => {
            const [name, value] = cookie.trim().split('=');
            if (name === "session") session = value;
        });

        if (!session) {
            res.statusMessage = "Unauthorized ui access";
            return res.redirect(303, "/auth-ui");

        }

        const decodedString = Buffer.from(session, "base64").toString("utf-8");

        const [username, password, secret] = decodedString.split(':');

        if (username != Username) return res.redirect(303, "/auth-ui");
        if (password != Password) return res.redirect(303, "/auth-ui");
        if (secret != Secret) return res.redirect(303, "/auth-ui");

        res.cookie('session', session, {
            httpOnly: true,
            secure: false,
            sameSite: 'Strict',
            maxAge: 3600 * 1000,
        });


        res.statusMessage = "Fetched audit UI";

        res.sendFile(path.join(uiPath, "index.html"));
    });

    router.get('/audit-log', (req: any, res: any) => {

        let session = null;

        req.headers.cookie?.split(';').forEach((cookie: any) => {
            const [name, value] = cookie.trim().split('=');
            if (name === "session") session = value;
        });

        if (!session) {
            res.statusMessage = "Unauthorized log access";
            return res.status(403).send('Forbidden');

        }

        const decodedString = Buffer.from(session, "base64").toString("utf-8");

        const [username, password, secret] = decodedString.split(':');

        if (username != Username) return res.status(403).send('Forbidden');
        if (password != Password) return res.status(403).send('Forbidden');
        if (secret != Secret) return res.status(403).send('Forbidden');


        res.statusMessage = "Fetched audit logs";
        res.status(200).json({ logs });
    });

    return router;
};