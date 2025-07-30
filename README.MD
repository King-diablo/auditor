

# 🛡️ Auditor

this is a lightweight, type-safe, and framework-agnostic backend auditing system for Node.js — not just another logger.

It enables structured auditing of:
- Request and response activity
- Application-level events (e.g. user logins, deletions)
- Errors and exceptions
- Database operations with Mongoose and Prisma
- Optional remote logging via [BetterStack](https://betterstack.com)
- Optional UI dashboard for inspecting audit logs

Auditor helps provide observability, traceability, and accountability for your backend services.


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

> **Note:** After creating an `Auditor` instance, you **must** call `.Setup()` before using any middleware or logging features.

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
fastify.setErrorHandler(audit.ErrorLogger());
```

### Koa

```ts
import { Auditor } from '@kingdiablo/auditor';
import Koa from 'koa';

const audit = new Auditor({ framework: 'koa' });
await audit.Setup();
const app = new Koa();
app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());
```

---

## 🖥️ Using the Audit UI (Express, Fastify, and Koa)

Auditor provides an optional self-hosted UI to view and explore audit logs. To enable it, set `useUI: true`. Dependencies are downloaded at runtime — no CDN used.

### Express UI Setup

```ts
const audit = new Auditor({ framework: 'express', useUI: true });
await audit.Setup();

if (audit.CreateUI) {
	const auditUI = await audit.CreateUI();
	app.use(auditUI);
}
```

### Fastify UI Setup

```ts
const audit = new Auditor({ framework: 'fastify', useUI: true });
await audit.Setup();

const auditUI = await audit.CreateUI();
fastify.register(auditUI);

fastify.listen(3000, () => {
	console.log('Server running on http://localhost:3000');
});
```

### Koa UI Setup

```ts
const audit = new Auditor({ framework: 'koa', useUI: true });
await audit.Setup();

const auditUI = await audit.CreateUI();
app.use(auditUI);

app.listen(3000, () => {
	console.log('Server running on http://localhost:3000');
});
```

The UI will be available at `/audit-ui` and logs can be fetched from `/audit-log`.

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
	destinations: ['console', 'file', 'remote'],
	dbType: 'mongoose',
	useTimeStamp: true,
	splitFiles: true,
	framework: 'fastify',
	useUI: true,
	remote: {
		provider: 'betterstack',
		apiKey: process.env.BETTERSTACK_API_KEY,
		sourceId: process.env.BETTERSTACK_SOURCE_ID
	}
});
await audit.Setup();
```

---

## 🚀 Features

* Multi-framework support
* Request/error middleware
* File-based JSON logging
* Remote logging via BetterStack
* Database audit logging (Mongoose + Prisma)
* Manual structured business event logging
* Split file logging per log type
* Pluggable logger support (Winston, Pino, Console)
* Optional system error capture
* Optional UI dashboard

---

## ⚙ Configuration Options

| Option                | Type      | Default       | Description                                       |
| --------------------- | --------- | ------------- | ------------------------------------------------- |
| `logger`              | any       | `console`     | Custom logger instance (Winston, Pino, etc)       |
| `destinations`        | string\[] | `['console']` | Where to write logs (`console`, `file`, `remote`) |
| `dbType`              | string    | `'none'`      | `'mongoose'` or `'prisma'`                        |
| `useTimeStamp`        | boolean   | `true`        | Adds timestamps to logs                           |
| `splitFiles`          | boolean   | `false`       | Split logs into separate files                    |
| `framework`           | string    | `'express'`   | `'express'`, `'fastify'`, `'koa'`                 |
| `captureSystemErrors` | boolean   | `false`       | Capture uncaught exceptions/signals               |
| `useUI`               | boolean   | `false`       | Serve the frontend dashboard                      |
| `remote`              | object    | `undefined`   | Configuration for BetterStack                     |

---

## 🪵 Business Event Logging (`Log`)

Use `Log` to track user actions and meaningful server events.

> ⚠️ Auditor cannot automatically track user-level actions — you must log them explicitly.

```ts
audit.Log({
	type: 'auth',
	action: 'login',
	status: 'success',
	actor: 'admin',
	message: 'User logged in successfully.',
	meta: { userId: 'abc123' }
});
```

Custom types/actions are supported:

```ts
audit.Log({
	type: 'custom_event',
	action: 'something_happened',
	status: 'info',
	message: 'A custom event occurred.'
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
	// schema fields...
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

* [x] Core audit logger class
* [x] Request and error middleware (Express, Fastify, Koa)
* [x] File-based JSON logging
* [x] Database audit logging for Mongoose and Prisma
* [x] UI support (Express, Fastify, Koa)
* [x] Remote logging via BetterStack
* [x] Log retention and file rotation
* [ ] Sequelize support (planned)

---

## 📋 Changelog

See the [CHANGELOG.md](./CHANGELOG.md) for full release notes.

---

## 📤 Remote Logging

See the [REMOTE\_LOGGING.md](./REMOTE_LOGGING.md) for setup and usage.

---

## 🪵 Log Retention / Rotation

See the [LOG\_RETENTION.md](./LOG_RETENTION.md) for more information.

---

## 📜 License

MIT

---

## 🙌 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.