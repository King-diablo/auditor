import chalk from "chalk";
import { Document, Schema } from "mongoose";
import { TAuditOptions, TFileConfig } from "../../types";
import { getTimeStamp, logAuditEvent } from "../../utils";
import { userProfile } from "../../utils/user";


interface AuditDoc extends Document {
    _wasNew?: boolean;
    constructor: {
        modelName: string;
    };
}

let hasMongoose = false;
let dbFile: null | TFileConfig;

/**
 * Checks if the "mongoose" package is available in the current environment.
 * 
 * If "mongoose" is found, logs a success message and sets the `hasMongoose` flag to `true`.
 * If not found, logs an error message and sets the `hasMongoose` flag to `false`.
 *
 * @param config - The audit options object, which should include a logger for output messages.
 * @returns `true` if "mongoose" is available, otherwise `false`.
 */
export const checkForMongodb = (config: TAuditOptions) => {
    try {
        require.resolve("mongoose");
        config.logger?.info(chalk.green("Mongoose auditing is available"));
        hasMongoose = true;
        return hasMongoose;
    } catch (error) {
        config.logger?.error(chalk.red("Mongoose must be installed to use MongoDB auditing."));
        hasMongoose = false;
        return hasMongoose;
    }
};

/**
 * Enhances a Mongoose schema with auditing hooks for logging database operations.
 *
 * @template T - The type of the schema's document.
 * @param config - The audit configuration options, including a logger.
 * @param timeStamp - A string representing the timestamp to include in audit logs.
 * @param schema - The Mongoose schema to augment with audit hooks.
 *
 * @remarks
 * - Requires Mongoose to be installed; logs an error if not present.
 * - Adds pre-save and post-save hooks to log "create" or "update" actions.
 * - Adds a post-find hook to log "find" actions.
 * - Logs include model name, collection name, document ID, and timestamp.
 */
export const auditModel = <T>(config: TAuditOptions, schema: Schema<T>, file: TFileConfig) => {

    if (config.dbType === "none") {
        config.logger?.error(chalk.yellow("Cannot audit db while DB type is set to none"));
        return;
    }
    if (!hasMongoose) {
        config.logger?.error(chalk.red("Please install mongoose to use audit"));
        return;
    }

    if (!dbFile) dbFile = file;

    handleSaveSchema(schema, config);
    handleFindSchema(schema, config);
    handleUpdateSchema(schema, config);
    handleDeletingSchema(schema, config);
};

const handleSaveSchema = (schema: Schema, config: TAuditOptions) => {
    const log = generateLog(config);

    schema.pre('save', function (next) {
        (this as any)._wasNew = this.isNew;
        next();
    });

    schema.post("save", function (doc: AuditDoc, next) {
        const modelName = doc.constructor.modelName;
        const message = `doc was ${doc._wasNew ? "created" : "updated"}`;
        log("save", modelName, {}, message);

        next();
    });
};

const handleFindSchema = (schema: Schema, config: TAuditOptions) => {
    const log = generateLog(config);

    schema.post("find", function (docs) {
        const modelName = this.model.collection.name;
        const message = `looking for ${modelName}`;
        log("read", modelName, this.getFilter(), message, docs.length);
    });

    schema.post("findOne", function (doc: AuditDoc) {
        const modelName = this.model.collection.name;
        const message = `looking for a single ${modelName}`;
        log("read", modelName, this.getFilter(), message);
    });
};

const handleUpdateSchema = (schema: Schema, config: TAuditOptions) => {
    const log = generateLog(config);
    schema.post("updateOne", function (doc: AuditDoc) {
        const modelName = this.model.collection.name;
        const message = `updating a single ${modelName} doc`;
        log("update", modelName, this.getFilter(), message);
    });

    schema.post("findOneAndUpdate", function (doc: AuditDoc) {
        const modelName = this.model.collection.name;
        const message = `finding & updating a single ${modelName} doc`;
        log("update", modelName, this.getFilter(), message);

    });

    schema.post("updateMany", function (docs) {
        const modelName = this.model.collection.name;
        const message = `updating multiple ${modelName} docs`;
        log("update", modelName, this.getFilter(), message, docs.length);
    });
};

const handleDeletingSchema = (schema: Schema, config: TAuditOptions) => {
    const log = generateLog(config);
    schema.post("findOneAndDelete", function () {
        const modelName = this.model.collection.name;
        const message = `finding & deleting a single ${modelName} doc`;
        log("delete", modelName, this.getFilter(), message);
    });

    schema.post("deleteOne", function () {
        const modelName = this.model.collection.name;
        const message = `deleting a single ${modelName} doc`;
        log("delete", modelName, this.getFilter(), message);
    });

    schema.post("deleteMany", function (docs) {
        const modelName = this.model.collection.name;
        const message = `deleting multiple ${modelName} docs`;
        log("delete", modelName, this.getFilter(), message, docs.length);
    });
};


type TdbAction = "save" | "read" | "update" | "delete";
const generateLog = (config: TAuditOptions) => {
    return (action: TdbAction, modelName: string, filter: any, message: string, length?: number) => {
        const content = {
            type: "db",
            action,
            collection: modelName,
            criteria: filter,
            ...(length ? { resultCount: length } : {}),
            message,
            userId: userProfile.getUserId(),
            endPoint: userProfile.getEndPoint(),
            ip: userProfile.getIp(),
            userAgent: userProfile.getUserAgent(),
            timeStamp: getTimeStamp(),
        };
        if (config.destinations?.includes("console"))
            logAuditEvent(config, content)

        if (!dbFile) return;

        if (config.destinations?.includes("file"))
            logAuditEvent(config, content, dbFile);
    };
};