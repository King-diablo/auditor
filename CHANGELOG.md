# 📋 Changelog

All notable changes to this project will be documented in this file.

## Table of Contents

-   [Unreleased](#unreleased)
-   [auditor 0.3.1](#auditor-031---2025-07-10)
-   [auditor 0.3.0](#auditor-030---2025-07-08)
-   [auditor 0.2.0](#auditor-020---2025-07-05)
-   [auditor 0.1.1](#auditor-011---2025-07-02)
-   [auditor 0.1.0](#auditor-010---2025-06-30)

---

## \[Unreleased]

### Planned

-   Remote logging transport (send audit logs to external destinations)
-   Database audit logging support for Prisma and Sequelize
-   Log rotation and custom transport configuration
-   Prisma support added (coming soon)

---

## auditor 0.3.1 - 2025-07-10 \[[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.3.1)]

### Added

-   Audit dashboard UI now supports **Express**, **Fastify**, and **Koa**.
-   Automatic UI dependency installation at runtime (`chart.js`, `html2canvas`, etc.).
-   UI setup instructions included in the README.

### Changed

-   Updated README with UI usage examples and roadmap entries.
-   Refined and styled the UI components (toggle, filters, pagination, responsive charting).

### Notes

-   UI is **optional** and only installed when explicitly enabled.
-   UI files will **not be bundled** in future versions—ensuring lean builds by default.

---

## auditor 0.3.0 - 2025-07-08 \[[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.3.0)]

### Added

-   **Multi-framework support:** Auditor now supports **Express**, **Fastify**, and **Koa** with type-safe middleware and logger selection.
-   **TypeScript generics:** `TAuditOptions` and `Audit` class now use generics for framework type safety.
-   **Logger selection:** `RequestLogger` and `ErrorLogger` auto-select the correct middleware for the chosen framework.
-   **Improved usage examples:** See README for updated examples for each framework.
-   **Bug fixes and code quality:** Improved null checks, error handling, and code comments.

### Usage

**Express:**

```ts
import { Auditor } from '@kingdiablo/auditor';
import express from 'express';
const audit = new Auditor({ framework: 'express' });
audit.Setup();
const app = express();
app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());
```

**Fastify:**

```ts
import { Auditor } from '@kingdiablo/auditor';
import Fastify from 'fastify';
const audit = new Auditor({ framework: 'fastify' });
audit.Setup();
const fastify = Fastify();
fastify.addHook('onRequest', audit.RequestLogger().onRequest);
fastify.addHook('onResponse', audit.RequestLogger().onResponse);
fastify.setErrorHandler(audit.ErrorLogger());
```

**Koa:**

```ts
import { Auditor } from '@kingdiablo/auditor';
import Koa from 'koa';
const audit = new Auditor({ framework: 'koa' });
audit.Setup();
const app = new Koa();
app.use(audit.RequestLogger());
app.use(audit.ErrorLogger());
```

---

## auditor 0.2.0 - 2025-07-05 \[[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.2.0)]

### Added

-   **Mongoose (MongoDB) support:** Audit logging for MongoDB operations using Mongoose.
-   **Enhanced logging functionality:** Improvements to request and error logging, including better user context and stack traces.
-   **User utilities:** Added helpers for extracting and handling user information in logs.

### Changed

-   Updated `Auditor.ts` core logic for extensibility and MongoDB integration.
-   Refactored middleware and helper utilities for improved maintainability.

### Fixed

-   Various bug fixes and improvements across middleware and database modules.

---

## auditor 0.1.1 - 2025-07-02 \[[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.1.1)]

### Added

-   `SetFileConfig()` method to customize log file location and filename.
-   Zero-config instantiation: You can now use `new Auditor()` with all defaults.
-   `userId` support: Request and error loggers now include `userId` if present on the request object.
-   **Business event logging:** Type-safe logging with IntelliSense for event types and actions.
-   **Database audit roadmap:** Announced future support for Prisma and Sequelize.

### Changed

-   Updated package name and imports to use `@kingdiablo/auditor`.
-   Added documentation to all exposed methods for better developer experience.

### Fixed

-   Various bugs related to file logging and default logger usage.

---

## auditor 0.1.0 - 2025-06-30 \[[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.1.0)]

### Added

-   Initial core audit logger implementation.
-   Request and error middleware for Express.
-   File-based JSON logging system.
-   Console and file destinations.
-   Timestamp support in logs.

---
