import chalk from "chalk";
import { Schema } from "mongoose";
import { auditModel, checkForMongodb } from "../database/mongodb";
import { errorLogger, requestLogger } from "../middleware";
import { TAuditOptions, TEvent, TFileConfig } from "../types/type";
import { createFile, generateAuditContent, getFileLocation, getTimeStamp, handleLog, logAuditEvent } from "../utils";
import { AppConfig } from "./AppConfigs";


/**
 * The `Audit` class provides a configurable auditing and logging system for applications.
 * It supports logging events, requests, and errors to multiple destinations such as the console and files,
 * with options for splitting logs into separate files and integrating with databases.
 *
 * ### Features
 * - Configurable logging destinations: console, file, or both.
 * - Optional timestamp of log events.
 * - Support for split log files (e.g., separate files for errors, requests, actions, and database logs).
 * - Integration with custom loggers and database types.
 * - Initialization and setup routines to ensure proper configuration before use.
 * - Methods for logging generic events, requests, and errors.
 * - File configuration management for audit logs.
 * - Schema auditing support for database models.
 *
 * ### Usage
 * 1. Instantiate the `Audit` class with optional configuration.
 * 2. Call `Setup()` to initialize the auditor.
 * 3. Use `Log()`, `RequestLogger()`, and `ErrorLogger()` to log events.
 * 4. Optionally configure file logging with `SetFileConfig()`.
 * 5. Use `AuditModel()` to audit database schemas.
 *
 * @example
 * ```typescript
 * const auditor = new Audit({ destinations: ["console", "file"], splitFiles: true });
 * auditor.Setup();
 * auditor.Log({ action: "user_login", user: "alice" });
 * ```
 *
 * @remarks
 * - Ensure `Setup()` is called before logging events to guarantee proper initialization.
 * - File logging requires appropriate file system permissions.
 * - When using split files, file configuration is managed automatically.
 *
 * @public
 */
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
    ];
    private fileConfig: TFileConfig = {
        fileName: "audit.log",
        folderName: "audit",
        fullPath: "",
    };
    private isInitialized: boolean = false;


    private auditOptions: TAuditOptions = {
        dbType: "none",
        destinations: ["console"],
        logger: console,
        useTimeStamp: true,
        splitFiles: false,
        captureSystemErrors: false,
    };

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
        this.auditOptions = {
            ...options,
            logger: options?.logger || console,
            dbType: options?.dbType || "none",
            destinations: options?.destinations || ["console"],
            useTimeStamp: options?.useTimeStamp ?? true,
            splitFiles: options?.splitFiles ?? false,
            captureSystemErrors: options?.captureSystemErrors ?? false,
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
            this.auditOptions.logger?.warn(chalk.yellow("Audit already initialized."));
            return;
        }
        this.CreateFileLocation(this.fileConfig);

        if (this.auditOptions.dbType === "mongoose") {
            const result = checkForMongodb();
            if (!result) return;
        }

        AppConfig.setAuditOption(this.auditOptions);
        AppConfig.setDefaultFileConfig(this.defaultFileConfigs);
        AppConfig.setFileConfig(this.fileConfig);
        AppConfig.setLogFilePath(this.logFilePath);
        AppConfig.setCaptureSystemErrors(this.auditOptions.captureSystemErrors ?? false);

        this.isInitialized = true;
        AppConfig.setIsInitialized(this.isInitialized);

        this.HandleSystemErrors();

        this.auditOptions.logger?.info(chalk.green("Default Audit config set successfully"));
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
        const item = this.auditOptions.useTimeStamp ? { ...event, timeStamp: getTimeStamp() } : { ...event };

        if (this.auditOptions.destinations?.includes("console")) {
            logAuditEvent(item);
        }

        if (this.auditOptions.destinations?.includes("file")) {

            const actionFile = this.defaultFileConfigs.find(x => x.fileName === "action.log") as TFileConfig;
            const file = this.auditOptions.splitFiles ? actionFile : this.fileConfig;

            if (!file.fullPath) {
                this.auditOptions.logger?.error(chalk.red("Unable to locate file path"));
                return;
            }

            logAuditEvent(item, file);
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
        auditModel(schema);
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
    SetFileConfig(config: Omit<TFileConfig, "fullPath">) {

        if (!this.auditOptions.destinations?.includes("file")) {
            this.auditOptions.logger?.warn(chalk.yellowBright("You need to add file to destinations for this to work properly"));
            return;
        }

        if (this.auditOptions.splitFiles) {
            this.auditOptions.logger?.info(chalk.yellow("Cannot configure file as it is not supported when using splitfile"));
            return;
        }

        const folder = config?.folderName ?? "audit";
        const baseFileName = config?.fileName ?? "audit";
        const fileName = baseFileName.endsWith(".log") ? baseFileName : `${baseFileName}.log`;

        this.fileConfig = {
            ...config,
            folderName: folder,
            fileName,
            fullPath: "",
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
        return requestLogger();
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
        return errorLogger();
    }


    private CreateFileLocation = (config: TFileConfig) => {
        if (!this.auditOptions.destinations?.includes("file")) return;

        if (this.auditOptions.splitFiles) {
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

    /**
        * Sets up system error handling and logging for audit purposes.
        * @example
        * handleSystemErrors()
        * Initializes processes to log exceptions, rejections, signals, and exits.
        * @description
        *   - Listens for Node.js process events such as uncaught exceptions, unhandled rejections, SIGTERM, SIGINT, and exit.
        *   - Utilizes the `generateAuditContent` utility to format the logs.
        *   - Logs generated content using `handleLog` with the error file configuration.
        *   - Only activates if `captureSystemErrors` is true within audit options.
        */
    private HandleSystemErrors = () => {
        if (!this.auditOptions.captureSystemErrors) return;
        const file = getFileLocation("error.log");
        process.on("uncaughtException", (error, origin) => {
            const content = generateAuditContent({
                type: "error",
                action: "unknown",
                message: "an uncaughtException",
                outcome: "uncaughtException",
                error,
                origin,
            });
            handleLog(file, content);
        });
        process.on("unhandledRejection", (reason) => {
            const content = generateAuditContent({
                type: "error",
                action: "unknown",
                message: "an unhandledRejection",
                outcome: "unhandledRejection",
                reason,
            });
            handleLog(file, content);
        });

        process.on("SIGTERM", () => {
            const content = generateAuditContent({
                type: "signal",
                action: "terminated",
                message: "was terminated",
                outcome: "SIGTERM",
                signal: "SIGTERM",
            });
            handleLog(file, content);
        });

        process.on("SIGINT", () => {
            const content = generateAuditContent({
                type: "signal",
                action: "terminated",
                message: "app was terminated",
                outcome: "SIGINT",
                signal: "SIGINT",
            });
            handleLog(file, content);
        });


        process.on("exit", (code) => {
            const content = generateAuditContent({
                type: "system",
                action: "exit",
                message: "app was exited",
                outcome: "exit",
                code,
            });
            handleLog(file, content);
        });
    };
}