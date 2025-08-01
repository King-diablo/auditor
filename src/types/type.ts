import type { NextFunction, Request, Response } from 'express';

import { PrismaClient } from '@prisma/client';
import type { FastifyReply, HookHandlerDoneFunction } from 'fastify';
import type { Context, Next as KoaNext } from 'koa';
import { Schema } from "mongoose";
import { ExtendedFastifyRequest } from '../utils/interface';

type TActionMap = {
    auth: "login" | "logout" | "signup" | "password_reset" | "password_update" |
    "token_refreshed" | "session_expired" | "2fa_requested" | "2fa_verified" |
    "unauthorized" | "account_locked" | "email_verified" | "email_verification_sent";
    billing: "payment_success" | "payment_failed" | "subscription_created" | "subscription_cancelled";
    system: "start" | "stop" | "restart";
    error: "server_error" | "client_error" | "validation_error";
};
type TMessages = {
    login: "User logged in successfully.";
    logout: "User logged out.";
    signup: "New user signed up.";
    password_reset: "Password reset requested.";
    password_update: "User updated their password.";
    token_refreshed: "Authentication token was refreshed.";
    session_expired: "User session has expired.";
    "2fa_requested": "Two-factor authentication requested.";
    "2fa_verified": "Two-factor authentication verified.";
    unauthorized: "Unauthorized access attempt detected.";
    account_locked: "User account has been locked.";
    email_verified: "Email address successfully verified.";
    email_verification_sent: "Verification email sent to user.";

    payment_success: "Payment completed successfully.";
    payment_failed: "Payment attempt failed.";
    subscription_created: "New subscription created.";
    subscription_cancelled: "Subscription has been cancelled.";

    start: "System has started.";
    stop: "System has stopped.";
    restart: "System has been restarted.";

    server_error: "A server error has occurred.";
    client_error: "A client-side error has occurred.";
    validation_error: "Validation failed for the provided data.";
};



type TDestinations = "console" | "file" | "remote";



type TKnownEvent = {
    [K in keyof TActionMap]: TActionMap[K] extends infer Actions
    ? Actions extends keyof TMessages
    ? {
        [A in Actions]: {
            type: K;
            action: A;
            message: TMessages[A];
        }
    }[Actions]
    : never
    : never
}[keyof TActionMap];

export type TAuditOptions<F extends Framework> = {
    destinations?: TDestinations[];
    logger?: Logger;
    dbType?: Database;
    framework?: F;  // "express" | "fastify" | "koa", // | "hapi" | "restify"
    useTimeStamp?: boolean;
    splitFiles?: boolean;
    captureSystemErrors?: boolean;
    useUI?: boolean;
    maxRetention?: number;
};

export type TCustomEvent = {
    type: Exclude<string, keyof TActionMap>;
    action: string;
    message: string;
};

export type AuditContentParams = {
    type: string;
    action: string;
    message: string;
    [key: string]: any;
};

export type TEvent = TKnownEvent | TCustomEvent;
export type TSaveContext = (config: TFileConfig, content: any) => void;
export type TFileConfig = {
    fileName: string;
    folderName: string;
    fullPath: string;
    maxSizeBytes: number;
};


export type ExpressLogger = (req: Request, res: Response, next: NextFunction) => void;
export type KoaLogger = (ctx: Context, next: KoaNext) => Promise<void>;
export type FastifyLogger = {
    onRequest: (request: ExtendedFastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => void;
    onResponse: (request: ExtendedFastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => void;
};

export type SupportedLoggersRequest = {
    express: ExpressLogger;
    koa: KoaLogger;
    fastify: FastifyLogger;
    // hapi: () => {},
    // restify: () => {},
};


export type Database = 'none' | 'mongoose' | 'prisma';
export type DBInstance = Schema | PrismaClient;

export type Framework = keyof SupportedLoggersRequest;

export type Logger = {
    info: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
}

export type TRemoteConfig = {
    url: string,
    token: string;
};

export type TRouter = {
    Username: string,
    Password: string,
    Secret: string;
};
