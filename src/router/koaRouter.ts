import chalk from 'chalk';
import { AppConfig } from '../core/AppConfigs';
import fs from 'fs';
import path from "path";
import { TRouter } from '../types';
import { getLogs } from '../utils';


let uiPath: string;

export const createKoaRouter = (path: string) => {
    uiPath = path;
    return koaRouter;
};


/**
* Initializes and configures a Koa router with authentication and audit logging functionality.
* @example
* koaRouter({ Username: 'myUser', Password: 'myPass', Secret: 'mySecret' })
* Returns a Koa middleware function composed of static file serving and route handling.
* @param {Object} {Username, Password, Secret} - The credentials and secret key for authentication.
* @returns {Function} Returns a composed Koa middleware function for authentication and audit logging routes.
* @description
*   - Requires installation of `koa`, `@koa/router`, `koa-static`, and `koa-compose` for proper functionality.
*   - Ensures that a secret is provided, otherwise the route won't be functional.
*   - Protects routes with session-based authentication, redirecting requests when authentication fails.
*   - Configures routes for login, audit UI, authentication UI, and audit logs with appropriate status codes.
*/
const koaRouter = async ({ Username = 'admin', Password = 'admin', Secret }: TRouter) => {
    let Router, serve, compose;
    const logs = await getLogs();

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

    if (!Secret) {
        AppConfig.getAuditOption()?.logger?.info(chalk.redBright("You must provide a secret to use this route"));
        return async (ctx: any, next: any) => await next();
    }

    const router = new Router();

    router.post('/login', async (ctx: any) => {
        const body = await getRequestBody(ctx);
        const id = body?.id;
        if (!id) {
            ctx.status = 400;
            ctx.body = { message: "Id is required" };
            return;
        }

        let decoded: string;
        try {
            decoded = atob(id);
        } catch {
            ctx.status = 400;
            ctx.body = { message: "Invalid base64" };
            return;
        }

        const [user, pass] = decoded.split(':');
        if (user !== Username) {
            ctx.status = 400;
            ctx.body = { message: "Incorrect username" };
            return;
        }
        if (pass !== Password) {
            ctx.status = 400;
            ctx.body = { message: "Incorrect password" };
            return;
        }

        const session = btoa(`${Username}:${Password}:${Secret}`);
        ctx.status = 303;
        ctx.set('Set-Cookie', `session=${session}; Path=/; HttpOnly; SameSite=Strict Max-Age=3600`);
        ctx.redirect('/audit-ui');

    });

    router.get('/auth-ui', (ctx: any) => {
        ctx.type = 'html';
        ctx.body = fs.createReadStream(path.join(uiPath, 'auth.html'));
    });

    router.get('/audit-ui', (ctx: any) => {

        const session = getCookie(ctx, 'session');
        if (!session) return ctx.redirect('/auth-ui');

        let decoded: string;
        try {
            decoded = atob(session);
        } catch {
            return ctx.redirect('/auth-ui');
        }

        const [user, pass, secret] = decoded.split(':');
        if (user !== Username || pass !== Password || secret !== Secret) {
            return ctx.redirect('/auth-ui');
        }

        ctx.type = 'html';
        ctx.body = fs.createReadStream(path.join(uiPath, 'index.html'));
    });

    router.get('/audit-log', (ctx: any) => {
        const session = getCookie(ctx, 'session');
        if (!session) {
            ctx.status = 403;
            ctx.body = 'Forbidden';
            return;
        }

        let decoded: string;
        try {
            decoded = atob(session);
        } catch {
            ctx.status = 403;
            ctx.body = 'Forbidden';
            return;
        }

        const [user, pass, secret] = decoded.split(':');
        if (user !== Username || pass !== Password || secret !== Secret) {
            ctx.status = 403;
            ctx.body = 'Forbidden';
            return;
        }

        ctx.body = { logs };
    });

    return compose([
        serve(uiPath),
        router.routes(),
        router.allowedMethods(),
    ]);
};

function getRequestBody(ctx: any): Promise<any> {
    return new Promise((resolve) => {
        let body = '';
        ctx.req.on('data', (chunk: Buffer) => (body += chunk.toString()));
        ctx.req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve({});
            }
        });
    });
}

// Helper: Basic cookie parser
function getCookie(ctx: any, key: string): string | null {
    const { cookie } = ctx.headers;
    if (!cookie) return null;
    const parts = cookie.split(';').map((c: any) => c.trim());
    for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === key) return v;
    }
    return null;
}