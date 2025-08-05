import chalk from "chalk";
import path from "path";
import { AppConfig } from "../core/AppConfigs";
import { TRouter } from "../types";
import { decodeSession, encodeSession, getLogs } from "../utils";
import { Request, Response } from "express";

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

    router.get('/logout', (req: Request, res: Response) => {
        const session = getSession(req);
        const isValidated = validateSession(session, { Username, Password, Secret });

        if (!isValidated) {
            res.statusMessage = "Unauthorized logout access";
            res.status(400).json({ message: "Unauthorized" });
            return;
        }

        res.clearCookie("session", {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 3600 * 1000,
        });
        res.statusMessage = "Logged out of dashboard";
        res.redirect(303, "/auth-ui");
    });

    router.post('/login', (req: Request, res: Response) => {
        const incomingCredentials = req.body;

        if (!incomingCredentials?.id) {
            res.statusMessage = "Missing information";
            res.status(404).json({ message: "Id is required" });
            return;
        }
        const decodedString = decodeSession(incomingCredentials.id);

        const [username, password] = decodedString.split(':');


        const credentials = encodeSession(`${Username}:${Password}:${Secret}`);

        if (username != Username) {
            res.statusMessage = "Un-Authenticated";
            res.status(400).json({ message: "incorrect username" });
            return;
        }
        if (password != Password) {
            res.statusMessage = "Un-Authenticated";
            res.status(400).json({ message: "incorrect password" });
            return;
        }

        res.statusMessage = "Authenticated";

        res.cookie('session', credentials, {
            httpOnly: true,
            secure: false,         
            sameSite: 'strict',
            maxAge: 3600 * 1000,
        });

        res.redirect(303, `/audit-ui`);
    });

    router.get('/auth-ui', (req: Request, res: Response) => {
        res.statusMessage = "Fetched auth UI";
        res.sendFile(path.join(uiPath, "auth.html"));
    });

    router.get('/audit-ui', (req: Request, res: Response) => {
        const session = getSession(req);
        const isValidated = validateSession(session, { Username, Password, Secret });

        if (!isValidated) {
            res.statusMessage = "Unauthorized ui access";
            res.redirect(303, "/auth-ui");
            return;
        }

        res.statusMessage = "Fetched audit UI";

        res.sendFile(path.join(uiPath, "index.html"));
    });

    router.get('/audit-log', async (req: Request, res: Response) => {

        const session = getSession(req);
        const isValidated = validateSession(session, { Username, Password, Secret });

        if (!isValidated) {
            res.statusMessage = "Unauthorized log access";
            res.status(403).send('Forbidden');
            return;
        }

        const logs = await getLogs();
        res.statusMessage = "Fetched audit logs";
        res.status(200).json({ logs });
    });

    return router;
};

const getSession = (req: Request) => {
    let data = null;
    req.headers.cookie?.split(';').forEach((cookie: any) => {
        const [name, value] = cookie.trim().split('=');
        if (name === "session") data = value;
    });

    return data;
};
const validateSession = (session: string | null, info: any) => {

    if (!session) {
        return false;
    }

    const decodedString = decodeSession(session);

    const [username, password, secret] = decodedString.split(':');

    return !(username != info.Username || password !== info.Password || secret !== info.Secret);
};