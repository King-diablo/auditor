import chalk from "chalk";
import { Schema } from "mongoose";
import { auditModel, checkForMongodb } from "../database/mongodb";
import { errorLogger, requestLogger } from "../middleware";
import { TAuditOptions, TEvent, TFileConfig, } from "../types/type";
import { createFile, getTimeStamp, logAuditEvent } from "../utils";


export class Audit {
    private logFilePath: string = "";
    private defaultFileConfigs: TFileConfig[] = [
        {
            fileName: "error.log",
            folderName: "audits",
            fullPath: "",
        },
        {
            fileName: "request.log",
            folderName: "audits",
            fullPath: "",
        },
        {
            fileName: "db.log",
            folderName: "audits",
            fullPath: "",
        },
        {
            fileName: "action.log",
            folderName: "audits",
            fullPath: "",
        },
    ]
    private fileConfig: TFileConfig = {
        fileName: "audit.log",
        folderName: "audit",
        fullPath: "",
    }
    private isInitialized: boolean = false;


    private config: TAuditOptions = {
        dbType: "none",
        destinations: ["console"],
        logger: console,
        useTimeStamp: true,
        splitFiles: false,
    }

    /**
     * Creates an instance of the Auditor class.
     *
     * @param options - Optional configuration object for the auditor.
     *   - `logger`: Custom logger to use; defaults to `console` if not provided.
     *   - `dbType`: Type of database to use; defaults to `"mongoose"`.
     *   - `destinations`: Array of destinations for audit logs; defaults to `["console"]`.
     *   - `useTimeStamp`: Whether to include timestamps in logs; defaults to `true`.
     *   - `splitFiles`: Whether to split log files; defaults to `false`.
     *
     * Initializes the auditor configuration with provided options or sensible defaults.
     */
    constructor(private options?: TAuditOptions) {
        this.config = {
            ...options,
            logger: options?.logger || console,
            dbType: options?.dbType || "none",
            destinations: options?.destinations || ["console"],
            useTimeStamp: options?.useTimeStamp ?? true,
            splitFiles: options?.splitFiles ?? false,
        };
    }


    /**
     * Initializes the auditor by creating the necessary file location and logging a success message.
     *
     * This method sets up the audit configuration by invoking `CreateFileLocation` with the current file configuration,
     * and logs a confirmation message using the configured logger.
     *
     * @remarks
     * Should be called before performing any audit operations to ensure the environment is properly configured.
     */
    Setup() {
        if (this.isInitialized) {
            this.config.logger?.warn(chalk.yellow("Audit already initialized."));
            return;
        }
        this.CreateFileLocation(this.fileConfig);
        this.isInitialized = true;

        if (this.config.dbType === "mongoose") {
            const result = checkForMongodb(this.config);
            if (!result) return;
        }

        this.config.logger?.info(chalk.green("Default Audit config set successfully"));
    }

    /**
     * Logs an event to the configured destinations (console and/or file).
     *
     * Depending on the configuration, this method will:
     * - Add a timestamp to the event if `useTimeStamp` is enabled.
     * - Log the event to the console if "console" is included in `destinations`.
     * - Log the event to a file if "file" is included in `destinations`.
     *   - If `splitFiles` is enabled, logs to a specific action log file.
     *   - Otherwise, logs to the default file configuration.
     * - If the file path is not set when logging to a file, logs an error.
     *
     * @param event - The event object to be logged.
     */
    Log(event: TEvent) {
        const item = this.config.useTimeStamp ? { ...event, timeStamp: getTimeStamp() } : { ...event };

        if (this.config.destinations?.includes("console")) {
            logAuditEvent(this.config, item);
            this.config.logger?.info(item);
        }

        if (this.config.destinations?.includes("file")) {

            if (!this.logFilePath) {
                this.config.logger?.error(chalk.red("Unable to locate file path"));
                return;
            }

            const actionFile = this.defaultFileConfigs.find(x => x.fileName === "action.log") as TFileConfig;
            const file = this.config.splitFiles ? actionFile : this.fileConfig;

            logAuditEvent(this.config, item, file);
        }

    }

    /**
     * Audits a given schema model by invoking the `auditModel` function with the current configuration,
     * a generated timestamp, and the provided schema.
     *
     * @template T - The type of the schema being audited.
     * @param schema - The schema object to be audited.
     */
    AuditModel<T>(schema: Schema<T>) {
        if (this.config.splitFiles) {
            const dbFile = this.defaultFileConfigs.find(x => x.fileName === "db.log") as TFileConfig;
            auditModel(this.config, schema, dbFile);
            return;
        }
        auditModel(this.config, schema, this.fileConfig);
    }

    /**
     * Configures the file logging settings for the auditor.
     *
     * This method sets up the file configuration used for logging audit events to a file.
     * It checks if "file" is included in the destinations and if split file logging is disabled.
     * If these conditions are not met, it logs appropriate warnings and returns early.
     * Otherwise, it sets up the file configuration with the provided options or defaults.
     *
     * @param config - Optional configuration object for the file logger, excluding the `fullPath` property.
     *   - `folderName` (optional): The folder where the log file will be stored. Defaults to `"audit"`.
     *   - `fileName` (optional): The name of the log file. Defaults to `"audit.log"`.
     */
    SetFileConfig(config?: Omit<TFileConfig, "fullPath">) {

        if (!this.config.destinations?.includes("file")) {
            this.config.logger?.warn(chalk.yellowBright("You need to add file to destinations for this to work properly"));
            return;
        }

        if (this.config.splitFiles) {
            this.config.logger?.info(chalk.yellow("Cannot configure file as it is not supported when using splitfile"));
            return;
        }

        const folder = config?.folderName ?? "audit";
        const baseFileName = config?.fileName ?? "audit";
        const fileName = baseFileName.endsWith(".log") ? baseFileName : `${baseFileName}.log`;

        this.fileConfig = {
            ...config,
            folderName: folder,
            fileName,
            fullPath: ""
        };
    }


    /**
     * Logs all incoming requests using the configured logger.
     *
     * Depending on the `splitFiles` configuration, this method will either:
     * - Log requests to a dedicated "request.log" file if `splitFiles` is enabled.
     * - Log requests to the default log file otherwise.
     *
     * @returns The result of the `requestLogger` function, which handles the actual logging process.
     */
    RequestLogger() {
        if (this.config.splitFiles) {
            const requestFile = this.defaultFileConfigs.find(x => x.fileName === "request.log") as TFileConfig;
            return requestLogger(this.config, requestFile);
        }
        return requestLogger(this.config, this.fileConfig);
    }

    /**
     * Logs all errors using the configured error logger.
     *
     * If the `splitFiles` option is enabled in the configuration, errors are logged to a separate
     * "error.log" file as specified in the default file configurations. Otherwise, errors are logged
     * to the main file configuration.
     *
     * @returns The result of the error logger function, which handles error logging based on the current configuration.
     */
    ErrorLogger() {
        if (this.config.splitFiles) {
            const errorFile = this.defaultFileConfigs.find(x => x.fileName === "error.log") as TFileConfig;
            return errorLogger(this.config, errorFile);
        }
        return errorLogger(this.config, this.fileConfig);
    }


    private CreateFileLocation = (config: TFileConfig) => {
        if (!this.config.destinations?.includes("file")) return;

        if (this.config.splitFiles) {
            this.defaultFileConfigs.forEach(item => {
                this.GenerateFile(item);
            });
            return;
        }
        this.GenerateFile(config);
    };


    private GenerateFile = (config: TFileConfig) => {
        const dir = createFile(config);
        config.fullPath = dir;
        this.logFilePath = dir;
        this.defaultFileConfigs = this.defaultFileConfigs.map(item => {
            if (item.fileName === config.fileName) {
                return { ...item, fullPath: dir };
            }
            return item;
        });
    };
}