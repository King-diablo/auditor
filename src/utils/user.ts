/**
 * Represents a user profile containing identifying and network information.
 *
 * @remarks
 * The `UserProfile` class encapsulates a user's ID, endpoint URL, and IP address.
 * It provides methods to build and retrieve these properties.
 *
 * @example
 * ```typescript
 * const profile = new UserProfile();
 * profile.BuildProfile('123', 'https://api.example.com', '192.168.1.1');
 * console.log(profile.getUserId()); // '123'
 * ```
 */
class UserProfile {
    private userId: string;
    private endPoint: string;
    private ip: string;
    private userAgent: string;

    constructor() {
        this.userId = "";
        this.endPoint = "";
        this.ip = "";
        this.userAgent = "";
    }

    BuildProfile(id: string, url: string, ip: string, userAgent: string) {
        this.userId = id;
        this.endPoint = url;
        this.ip = ip;
        this.userAgent = userAgent;
    }

    getUserId() {
        return this.userId;
    }
    getEndPoint() {
        return this.endPoint;
    }
    getIp() {
        return this.ip;
    }
    getUserAgent() {
        return this.userAgent;
    }
}


const userProfile = new UserProfile();

export { userProfile };