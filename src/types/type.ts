export type TAuditOptions = {
    destinations?: string[];
    logger?: any;
    dbType?: 'mongoose';
};

export type TType = "auth" | "billing" | "system" | "error";

export type TEvent<T extends string = TType | (string & {})> = {
    type: T,
    action: string,
    message: string,
};
