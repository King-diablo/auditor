import chalk from 'chalk';
import { AppConfig } from '../core/AppConfigs';
import fs from 'fs';
import path from "path";
import { TRouter } from '../types';
import { decodeSession, encodeSession, getLogs } from '../utils';
import { FastifyReply } from 'fastify/types/reply';
import { FastifyError, FastifyRequest } from 'fastify';

let uiPath: string;

export const createFastifyRouter = (uiLocation: string) => {
    uiPath = uiLocation;
    return fastifyRouter;
};

/**
* Sets up a Fastify router with authentication and logging routes.
* @example
* fastifyRouter({
*   Username: "admin",
*   Password: "admin",
*   Secret: "mySecret"
* });
* Returns an async function to be used as a Fastify plugin.
* @param {TRouter} {Username, Password, Secret} - Configuration object for setting username, password, and a secret for authentication.
* @returns {Function} An async function that registers routes with Fastify.
* @description
*   - Ensures @fastify/static is installed for serving static files.
*   - Defines routes for basic authentication and access to protected UI and audit log endpoints.
*   - Sessions are managed using base64 encoding and cookie headers.
*   - Fails gracefully if necessary modules are not present.
*/
const fastifyRouter = async ({ Username = "admin", Password = "admin", Secret }: TRouter) => {
    let fastifyStatic;

    try {
        fastifyStatic = await import('@fastify/static');

    } catch {
        AppConfig.getAuditOption()?.logger?.info(
            chalk.redBright("Please install @fastify/static to use the audit UI."),
        );
        return async () => { };
    }

    return async function (fastify: any, opts: any) {
        await fastify.register(fastifyStatic.default, {
            root: uiPath,
            prefix: '/',
        });

        fastify.get('/auth-ui', (_: any, reply: FastifyReply) => {
            reply.type('text/html').status(200).sendFile('auth.html');
        });

        fastify.post('/login', async (request: FastifyRequest<{ Body: { id: string; }; }>, reply: FastifyReply) => {
            const { id } = request.body || {};

            if (!id) {
                reply.code(400).send({ message: "Missing id" });
                return;
            }

            const decoded = decodeSession(id);
            const [username, password] = decoded.split(':');

            if (username !== Username) return reply.code(401).send({ message: "Invalid username" });
            if (password !== Password) return reply.code(401).send({ message: "Invalid password" });

            const session = encodeSession(`${Username}:${Password}:${Secret}`);

            reply.header('Set-Cookie', `session=${session}; HttpOnly; Path=/; SameSite=Strict; Max-Age=3600`);
            reply.redirect(`/audit-ui`);
        });

        fastify.get('/audit-ui', (request: FastifyRequest, reply: FastifyReply) => {
            const cookies = parseCookies(request.headers.cookie || "");
            const session = cookies["session"];
            if (!session) return reply.redirect('/auth-ui');
            try {
                const decoded = decodeSession(session);
                const [username, password, secret] = decoded.split(':');

                if (username !== Username || password !== Password || secret !== Secret) {
                    return reply.redirect('/auth-ui');
                }
                reply.type('text/html').sendFile('index.html');
            } catch {
                return reply.redirect('/auth-ui');
            }
        });

        fastify.get('/audit-log', async (request: FastifyRequest, reply: FastifyReply) => {
            const cookies = parseCookies(request.headers.cookie || "");
            const session = cookies["session"];
            if (!session) return reply.code(403).send("Forbidden");

            try {
                const decoded = decodeSession(session);
                const [username, password, secret] = decoded.split(':');

                if (username !== Username || password !== Password || secret !== Secret) {
                    return reply.code(403).send("Forbidden");
                }

                const logs = await getLogs();
                reply.send({ logs });
            } catch {
                return reply.code(403).send("Forbidden");
            }
        });
    };
};



/**
* Parses a cookie header string into an object of key-value pairs.
* @example
* parseCookies("key1=value1; key2=value2")
* Returns: { key1: "value1", key2: "value2" }
* @param {string} cookieHeader - A string representing the cookie header with cookies separated by semicolons.
* @returns {Record<string, string>} An object containing the parsed cookies as key-value pairs.
* @description
*   - Each cookie is expected to be in the format "key=value".
*   - Values are decoded using decodeURIComponent.
*   - Trims whitespace and processes each segment.
*/
const parseCookies = (cookieHeader: string): Record<string, string> => {
    return cookieHeader.split(';').reduce((acc: any, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
};