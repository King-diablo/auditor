# 🛡️ Auditor

Auditor is a lightweight, type-safe, and framework-agnostic audit logger for Node.js. It provides:

-   Request and error logging middleware for **Express**, **Fastify**, and **Koa**
-   Type-safe business event logging
-   Current flexible log destinations (console, file) with remote coming soon
-   **Database audit logging for Mongoose (MongoDB)** with others planned

---

## 📦 Installation

```bash
npm install @kingdiablo/auditor
```

You can also install and use your preferred logger and optionally an ORM:

```bash
npm install winston mongoose
```

---

## ℹ️ Quick Start (v0.3.0+)

> **Note:** After creating an `Auditor` instance, you **must** call `.Setup()` before using any middleware or logging features. This step is required for proper initialization.

### Express

```ts
import { Auditor } from '@kingdiablo/auditor';
import express from 'express';

const audit = new Auditor({ framework: 'express' });
await audit.Setup(); // <--- Required! Must be called after creating the Auditor instance
const app = express();
app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());
```

### Fastify

```ts
import { Auditor } from '@kingdiablo/auditor';
import Fastify from 'fastify';

const audit = new Auditor({ framework: 'fastify' });
await audit.Setup(); // <--- Required! Must be called after creating the Auditor instance
const fastify = Fastify();
fastify.addHook('onRequest', audit.RequestLogger().onRequest);
fastify.addHook('onResponse', audit.RequestLogger().onResponse);
// For error logging, use fastify.setErrorHandler(audit.ErrorLogger());
```

### Koa

```ts
import { Auditor } from '@kingdiablo/auditor';
import Koa from 'koa';

const audit = new Auditor({ framework: 'koa' });
await audit.Setup(); // <--- Required! Must be called after creating the Auditor instance
const app = new Koa();
app.use(audit.RequestLogger());
// For error logging, use app.use(audit.ErrorLogger());
```

---

## 🖥️ Using the Audit UI (Express, Fastify and Koa)

Auditor supports a built-in UI to view audit logs. To enable the UI, set the `useUI` option to `true` when creating the `Auditor` instance. This will download necessary UI dependencies and provide routes to serve the UI and logs.

### Express UI Setup

```ts
import { Auditor } from '@kingdiablo/auditor';
import express from 'express';

const audit = new Auditor({ framework: 'express', useUI: true });
await audit.Setup();

const app = express();
app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());

// Mount the audit UI routes
if (audit.CreateUI) {
	const auditUI = await audit.CreateUI();
	app.use(auditUI);
}
```

### Fastify UI Setup

```ts
import { Auditor } from '@kingdiablo/auditor';
import Fastify from 'fastify';

const audit = new Auditor({ framework: 'fastify', useUI: true });
await audit.Setup();

const fastify = Fastify();
fastify.addHook('onRequest', audit.RequestLogger().onRequest);
fastify.addHook('onResponse', audit.RequestLogger().onResponse);
fastify.setErrorHandler(audit.ErrorLogger());

// Mount the audit UI routes
const auditUI = await audit.CreateUI();
fastify.register(auditUI);

fastify.listen(3000, () => {
	console.log('Server running on http://localhost:3000');
});
```

### Koa UI Setup

```ts
import { Auditor } from '@kingdiablo/auditor';
import Koa from 'koa';

const audit = new Auditor({ framework: 'koa', useUI: true });
await audit.Setup();

const app = new Koa();
app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());

// Mount the audit UI routes
const auditUI = await audit.CreateUI();
app.use(auditUI);

app.listen(3000, () => {
	console.log('Server running on http://localhost:3000');
});
```

The UI will be available at `/audit-ui` and audit logs can be fetched from `/audit-log`.

---

## 📄 Configuring File Logging (SetFileConfig)

To customize the file logging location or filename, use the `SetFileConfig` method after creating your Auditor instance. This is useful if you want to store logs in a specific folder or use a custom log file name.

**Requirements:**

-   The `file` destination must be enabled in your Auditor config.
-   `SetFileConfig` will not work if `splitFiles` is set to `true`.

```ts
const audit = new Auditor({
	destinations: ['file'],
});
audit.Setup(); // <--- Required! Must be called after creating the Auditor instance

// Configure file logging location and filename
// This will store logs in './logs/my-audit.log'
audit.SetFileConfig({
	folderName: 'logs',
	fileName: 'my-audit', // Do not include .log extension; it will be added automatically
});
```

-   `folderName`: The folder where logs will be stored (default: `audit`)
-   `fileName`: The name of the log file (default: `audit`)

If you do not call `SetFileConfig`, logs will be written to `./audit/audit.log` by default.

---

## 🛠️ Configuration

You can create an Auditor instance with zero configuration for quick prototyping or testing:

```ts
const audit = new Auditor(); // Defaults to Express, console logging
audit.Setup(); // <--- Required! Must be called after creating the Auditor instance
```

Or pass options to customize the logger, destinations, database type, timestamp usage, and split file logging:

```ts
const audit = new Auditor({
	logger: myLogger, // e.g., Winston or Pino instance
	destinations: ['console', 'file'],
	dbType: 'mongoose',
	useTimeStamp: true, // optional, default is true
	splitFiles: true, // Logs to error.log, request.log, db.log, and action.log in the 'audits' folder
	framework: 'fastify', // or 'koa', 'express'
	useUI: true, // Enable the audit UI
});
audit.Setup(); // <--- Required! Must be called after creating the Auditor instance
```

## 🚀 Features

-   **Multi-framework support:** Express, Fastify, and Koa middleware out of the box
-   **Automatic MongoDB audit logging** (Mongoose): Track create, update, delete, and find operations on your models
-   **User context utilities:** Capture userId, endpoint, IP, and user agent for every log entry (see below for details)
-   **Split file logging:** Separate logs for errors, requests, DB actions, and business events
-   **Type-safe business event logging** with IntelliSense
-   **Pluggable logging backends** (Console, Winston, Pino, etc.)
-   **Configurable log destinations:** console, file
-   **System error & signal logging:** Optionally log uncaught exceptions, unhandled rejections, SIGTERM, SIGINT, and process exit events (see `captureSystemErrors`)
-   **Manual error logging:** Log errors directly using `audit.LogError(error)`
-   **Mongoose schema auditing:** Enable DB operation auditing for any Mongoose schema with `audit.AuditModel(schema)`

---

## ⚙ Configuration Options

| Option                | Type     | Default       | Description                                                                             |
| --------------------- | -------- | ------------- | --------------------------------------------------------------------------------------- |
| `logger`              | any      | `console`     | Your custom logger instance (Winston, Pino, etc)                                        |
| `destinations`        | string[] | `["console"]` | Where to send logs (`console`, `file`)                                                  |
| `dbType`              | string   | `'none'`      | Supported DBs: `'mongoose'`                                                             |
| `useTimeStamp`        | boolean  | `true`        | Include timestamp in logs                                                               |
| `splitFiles`          | boolean  | `false`       | Log to separate files for errors, requests, db, actions                                 |
| `framework`           | string   | `'express'`   | `'express'`, `'fastify'`, or `'koa'`                                                    |
| `captureSystemErrors` | boolean  | `false`       | Log uncaught exceptions, unhandled rejections, SIGTERM, SIGINT, and process exit events |
| `useUI`               | boolean  | `false`       | Enable the audit UI                                                                     |

---

**Split file logging:**

-   When `splitFiles: true`, logs are written to `audits/error.log`, `audits/request.log`, `audits/db.log`, and `audits/action.log`.
-   Otherwise, all logs go to a single file (default: `audit/audit.log`).

**System error logging:**

-   If `captureSystemErrors: true`, Auditor will log uncaught exceptions, unhandled promise rejections, SIGTERM, SIGINT, and process exit events to your error log.

**Behavior if not initialized:**

-   If you forget to call `.Setup()`, log methods will warn you and may not function as expected.

---

## 🪵 Business Event Logging (`Log`)

The `Log` method allows you to record business events, security actions, or any custom audit event in a type-safe way. It provides IntelliSense for event types and actions.

**Example:**

```ts
audit.Log({
	type: 'auth', // IntelliSense: 'auth', 'billing', 'system', 'error', ...
	action: 'login', // IntelliSense: 'login', 'logout', ...
	message: 'User logged in successfully.',
});
```

You can extend the available types and actions to fit your business needs, and TypeScript will provide suggestions and catch typos.

**Custom event example:**

```ts
audit.Log({
	type: 'custom_event',
	action: 'something_happened',
	message: 'A custom event occurred.',
});
```

## 🛑 Manual Error Logging (`LogError`)

You can manually log errors (outside of middleware) using the `LogError` method:

```ts
try {
	// ...some code that might throw
} catch (err) {
	audit.LogError(err);
}
```

This will log the error to all configured destinations, including stack trace and user context if available.

---

## 🗄️ Mongoose Schema Auditing (`AuditModel`)

To enable automatic auditing of database operations on a Mongoose schema, call `AuditModel` after defining your schema:

```ts
import mongoose from 'mongoose';
import { Auditor } from '@kingdiablo/auditor';

const audit = new Auditor({ dbType: 'mongoose' });
audit.Setup();

const userSchema = new mongoose.Schema({
	/* ... */
});
audit.AuditModel(userSchema); // <-- enables auditing for this schema
```

---

## ⚠️ Error Logger Middleware (`ErrorLogger`)

The `ErrorLogger` middleware automatically captures and logs errors that occur during request handling in your app.

**Usage:**

```ts
// Express
app.use(audit.ErrorLogger());
// Fastify: fastify.setErrorHandler(audit.ErrorLogger());
// Koa: app.use(audit.ErrorLogger());
```

**How to include userId in error logs:**
If your request object has a `user` property with an `id` field, it will be included in the log entry. Adjust your authentication middleware as needed.

---

## 🔄 Request Logger Middleware (`RequestLogger`)

The `RequestLogger` middleware tracks every incoming HTTP request and logs useful details for auditing and performance monitoring.

**Usage:**

```ts
// Express
app.use(audit.RequestLogger());
// Fastify: fastify.addHook('onRequest', audit.RequestLogger().onRequest);
//         fastify.addHook('onResponse', audit.RequestLogger().onResponse);
// Koa: app.use(audit.RequestLogger());
```

---

---

## 🧭 Roadmap & Planned Features

-   [x] Core audit logger class
-   [x] Request and error middleware for Express, Fastify, Koa
-   [x] File-based JSON logging
-   [x] **Database audit** — log database operations for Mongoose (MongoDB)
-   [x] Audit UI support for Express, Fastify, and Koa
-   [ ] Prisma and Sequelize support (planned)
-   [ ] Remote logging transport (planned)
-   [ ] More configuration options: log rotation, custom transports (planned)

---

## 📋 Changelog

See the [CHANGELOG.md](./CHANGELOG.md) for a detailed list of releases, new features, bug fixes, and planned improvements.

---

## 📜 License

MIT

---

## 🙌 Contributing

PRs and feature requests are welcome!

See the [CONTRIBUTING.MD](./CONTRIBUTING.md) for more information about contributing to this project.
