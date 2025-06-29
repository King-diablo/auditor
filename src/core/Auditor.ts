import path from "path";
import { TAuditOptions, TEvent, TFileConfig, } from "../types/type";
import chalk from "chalk";
import fs from "fs";
export class Audit {
    private logger: any;
    private destinations: string[];
    private db?: string;
    private useTimeStamp: boolean = true;
    private logFilePath: string = "";
    private fileConfig: TFileConfig = {
        fileName: "audit.log",
        folderName: "audit"
    }

    constructor(private options?: TAuditOptions) {
        this.logger = options?.logger || console;
        this.destinations = options?.destinations || ["console"];
        this.db = options?.dbType;
        this.useTimeStamp = options?.useTimeStamp ?? true;
        this.CreateFileLocation(this.fileConfig);
        this.logger.info(chalk.green("Audit config set successfully"));
    }


    Log(event: TEvent) {
        const item = this.useTimeStamp ? { ...event, timeStamp: new Date().toISOString() } : { ...event };
        if (this.destinations.includes("console")) {
            this.logger.info(item);
        }

        if (this.destinations.includes("file")) {
            if (!this.logFilePath) {
                this.logger.error(chalk.red("Unable to locate file path"));
                return;
            }
            fs.appendFileSync(this.logFilePath, JSON.stringify(item, null, 4) + '\n', { encoding: "utf-8" });
        }

    }

    FileConfig(config?: TFileConfig) {

        if (!this.destinations.includes("file")) {
            this.logger.warn(chalk.yellowBright("You need to add file to destinations for this to work properly"));
            return;
        }
        const folder = config?.folderName ?? "audit";
        const fileName = config?.fileName ? `${config.fileName}.log` : "audit.log";

        this.fileConfig = {
            folderName: folder,
            fileName: fileName,
            ...config,
        };

        this.CreateFileLocation(this.fileConfig);

    }

    private CreateFileLocation = (config: TFileConfig) => {
        if (!this.destinations.includes("file")) return;
        const fullPath = path.resolve(config.folderName);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }

        this.logFilePath = path.join(fullPath, config.fileName);
    }
}