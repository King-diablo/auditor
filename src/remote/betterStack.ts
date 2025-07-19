import chalk from "chalk";
import { AppConfig } from "../core/AppConfigs";

export const betterStack = async (content: any) => {
    const config = AppConfig.getRemoteToken();

    if (!config) return;

    const data = JSON.stringify(content);

    const request = await fetch(config.url, {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
        },
        body: data,
    }).catch(err => AppConfig.getAuditOption()?.logger?.error(chalk.redBright("failed to send audit to the remote source", err)));

    // console.log(await request?.statusText ?? await request?.status);
};