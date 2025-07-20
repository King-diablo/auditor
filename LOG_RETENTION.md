# Log Retention Documentation

This document explains the log retention feature in the Auditor project, including how to configure and use it.

---

## What is Log Retention?

Log retention refers to the policy and configuration that controls how long audit logs are kept before they are deleted or archived. Proper log retention helps manage disk space and ensures compliance with data retention policies.

---

## Configuration

The Auditor class supports configuring log retention via the `maxRetention` option and controlling log file size via the `maxSizeBytes` option in file configuration.

### Setting Log Retention and Max File Size

When creating an instance of the `Audit` class, you can specify the `maxRetention` option (in days) to control how long logs are retained:

```ts
import { Audit } from '@kingdiablo/auditor';

const audit = new Audit({
	maxRetention: 30, // Retain logs for 30 days
	// other options...
});

await audit.Setup();
```

To control the maximum size of log files, use the `SetFileConfig` method to specify `maxSizeBytes` (in bytes):

```ts
audit.SetFileConfig({
	folderName: 'logs',
	fileName: 'audit.log',
	maxSizeBytes: 10, // 10 MB
});
```

## How It Works

-   The `maxRetention` setting defines the maximum number of days to keep audit logs.
-   The `maxSizeBytes` setting defines the maximum size of each log file.
-   Logs older than the retention period should be deleted or archived by the system (implementation of cleanup is expected to be handled externally or in future versions).
-   This setting helps prevent excessive disk usage by limiting the lifespan and size of log files.

---

## Notes

-   Currently, the Auditor project stores the `maxRetention` and `maxSizeBytes` values
-   The default value for `maxRetention` is `0`, which means no retention limit is applied.
-   The default value for `maxSizeBytes` is 5 MB.
-   It is recommended to set reasonable retention periods and file size limits based on your compliance and storage requirements.

---

## Summary

| Option         | Type   | Default  | Description                         |
| -------------- | ------ | -------- | ----------------------------------- |
| `maxRetention` | number | `0`      | Maximum days to retain audit logs.  |
| `maxSizeBytes` | number | 10485760 | Maximum size in bytes of log files. |

---
