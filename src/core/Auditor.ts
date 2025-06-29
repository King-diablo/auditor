import { TAuditOptions, TEvent, } from "../types/type";

export class Audit {
    private logger: any;
    private destinations: string[];
    private db?: string;
    private useTimeStamp: boolean = true;

    constructor(private options: TAuditOptions) {
        this.logger = options.logger || console;
        this.destinations = options.destinations || ["console"];
        this.db = options.dbType;
        this.useTimeStamp = options.useTimeStamp ?? true;
        this.logger.info("Audit config set successfully");
    }


    Log(event: TEvent) {
        if (!this.destinations.includes("console")) return;
        this.logger.info(this.useTimeStamp ? { ...event, timeStamp: new Date().toISOString() } : { ...event });
        this.logger.info()
    }
}