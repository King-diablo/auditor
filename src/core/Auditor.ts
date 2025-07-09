import chalk from "chalk";
import { Schema } from "mongoose";
import { auditModel, checkForMongodb } from "../database/mongodb";
import { errorLogger, requestLogger } from "../middleware";
import { Framework, SupportedLoggersRequest, TAuditOptions, TEvent, TFileConfig } from "../types/type";
import { createFile, generateAuditContent, getFileLocation, getTimeStamp, handleLog, logAuditEvent } from "../utils";
import { userProfile } from "../utils/user";
import { AppConfig } from "./AppConfigs";
import { checkForFramework, UIRouter } from "../router";


export class Audit<F extends Framework = "express"> {
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

    private auditOptions: TAuditOptions<F> = {
        dbType: "none",
        destinations: ["console"],
        framework: "express" as F,
        logger: console,
        useTimeStamp: true,
        splitFiles: false,
        captureSystemErrors: false,
        useUI: false,
    };



    /**
     * Creates an instance of the Auditor class with the provided options.
     *
     * @param options - Optional configuration object for the auditor.
     *   - `logger`: Custom logger to use; defaults to `console` if not provided.
     *   - `dbType`: Type of database to use; defaults to `"none"`.
     *   - `destinations`: Array of destinations for audit logs; defaults to `["console"]`.
     *   - `framework`: The framework being used (e.g., "express"); defaults to `"express"`.
     *   - `useTimeStamp`: Whether to include timestamps in logs; defaults to `true`.
     *   - `splitFiles`: Whether to split logs into multiple files; defaults to `false`.
     *   - `captureSystemErrors`: Whether to capture system errors; defaults to `false`.
     *
     * Initializes the `auditOptions` property by merging the provided options with sensible defaults.
     */
    constructor(private options?: TAuditOptions<F>) {
        this.auditOptions = {
            ...options,
            logger: options?.logger || console,
            dbType: options?.dbType || "none",
            destinations: options?.destinations || ["console"],
            framework: options?.framework as F ?? "express" as F,
            useTimeStamp: options?.useTimeStamp ?? true,
            splitFiles: options?.splitFiles ?? false,
            captureSystemErrors: options?.captureSystemErrors ?? false,
            useUI: options?.useUI ?? false,
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

        if (this.auditOptions.useUI) {
            checkForFramework();
        }

        AppConfig.setAuditOption(this.auditOptions);
        AppConfig.setDefaultFileConfig(this.defaultFileConfigs);
        AppConfig.setFileConfig(this.fileConfig);
        AppConfig.setLogFilePath(this.logFilePath);
        AppConfig.setCaptureSystemErrors(this.auditOptions.captureSystemErrors ?? false);
        AppConfig.setFrameWork(this.auditOptions.framework!);
        AppConfig.setUseUI(this.auditOptions.useUI ?? false);

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

        if (!this.isInitialized) {
            this.auditOptions?.logger?.info(chalk.red("Not Initialized. Setup Is Required"));
            return;
        }

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
        * Logs an error event to the configured destinations (console and/or file).
        * @example
        * LogError(new Error("Unexpected failure"))
        * Logs error details to the console and file depending on configuration.
        * @param {any} error - The error object to be logged.
        * @description
        *   - Extracts the error stack trace to capture informative details.
        *   - Compiles additional user context such as IP and user agent when available.
        *   - Handles uninitialized state by printing a warning message.
        *   - Utilizes timestamp inclusion and log destination logic based on audit options.
        */
    LogError(error: any) {

        if (!this.isInitialized) {
            this.auditOptions?.logger?.info(chalk.red("Not Initialized. Setup Is Required"));
        }

        let stackLine = "";
        if (error.stack) {
            const lines = error.stack.split('\n');
            stackLine = lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? "";
        }

        const generateErrorEvent = {
            type: "error",
            action: "unknown",
            outcome: "error",
            method: "user called",
            statusCode: error.statusCode ?? 500,
            userId: userProfile.getUserId() ?? "unknown",
            ip: userProfile.getIp() ?? "unknown",
            userAgent: userProfile.getUserAgent() ?? "unknown",
            message: error.message ?? "an error occurred",
            stack: stackLine ?? "no stack available",
        };

        const item = this.auditOptions.useTimeStamp ? { ...generateErrorEvent, timeStamp: getTimeStamp() } : { ...generateErrorEvent };

        if (this.auditOptions.destinations?.includes("console")) {
            logAuditEvent(item);
        }

        if (this.auditOptions.destinations?.includes("file")) {

            const actionFile = this.defaultFileConfigs.find(x => x.fileName === "error.log") as TFileConfig;
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
    RequestLogger(): SupportedLoggersRequest[F] {
        return requestLogger[this.auditOptions.framework!];
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
        return errorLogger[this.auditOptions.framework!];
    }


    /**
        * Initializes UI routes based on the configured framework.
        * @example
        * CreateUI()
        * Returns framework-specific UI Router.
        * @returns {any} Framework-specific UI Router instance.
        * @description
        *   - This method utilizes the audit framework from the options to select the appropriate UI routing setup.
        *   - Assumes framework options are correctly initialized and set.
        */
    CreateUI() {
        return UIRouter[this.auditOptions.framework!];
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
            process.exit(0);
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
            process.exit(0);
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
