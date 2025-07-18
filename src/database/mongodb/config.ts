import chalk from "chalk";
import { Schema } from "mongoose";
import { AppConfig } from "../../core/AppConfigs";
import { checkForModule, generateAuditContent, getFileLocation, getTimeStamp, logAuditEvent } from "../../utils";
import { userProfile } from "../../utils/user";



let hasMongoose = false;


/**
 * Checks if the "mongoose" module is available in the current environment.
 *
 * @returns {boolean} Returns `true` if the "mongoose" module is found, otherwise `false`.
 */
export const checkForMongodb = () => {
    hasMongoose = checkForModule("mongoose");
    return hasMongoose;
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
export const auditModel = <T>(schema: Schema<T>) => {
    const config = AppConfig.getAuditOption()!;
    if (config.dbType === "none") {
        config.logger?.error(chalk.yellow("Cannot audit db while DB type is set to none"));
        return;
    }
    if (!hasMongoose) {
        config.logger?.error(chalk.red("Please install mongoose to use audit"));
        return;
    }

    handleSaveSchema(schema);
    handleFindSchema(schema);
    handleUpdateSchema(schema);
    handleDeletingSchema(schema);
};

const handleSaveSchema = (schema: Schema) => {
    const log = generateLog();

    schema.pre('save', function (next) {
        (this as any)._wasNew = this.isNew;
        next();
    });

    schema.post("save", (doc: any) => {
        const { modelName } = doc.constructor;
        const message = `doc was ${doc._wasNew ? "created" : "updated"}`;
        log("save", modelName, {}, message);
    });
};

const handleFindSchema = (schema: Schema) => {
    const log = generateLog();

    schema.post("find", function (docs) {
        const modelName = this.model.collection.name;
        const message = `looking for ${modelName}`;
        log("read", modelName, this.getFilter(), message, docs.length);
    });

    schema.post("findOne", function (doc: any) {
        const modelName = this.model.collection.name;
        const message = `looking for a single ${modelName}`;
        log("read", modelName, this.getFilter(), message);
    });
};

const handleUpdateSchema = (schema: Schema) => {
    const log = generateLog();
    schema.post("updateOne", function (doc: any) {
        const modelName = this.model.collection.name;
        const message = `updating a single ${modelName} doc`;
        log("update", modelName, this.getFilter(), message);
    });

    schema.post("findOneAndUpdate", function (doc: any) {
        const modelName = this.model.collection.name;
        const message = `finding & updating a single ${modelName} doc`;
        log("update", modelName, this.getFilter(), message);

    });

    schema.post("updateMany", function (docs) {
        const modelName = this.model.collection.name;
        const message = `updating multiple ${modelName} docs`;
        log("update", modelName, this.getFilter(), message, docs.modifiedCount);
    });
};

/**
* Sets up Mongoose schema middleware to log deletion operations.
* @example
* handleDeletingSchema(userSchema)
* // No return value; sets up post-hooks on provided schema
* @param {Schema} schema - Represents the Mongoose schema on which to add audit logging for delete operations.
* @returns {void} No return value; sets up middleware on the provided schema.
* @description
*   - Utilizes Mongoose post-hooks to capture delete operations like `findOneAndDelete`, `deleteOne`, and `deleteMany`.
*   - Logs details of delete operations such as model name, filter criteria, action type, and affected document count if applicable.
*   - Requires the `generateLog` function to generate log entries which depend on user profile and configuration settings.
*   - Ensures that information related to each delete operation is audited and possibly persisted based on audit configuration options.
*/
const handleDeletingSchema = (schema: Schema) => {
    const log = generateLog();
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
        log("delete", modelName, this.getFilter(), message, docs.deletedCount);
    });
};


type TdbAction = "save" | "read" | "update" | "delete";
const generateLog = () => {
    const config = AppConfig.getAuditOption()!;

    return (action: TdbAction, modelName: string, filter: any, message: string, length?: number) => {
        const content = generateAuditContent({
            type: "db",
            action,
            collection: modelName,
            criteria: filter,
            ...(length !== undefined ? { resultCount: length } : {}),
            message,
            userId: userProfile.getUserId(),
            endPoint: userProfile.getEndPoint(),
            ip: userProfile.getIp(),
            userAgent: userProfile.getUserAgent(),
        });

        if (config.destinations?.includes("console"))
            logAuditEvent(content);

        const dbFile = getFileLocation("db.log");

        if (!dbFile) return;

        if (config.destinations?.includes("file"))
            logAuditEvent(content, dbFile);
    };
};