

# 🛡️ Auditor

A lightweight and customizable audit logger for Node.js applications. Auditor provides request and error logging middleware for Express, type-safe business event logging, flexible log destinations (console, file, remote), and **automatic database audit logging for Mongoose (MongoDB)**. Easily integrate with your preferred logger (e.g., Winston, Pino) and database ORM (e.g., Mongoose).

---

## 🚨 What's New in 0.2.0

- **Mongoose (MongoDB) support:** Automatic audit logging for create, update, delete, and find operations on your Mongoose models.
- **User utilities:** Easily capture userId, endpoint, and IP for every log entry.
- **Split file logging:** Log requests, errors, DB actions, and business events to separate files with `splitFiles: true`.
- **Improved configuration:** More flexible options for file logging and log destinations.

---


## 📦 Installation

```bash
npm install @kingdiablo/auditor
```

You'll also need your preferred logger and optionally an ORM:

```bash
npm install winston mongoose
```

---


## 📐 Basic Usage


```ts
import { Auditor } from '@kingdiablo/auditor';
import express from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});


const audit = new Auditor({
  logger,
  destinations: ['console', 'file'],
  dbType: 'mongoose', // Enables MongoDB audit logging
});

const app = express();

app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());


// Custom business event log
audit.Log({
  type: 'auth',
  action: 'login',
  message: 'User 123 attempted to log in',
});

// ---

// Database audit logging for Mongoose
import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({ name: String });
audit.AuditModel(userSchema); // Adds audit hooks to the schema
const User = mongoose.model('User', userSchema);

// Now, all create, update, delete, and find operations on User will be logged automatically!
```

---




## 📄 Configuring File Logging (SetFileConfig)

To customize the file logging location or filename, use the `SetFileConfig` method after creating your Auditor instance. This is useful if you want to store logs in a specific folder or use a custom log file name.

**Requirements:**
- The `file` destination must be enabled in your Auditor config.
- `SetFileConfig` will not work if `splitFiles` is set to `true`.



```ts
const audit = new Auditor({
  destinations: ['file'],
});

// Configure file logging location and filename
// This will store logs in './logs/my-audit.log'
audit.SetFileConfig({
  folderName: 'logs',
  fileName: 'my-audit', // Do not include .log extension; it will be added automatically
});
```

- `folderName`: The folder where logs will be stored (default: `audit`)
- `fileName`: The name of the log file (default: `audit`)

If you do not call `SetFileConfig`, logs will be written to `./audit/audit.log` by default.

---


## 🛠️ Simple Auditor Configuration

You can create an Auditor instance with zero configuration for quick prototyping or testing:

```ts
import { Auditor } from '@kingdiablo/auditor';

const audit = new Auditor();
```

This will use the default logger (`console`), log to the console, and use default settings.


You can also pass options to customize the logger, destinations, database type, timestamp usage, and **split file logging**:

```ts
const audit = new Auditor({
  destinations: ['console', 'file'],
  splitFiles: true, // Logs to error.log, request.log, db.log, and action.log in the 'audits' folder
});
```

```ts
const audit = new Auditor({
  logger: myLogger, // e.g., Winston or Pino instance
  destinations: ['console', 'file'],
  dbType: 'mongoose',
  useTimeStamp: true, // optional, default is true
});
```

---


## 🚀 Features

- **Automatic MongoDB audit logging** (Mongoose): Track create, update, delete, and find operations on your models.
- **User context utilities:** Capture userId, endpoint, and IP for every log entry.
- **Split file logging:** Separate logs for errors, requests, DB actions, and business events.

- Request & error middleware for Express
- Type-safe business event logging with IntelliSense
- Pluggable logging backends (Console, Winston, Pino, etc.)
- Configurable log destinations: console, file, remote
- Defaults and suggestions for common audit actions and types

---




## ⚙ Configuration Options

| Option         | Type      | Description                                            |
| -------------- | --------- | ------------------------------------------------------ |
| `logger`       | any       | Your custom logger instance (Winston, Pino, etc)       |
| `destinations` | string[]  | Where to send logs (`console`, `file`, `remote`)       |
| `dbType`       | string    | Supported DBs: `'mongoose'`                            |
| `useTimeStamp` | boolean   | Include timestamp in logs (default: `true`)            |
| `splitFiles`   | boolean   | Log to separate files for errors, requests, db, actions|

**Split file logging:**
- When `splitFiles: true`, logs are written to `audits/error.log`, `audits/request.log`, `audits/db.log`, and `audits/action.log`.
- Otherwise, all logs go to a single file (default: `audit/audit.log`).


---



## 🪵 Business Event Logging (`Log`)

The `Log` method allows you to record business events, security actions, or any custom audit event in a type-safe way. It provides rich IntelliSense for both event types and actions, making it easy to standardize your audit logs and avoid typos.

**What `Log` can do:**
- Log authentication events (login, logout, failed login, etc.)
- Track billing and payment events (payment_success, payment_failed, invoice_created, etc.)
- Record system-level actions (startup, shutdown, config_change, etc.)
- Log errors, warnings, and custom business events
- Attach additional metadata to any log entry

**IntelliSense Provided:**
- **Types:** `auth`, `billing`, `system`, `error`, and you can add your own (e.g., `user`, `notification`, etc.)
- **Actions:** For each type, common actions are suggested (e.g., `login`, `logout`, `register` for `auth`; `payment_success`, `payment_failed` for `billing`).
- **Fields:** `type`, `action`, `message`, 
**Example:**

Example:

audit.Log({
  type: 'auth', // IntelliSense: 'auth', 'billing', 'system', 'error', ...
  action: 'login', // IntelliSense: 'login', 'logout', 'register', ...
  message: 'User logged in successfully.' // IntelliSense: User logged in successfully.
});

You can extend the available types and actions to fit your business needs, and TypeScript will provide suggestions and catch typos.

---


## ⚠️ Error Logger Middleware (`ErrorLogger`)


The `ErrorLogger` middleware automatically captures and logs errors that occur during request handling in your Express app.

> **Notice:**
> - When the destination is set to `remote`, the error logger will send the **full stack trace** of the error.
> - For `file` and `console` destinations, only the file that caused the error (not the full stack trace) will be shown in the log entry. This helps keep local and console logs concise while providing full details to remote log aggregators.

**What it can do:**
- Logs HTTP method, request path, error message, stack trace, status code, and user info (if available)
- Ensures all errors are consistently recorded for auditing and debugging
- Integrates with your logger and destinations (console, file, remote, etc.)

**IntelliSense Provided:**
- Middleware signature is type-safe for Express
- Error log entries include all relevant fields with suggestions for structure

**Usage:**
```ts
app.use(audit.ErrorLogger());
```

**How to include userId in error logs:**

If you want the error logger to include a userId, make sure your Express `req` object has a `user` property (or similar) with an `id` field. For example, if you use authentication middleware like Passport.js:

Example: Attach user info to req in your auth middleware

app.use((req, res, next) => {
  // ...after authentication
  req.user = { id: 'user-123', name: 'Alice' };
  next();
});

The error logger will automatically pick up `req.user.id` if available and include it in the log entry. You can customize the property name if your user id is stored elsewhere (e.g., `req.currentUser.id`).

---


## 🔄 Request Logger Middleware (`RequestLogger`)

The `RequestLogger` middleware tracks every incoming HTTP request and logs useful details for auditing and performance monitoring.

**What it can do:**
- Logs HTTP method, URL, timestamp, user info (if available), and response time
- Helps trace user activity and measure API performance
- Integrates with your logger and destinations

**IntelliSense Provided:**
- Middleware signature is type-safe for Express
- Log entry structure is suggested for consistency

**Usage:**
```ts
app.use(audit.RequestLogger());
```

**How to include userId in request logs:**

To log the userId with each request, ensure your authentication middleware attaches the user object to the request (e.g., `req.user.id`).

Example: Attach user info to req in your auth middleware

app.use((req, res, next) => {
  // ...after authentication
  req.user = { id: 'user-123', name: 'Alice' };
  next();
});

The request logger will then include the userId in the log entry if present. Adjust the property as needed for your app (e.g., `req.currentUser.id`).

---


---



## 🧭 Roadmap & Planned Features

- [x] Core audit logger class
- [x] Request and error middleware
- [x] File-based JSON logging
- [x] **Database audit** — log database operations such as create, update, delete, and find for Mongoose (MongoDB). Prisma and Sequelize support planned.
    - Supported: Mongoose (MongoDB)
    - Planned: Prisma (PostgreSQL, MySQL, SQLite, SQL Server, MongoDB), Sequelize (PostgreSQL, MySQL, MariaDB, SQLite, SQL Server)
- [ ] **Remote logging transport** — send audit logs to remote destinations (e.g., log aggregators, cloud storage)
- [ ] More configuration options: log rotation, custom transports

---

## 📋 Changelog

See the [CHANGELOG.md](./CHANGELOG.md) for a detailed list of releases, new features, bug fixes, and planned improvements.

---

## 📜 License

MIT

---

## 🙌 Contributing

PRs and feature requests are welcome!

git clone https://github.com/kingdiablo/auditor
cd auditor
npm install
npm run dev
