# 🛡️ Node Audit Logger

A flexible, plug-and-play auditing and logging library for Node.js applications. Supports request logging, error tracking, database audit trails, and custom business event logging — all configurable and extendable with your preferred logger (e.g., Winston, Pino) and database ORM (e.g., Mongoose, Prisma, Sequelize).

---

## 🚀 IncomingFeatures

-   ✅ Request & error middleware for Express
-   ✅ Database change tracking (create, update, delete)
-   ✅ Custom business event logging (e.g., user login, logout)
-   ✅ Pluggable logging backends (Console, Winston, Pino, etc.)
-   ✅ Configurable log destinations (file, console, remote, etc.)
-   ✅ Type-safe with IntelliSense support
-   ✅ Defaults and suggestions for common audit actions and types

---

## 📦 Installation

```bash
npm install auditor
```

You'll also need one of the supported ORMs and optionally a logger installed in your project:

```bash
# Example for Mongoose + Winston
npm install mongoose winston
```

---

## 🔗 Peer Dependencies

This package supports and relies on peer dependencies for:

-   Mongoose (`mongoose`)
-   Prisma (`@prisma/client`)
-   Sequelize (`sequelize`)
-   Your logger of choice (`winston`, `pino`, etc.)

> These must be installed manually by your project. The audit logger will detect and use only the ones you have installed.

---

## 📐 Basic Usage

```ts
import { AuditLogger } from 'node-audit-logger';
import express from 'express';
import mongoose from 'mongoose';
import winston from 'winston';

const logger = winston.createLogger({
	transports: [new winston.transports.Console()],
});

const audit = new AuditLogger({
	logger,
	destinations: ['console'], // or ['file', 'remote']
	dbType: 'mongoose',
});

const app = express();

app.use(audit.getRequestLogger());
app.use(audit.getErrorLogger());

// Custom business audit log
audit.log({
	type: 'auth',
	action: 'login',
	message: 'User 123 attempted to log in',
});
```

---

## 🔍 Database Integration (e.g., Mongoose) (Coming Soon)

```ts
import userSchema from './models/user';

audit.registerMongooseHooks(userSchema);
```

This will automatically hook into `save`, `updateOne`, and `deleteOne` actions on the schema and log:

```json
{
  "type": "db",
  "action": "update",
  "message": "User document updated",
  "meta": {
    "collection": "users",
    "before": { ... },
    "after": { ... }
  }
}
```

---

## 🔧 Configuration Options

| Option         | Type      | Description                                            |
| -------------- | --------- | ------------------------------------------------------ |
| `logger`       | any       | Your custom logger instance (Winston, Pino, etc)       |
| `destinations` | string\[] | Where to send logs (`console`, `file`, `remote`)       |
| `dbType`       | string    | Supported DBs: `'mongoose'`, `'prisma'`, `'sequelize'` |

---

## 🪵 Custom Business Event Logging

The audit logger supports business-specific events like logins, payments, notifications, etc.

```ts
audit.log({
	type: 'billing',
	action: 'invoice_created',
	message: 'Invoice #456 created for user 789',
});
```

> You'll get IntelliSense suggestions for common types (`auth`, `billing`, `user`, etc.) and actions (`login`, `register`, `logout`, etc.).

You can override or extend with your own types and actions.

---

## ⚠️ Error Logger Middleware

Captures errors thrown during request handling and logs useful context:

```ts
app.use(audit.getErrorLogger());
```

Logs include:

-   HTTP method and path
-   Error message and stack
-   Status code

---

## 🔄 Request Logger Middleware

Tracks every incoming request, logging:

-   HTTP method
-   URL
-   Timestamp
-   Optional user info
-   Response time

Usage:

```ts
app.use(audit.getRequestLogger());
```

---

## 💡 Advanced: Custom Logger & Destination

You can plug in your own logging logic:

```ts
const audit = new AuditLogger({
	logger: myCustomLoggerInstance,
	destinations: ['console', 'remote'],
	dbType: 'prisma',
});
```

---

## 📁 Suggested Folder Structure (for this package)

```
node-audit-logger/
├── src/
│   ├── core/
│   │   ├── AuditLogger.ts
│   │   ├── types.ts
│   │   ├── defaults.ts
│   ├── middleware/
│   │   ├── errorLogger.ts
│   │   ├── requestLogger.ts
│   ├── integrations/
│   │   ├── mongooseHooks.ts
│   │   ├── prismaHooks.ts
│   │   ├── sequelizeHooks.ts
│   ├── index.ts
├── package.json
├── README.md
├── tsconfig.json
```

---

## 🧭 Development Roadmap

1. ✅ Core audit logger class
2. ⏳ Request and error middleware
3. ⏳ Mongoose DB integration
4. ⏳ Prisma and Sequelize support
5. ⏳ Allow custom logger injection
6. ⏳ Defaults with IntelliSense for common actions/types
7. ⏳ Remote logging transport support (e.g., Logtail, Datadog)
8. ⏳ File-based JSON logging
9. ⏳ CLI-based audit log viewer

---

## 📜 License

MIT

---

## 🙌 Contribute

PRs and feature requests are welcome!

```bash
git clone https://github.com/kingdiablo/auditor
cd auditor
npm install
npm run dev
```

Let’s build a better audit ecosystem for Node.js developers! 🧠

```

```
