# Remote Logging Feature Documentation

This document summarizes the remote logging feature implemented in the Auditor project. This functionality allows users to send audit logs to external destinations for centralized collection, monitoring, and alerting.

---

## Overview

The remote logging feature enables sending audit logs to an external service using HTTP POST requests. It currently supports BetterStack, a popular log management platform, with more remote destinations planned in the future.

Remote logging is implemented using a transport called `betterStack`, which sends logs to a configured URL with a bearer token.

---

## Changes Summary

-   Added `betterStack` function in `src/remote/betterStack.ts` to send logs to a remote HTTP endpoint.
-   Added remote token configuration in `src/core/AppConfigs.ts` via `setRemoteToken` and `getRemoteToken`.
-   Extended `Audit` class (`src/core/Auditor.ts`) to support remote logging:
    -   Introduced `remoteConfig` property and `SetRemoteConfig` method.
    -   Enhanced `Setup` to validate remote credentials when "remote" is among the destinations.
    -   Updated `Log` and `LogError` methods to send logs remotely if configured.
-   `"remote"` added as a valid destination.

---

## Setup Instructions

To enable remote logging, follow these steps:

1. **Install and Import Auditor**

```ts
import { Audit } from '@kingdiablo/auditor';
```

2. **Create Auditor Instance and Include `"remote"` Destination**

```ts
const audit = new Audit({
	destinations: ['console', 'file', 'remote'], // include "remote"
	// other options as needed
});
```

3. **Set Remote Config Before Calling `Setup()`**

```ts
audit.SetRemoteConfig({
	url: 'https://in.logs.betterstack.com', // your remote endpoint
	token: 'your-betterstack-source-token', // personal BetterStack log source token
});
```

4. **Initialize the Auditor**

```ts
await audit.Setup();
```

---

## Usage

Once set up, logs will be automatically sent to all selected destinations.

### Example

```ts
audit.Log({
	type: 'auth',
	action: 'login',
	message: 'User logged in successfully',
});

try {
	// potentially failing logic
} catch (error) {
	audit.LogError(error);
}
```

---

## BetterStack Setup (for End Users)

To use BetterStack for remote logging:

1. **Create a BetterStack Account:** [https://betterstack.com](https://betterstack.com)
2. **Go to Logs > Sources > New Source**
3. **Copy the HTTP endpoint and the source token**
4. **Pass them into `SetRemoteConfig` as shown above**

BetterStack will now start receiving and storing your logs.

---

## Notes

-   A valid remote URL and token are required for remote logging to work.
-   If remote config is invalid or missing, it will fall back gracefully (console warning).
-   Logs are sent using `fetch` via HTTP POST with JSON payloads and Bearer tokens.
-   Remote logging is designed to be non-blocking and won’t crash your app if it fails.

---

## Roadmap

-   Additional remote transports are in development (e.g., Logtail, Loggly, Sentry, custom webhooks)
-   Support for retries and queueing failed logs is planned

---
