import { TAuditOptions, TFileConfig } from "../types";

/**
 * Singleton configuration manager for the application.
 * 
 * Provides getter and setter methods for managing global configuration options such as:
 * - Audit options (`TAuditOptions`)
 * - Log file path
 * - File configuration (`TFileConfig`)
 * - Default file configurations (`TFileConfig[]`)
 * - Initialization state
 * 
 * @remarks
 * This object encapsulates configuration state and exposes methods to mutate and retrieve configuration values.
 * 
 * @example
 * ```typescript
 * AppConfig.setLogFilePath('/var/log/app.log');
 * const logPath = AppConfig.getLogFilePath();
 * ```
 */
export const AppConfig = (() => {
    let logFilePath = "";
    let fileConfig: TFileConfig | undefined;
    let auditOption: TAuditOptions | undefined;
    let isInitialized = false;
    let captureSystemErrors = true;
    let defaultFileConfigs: TFileConfig[] | undefined;

    return {
        setAuditOption(options: TAuditOptions) {
            auditOption = options;
        },
        getAuditOption() {
            return auditOption;
        },

        setLogFilePath(value: string) {
            logFilePath = value;
        },
        getLogFilePath() {
            return logFilePath;
        },

        setFileConfig(config: TFileConfig) {
            fileConfig = config;
        },
        getFileConfig() {
            return fileConfig;
        },

        setDefaultFileConfig(config: TFileConfig[]) {
            defaultFileConfigs = config;
        },
        getDefaultFileConfig() {
            return defaultFileConfigs;
        },

        setIsInitialized(value: boolean) {
            isInitialized = value;
        },
        getIsInitialized() {
            return isInitialized;
        },
        setCaptureSystemErrors(value: boolean) {
            captureSystemErrors = value;
        },
        getCaptureSystemErrors() {
            return captureSystemErrors;
        }
    };
})();