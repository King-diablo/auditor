import { Framework, TAuditOptions, TFileConfig, TRemoteConfig } from "../types";

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
export const AppConfig = (<F extends Framework>() => {
    let logFilePath: string = '';
    let fileConfig: TFileConfig | undefined;
    let auditOption: TAuditOptions<F> | undefined;
    let isInitialized = false;
    let captureSystemErrors = true;
    let useUI = false;
    let defaultFileConfigs: TFileConfig[] | undefined;
    let framework: Framework = "express";
    let maxRetention: number = 0;
    let remoteToken: undefined | TRemoteConfig;

    return {
        setAuditOption(options: TAuditOptions<F>) {
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
        setCaptureSystemErrors(value: boolean | undefined) {
            captureSystemErrors = value ?? false;
        },
        getCaptureSystemErrors() {
            return captureSystemErrors;
        },
        setFramework(value: Framework) {
            framework = value;
        },
        getFramework() {
            return framework;
        },
        setUseUI(value: boolean | undefined) {
            useUI = value ?? false;
        },
        getUseUI() {
            return useUI;
        },
        setMaxRetention(value: number) {
            maxRetention = value;
        },
        getMaxRetention() {
            return maxRetention;
        },
        setRemoteToken(value?: TRemoteConfig) {
            remoteToken = value;
        },
        getRemoteToken() {
            return remoteToken;
        },
    };
})();