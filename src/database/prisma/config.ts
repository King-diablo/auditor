import chalk from "chalk";
import { AppConfig } from "../../core/AppConfigs";
import { checkForModule, generateAuditContent, getFileLocation, handleLog, logAuditEvent } from "../../utils";
import type { PrismaClient } from '@prisma/client';
import { userProfile } from "../../utils/user";

const PRISMA_TAG = "@prisma/client";

let hasPrisma = false;

export const checkForPrisma = () => {
    hasPrisma = checkForModule(PRISMA_TAG);
    return hasPrisma;
};

export const auditPrisma = (client: PrismaClient) => {
    const config = AppConfig.getAuditOption();

    if (!client?.$use || typeof client.$use !== 'function') {
        config?.logger?.info(
            chalk.redBright(
                'Invalid PrismaClient instance passed. Ensure @prisma/client is installed and `prisma generate` has been run.',
            )
        );
        return;
    }

    client.$use(async (params: any, next: any) => {
        const start = Date.now();
        const result = await next(params);
        const duration = Date.now() - start;

        const content = generateAuditContent({
            type: 'db',
            action: params.action,
            message: `handling DB calls [Model:${params.model}]-[Action:${params.action}]`,
            collection: params.model,
            criteria: params.args,
            duration,
            userId: userProfile.getUserId(),
            endPoint: userProfile.getEndPoint(),
            ip: userProfile.getIp(),
            userAgent: userProfile.getUserAgent(),
        });

        if (config?.destinations?.includes('console')) {
            logAuditEvent(content);
        }

        if (config?.destinations?.includes('file')) {
            const dbFile = getFileLocation('db.log');
            if (dbFile) {
                logAuditEvent(content, dbFile);
            }
        }

        return result;
    });
};