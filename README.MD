
# 🛡️ Auditor

Auditor is a lightweight, type-safe, and framework-agnostic audit logger for Node.js. It provides:

-   Request and error logging middleware for **Express**, **Fastify**, and **Koa**
-   Type-safe business event logging
-   Current flexible log destinations (console, file) with remote coming soon
-   **Database audit logging for Mongoose (MongoDB)** and **Prisma** with others planned

---

## 📦 Installation

```bash
npm install @kingdiablo/auditor
````

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
await audit.Setup();
const app = express();
app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());
```

### Fastify

```ts
import { Auditor } from '@kingdiablo/auditor';
import Fastify from 'fastify';

const audit = new Auditor({ framework: 'fastify' });
await audit.Setup();
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
await audit.Setup();
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

const auditUI = await audit.CreateUI();
app.use(auditUI);

app.listen(3000, () => {
	console.log('Server running on http://localhost:3000');
});
```

The UI will be available at `/audit-ui` and audit logs can be fetched from `/audit-log`.

---

## 📄 Configuring File Logging (SetFileConfig)

```ts
const audit = new Auditor({ destinations: ['file'] });
await audit.Setup();

audit.SetFileConfig({
	folderName: 'logs',
	fileName: 'my-audit',
});
```

Default values:

* `folderName`: `audit`
* `fileName`: `audit`

---

## 🛠️ Configuration

```ts
const audit = new Auditor({
	logger: myLogger,
	destinations: ['console', 'file'],
	dbType: 'mongoose',
	useTimeStamp: true,
	splitFiles: true,
	framework: 'fastify',
	useUI: true,
});
await audit.Setup();
```

---

## 🚀 Features

* Multi-framework support
* Request/error middleware
* File-based JSON logging
* Database audit logging (Mongoose + Prisma)
* User context capture (userId, IP, endpoint)
* Split file logging
* Type-safe business event logging
* Pluggable loggers (Console, Winston, Pino)
* Optional system error signal logging
* UI dashboard support

---

## ⚙ Configuration Options

| Option                | Type      | Default       | Description                                      |
| --------------------- | --------- | ------------- | ------------------------------------------------ |
| `logger`              | any       | `console`     | Your custom logger instance (Winston, Pino, etc) |
| `destinations`        | string\[] | `['console']` | Log destinations (`console`, `file`)             |
| `dbType`              | string    | `'none'`      | `'mongoose'`, `'prisma'`                         |
| `useTimeStamp`        | boolean   | `true`        | Add timestamp to logs                            |
| `splitFiles`          | boolean   | `false`       | Use separate files for each log type             |
| `framework`           | string    | `'express'`   | `'express'`, `'fastify'`, `'koa'`                |
| `captureSystemErrors` | boolean   | `false`       | Capture uncaught exceptions, SIGTERM, etc        |
| `useUI`               | boolean   | `false`       | Serve the audit dashboard                        |

---

## 🪵 Business Event Logging (`Log`)

```ts
audit.Log({
	type: 'auth',
	action: 'login',
	message: 'User logged in successfully.',
});
```

Custom events are supported:

```ts
audit.Log({
	type: 'custom_event',
	action: 'something_happened',
	message: 'A custom event occurred.',
});
```

---

## 🛑 Manual Error Logging (`LogError`)

```ts
try {
	// ...some code
} catch (err) {
	audit.LogError(err);
}
```

---

## 🗄️ Mongoose Schema Auditing (`AuditModel`)

```ts
import mongoose from 'mongoose';
import { Auditor } from '@kingdiablo/auditor';

const audit = new Auditor({ dbType: 'mongoose' });
await audit.Setup();

const userSchema = new mongoose.Schema({
	/* fields */
});

audit.AuditModel(userSchema);
```

---

## ✨ Prisma Database Auditing Support

### Setup

```bash
npm install @prisma/client
```

```ts
import { Auditor } from '@kingdiablo/auditor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const audit = new Auditor({ dbType: 'prisma' });
await audit.Setup();
audit.AuditModel(prisma);
```

---

## 🔄 Request Logger Middleware (`RequestLogger`)

```ts
// Express
app.use(audit.RequestLogger());

// Fastify
fastify.addHook('onRequest', audit.RequestLogger().onRequest);
fastify.addHook('onResponse', audit.RequestLogger().onResponse);

// Koa
app.use(audit.RequestLogger());
```

---

## ⚠️ Error Logger Middleware (`ErrorLogger`)

```ts
// Express
app.use(audit.ErrorLogger());

// Fastify
fastify.setErrorHandler(audit.ErrorLogger());

// Koa
app.use(audit.ErrorLogger());
```

---

## 🧭 Roadmap & Planned Features

-   [x] Core audit logger class
-   [x] Request and error middleware for Express, Fastify, Koa
-   [x] File-based JSON logging
-   [x] **Database audit** — log database operations for Mongoose (MongoDB) and Prisma
-   [x] Audit UI support for Express, Fastify, and Koa
-   [x] Remote logging transport
-   [x] More configuration options: log rotation
-   [ ] Sequelize support (planned)

---

## 📋 Changelog

See the [CHANGELOG.md](./CHANGELOG.md) for full release notes.

---

## 📤 RemoteLogging

See the [REMOTE_LOGGING.md](./REMOTE_LOGGING.md) for more information

---

## 🪵 More On Log Rotation

See the [LOG_RETENTION.md](./LOG_RETENTION.md.md) for more information

---

## 📜 License

MIT

---

## 🙌 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for more info.
