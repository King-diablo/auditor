import { TAuditOptions, TEvent } from "../types/type";

export class Audit {
    private logger: any;
    private destinations: string[];
    private db?: string;

    constructor(private options: TAuditOptions) {
        this.logger = options.logger || console;
        this.destinations = options.destinations || ["console"];
        this.db = options.dbType;
    }

    Log(event: TEvent) {
        if (!this.destinations.includes("console")) return;
        this.logger.info({ ...event, timeStamp: new Date().toISOString() });
    }
}