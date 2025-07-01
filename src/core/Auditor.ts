import path from "path";
import { TAuditOptions, TEvent, TFileConfig, } from "../types/type";
import chalk from "chalk";
import fs from "fs";
import { errorLogger, requestLogger } from "../middleware";
import { getTimeStamp } from "../utils";


//TODO fix the request logger and error logger
//TODO add option to split up logs
//TODO refactor

export class Audit {
    private useTimeStamp: boolean = true;
    private logFilePath: string = "";
    private fileConfig: TFileConfig = {
        fileName: "audit.log",
        folderName: "audit"
    }

    private config: TAuditOptions = {
        dbType: "mongoose",
        destinations: ["console"],
        logger: console,
        useTimeStamp: true,
    }

    constructor(private options?: TAuditOptions) {
        this.config = {
            ...options,
            logger: options?.logger || console,
            dbType: options?.dbType || "mongoose",
            destinations: options?.destinations || ["console"],
            useTimeStamp: options?.useTimeStamp || true,
        }
        this.CreateFileLocation(this.fileConfig);
        this.config.logger.info(chalk.green("Audit config set successfully"));
    }


    Log(event: TEvent) {
        const item = this.useTimeStamp ? { ...event, timeStamp: getTimeStamp() } : { ...event };
        if (this.config.destinations?.includes("console")) {
            this.config.logger.info(item);
        }

        if (this.config.destinations?.includes("file")) {
            if (!this.logFilePath) {
                this.config.logger.error(chalk.red("Unable to locate file path"));
                return;
            }
            this.SaveToFile(item);
        }

    }

    FileConfig(config?: TFileConfig) {

        if (!this.config.destinations?.includes("file")) {
            this.config.logger.warn(chalk.yellowBright("You need to add file to destinations for this to work properly"));
            return;
        }
        const folder = config?.folderName ?? "audit";
        const baseFileName = config?.fileName ?? "audit";
        const fileName = baseFileName.endsWith(".log") ? baseFileName : `${baseFileName}.log`;

        this.fileConfig = {
            ...config,
            folderName: folder,
            fileName,
        };

        this.CreateFileLocation(this.fileConfig);

    }

    RequestLogger() {
        return requestLogger(this.config, this.SaveToFile);
    }

    ErrorLogger() {
        return errorLogger(this.config, this.SaveToFile);
    }

    private CreateFileLocation = (config: TFileConfig) => {
        if (!this.config.destinations?.includes("file")) return;
        const fullPath = path.resolve(config.folderName);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        this.logFilePath = path.join(fullPath, config.fileName);
    }

    private SaveToFile = (content: any) => {
        fs.appendFileSync(this.logFilePath, JSON.stringify(content, null, 4) + '\n', { encoding: "utf-8" });
    };
}