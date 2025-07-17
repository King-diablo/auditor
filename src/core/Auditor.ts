import chalk from "chalk";
import { auditModel, checkForMongodb } from "../database/mongodb";
import { auditPrisma, checkForPrisma } from "../database/prisma";
import { errorLogger, requestLogger } from "../middleware";
import { UIRouter, checkForFramework, downloadDependency } from "../router";
import { DBInstance, Framework, SupportedLoggersRequest, TAuditOptions, TEvent, TFileConfig } from "../types/type";
import { createFile, generateAuditContent, generateByte, getFileLocation, handleLog, logAuditEvent } from "../utils";
import { userProfile } from "../utils/user";
import { AppConfig } from "./AppConfigs";


export class Audit<F extends Framework = "express"> {
    private logFilePath: string = "";
    private defaultFileConfigs: TFileConfig[] = [
        {
            fileName: "error.log",
            folderName: "audits",
            maxSizeBytes: generateByte(),
            fullPath: "",
        },
        {
            fileName: "request.log",
            folderName: "audits",
            maxSizeBytes: generateByte(),
            fullPath: "",
        },
        {
            fileName: "db.log",
            folderName: "audits",
            maxSizeBytes: generateByte(),
            fullPath: "",
        },
        {
            fileName: "action.log",
            folderName: "audits",
            maxSizeBytes: generateByte(),
            fullPath: "",
        },
    ];
    private fileConfig: TFileConfig = {
        fileName: "audit.log",
        folderName: "audit",
        maxSizeBytes: generateByte(),
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
        maxRetention: 0,
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
            maxRetention: options?.maxRetention ?? 0,
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
    async Setup() {
        if (this.isInitialized) {
            this.auditOptions.logger?.warn(chalk.yellow("Audit already initialized."));
            return;
        }

    this.CreateFileLocation(this.fileConfig);

    AppConfig.setAuditOption(this.auditOptions);
    AppConfig.setDefaultFileConfig(this.defaultFileConfigs);
    AppConfig.setFileConfig(this.fileConfig);
    AppConfig.setLogFilePath(this.logFilePath);
    AppConfig.setCaptureSystemErrors(this.auditOptions.captureSystemErrors);
    AppConfig.setFramework(this.auditOptions.framework!);
    AppConfig.setUseUI(this.auditOptions.useUI);
    AppConfig.setMaxRetention(this.auditOptions.maxRetention ?? 0);

    if (this.auditOptions.dbType === "mongoose") {
        const result = checkForMongodb();
        if (!result) return;
    }

    if (this.auditOptions.dbType === "prisma") {
        const result = checkForPrisma();
        if (!result) return;
    }

    if (this.auditOptions.useUI) {
        const hasFramework = checkForFramework();
        if (hasFramework) {
            AppConfig.getAuditOption()?.logger?.info(chalk.yellow("In order to use this module some dependency will be downloaded"));
            await downloadDependency();
        }
    }



    this.isInitialized = true;
    AppConfig.setIsInitialized(this.isInitialized);

    this.HandleSystemErrors();

    this.auditOptions.logger?.info(chalk.green("Default Audit config set successfully"));
}


/**
    * Logs an event based on audit configuration to specified destinations such as console and/or file.
    * @example
    * Log({type: "info", action: "login", message: "User logged in"})
    * Logs the provided event according to configured destinations and options.
    * @param {TEvent} event - The event object to be logged, which includes the type, action, and message.
    * @returns {void} Does not return a value.
    * @description
    *   - Checks for missing event details such as type, action, or message before logging.
    *   - Utilizes `generateAuditContent` to structure the event data.
    *   - Ensures logging operations do not proceed if the auditor is uninitialized.
    *   - Handles file path validation when logging to files, especially in split file configurations.
    */
    Log(event: TEvent) {

        if (processEmptyLog(event)) return;

        const item = generateAuditContent({ ...event });

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
            return;
        }

        let stackLine = "";
        if (error.stack) {
            const lines = error.stack.split('\n');
            stackLine = lines.length > 1 ? lines[1].trim() : lines[0]?.trim() ?? "";
        }

        const item = generateAuditContent({
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
        });

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
    * Audits a database model based on the provided schema.
    * @example
    * auditModel(mongooseSchema) or auditModel(prismaClient)
    * Initializes database operation auditing on a Mongoose schema or Prisma client.
    * @param {DBInstance} schema - The database instance or schema to audit.
    * @returns {void} Does not return a value.
    * @description
    *   - Only functions if a schema and a valid database type are provided.
    *   - Mongoose audit will only occur if dbType is specifically set to "mongoose".
    *   - Prisma audit operates if dbType is set to "prisma" with a valid PrismaClient instance.
    */
    AuditModel(schema: DBInstance) {
        if (!schema) {
            this.auditOptions.logger?.error(chalk.red("No schema or client provided"));
            return;
        }
        if (this.auditOptions.dbType === "mongoose")
            auditModel(schema);
        if (this.auditOptions.dbType === "prisma")
            auditPrisma(schema);
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
     * Asynchronously creates and returns the UI component or handler based on the specified framework
     * in the audit options.
     *
     * @returns {Promise<any>} A promise that resolves to the UI component or handler corresponding to the selected framework.
     */
    CreateUI() {

        if (!AppConfig.getUseUI()) {
            AppConfig.getAuditOption()?.logger?.info(chalk.yellow("Add the useUI option in the constructor to download the dependency"));
            return UIRouter[this.auditOptions.framework!];
        }

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
            const fullStack = error instanceof Error ? error.stack : undefined;
            const content = generateAuditContent({
                type: "error",
                action: "unknown",
                message: error.message ?? "an uncaughtException occurred",
                outcome: "uncaughtException",
                error,
                origin,
                fullStack,
            });
            handleLog(file, content);
        });
        process.on("unhandledRejection", (reason) => {
            const content = generateAuditContent({
                type: "error",
                action: "unknown",
                message: "an unhandledRejection occurred",
                outcome: "unhandledRejection",
                reason,
            });
            handleLog(file, content);
        });

        process.on("SIGTERM", () => {
            const content = generateAuditContent({
                type: "signal",
                action: "terminated",
                message: "SIGTERM signal was received",
                outcome: "terminated with SIGTERM",
                signal: "SIGTERM",
            });
            handleLog(file, content);
            process.exit(0);
        });

        process.on("SIGINT", () => {
            const content = generateAuditContent({
                type: "signal",
                action: "terminated",
                message: "app was terminated with a SIGINT signal",
                outcome: "terminated with SIGINT",
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

const processEmptyLog = (event: TEvent) => {
    const missing = [];
    if (!event?.type) missing.push("type");
    if (!event?.action) missing.push("action");
    if (!event?.message) missing.push("message");

    if (missing.length) {
        AppConfig.getAuditOption()?.logger?.error(chalk.redBright(`Unable to log message. Missing: ${missing.join(", ")}`));
        return true;
    }

    return false;
};