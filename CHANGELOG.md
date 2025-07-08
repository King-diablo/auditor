# Changelog



# Table of Contents

-   [Unreleased](#unreleased)
-   [auditor 0.3.0](#auditor-030---2025-07-08)
-   [auditor 0.2.0](#auditor-020---2025-07-05)
-   [auditor 0.1.1](#auditor-011---2025-07-02)
-   [auditor 0.1.0](#auditor-010---2025-06-30)

All notable changes and fixes to this project are documented in this file.



## [Unreleased]

### Planned

- Support for remote logging transport (send audit logs to remote destinations)
- Support for database audit with Prisma and Sequelize
- More configuration options: log rotation, custom transports
- **UI for audit viewing:** A new feature will allow displaying audits via a UI. Users who want to use this must set up their own server to host the UI.


## auditor 0.3.0 - 2025-07-08 [[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.3.0)]

### Added
- **Multi-framework support:** Auditor now supports Express, Fastify, and Koa with type-safe middleware and logger selection.
- **TypeScript generics:** `TAuditOptions` and `Audit` class now use generics for framework type safety.
- **Logger selection:** `RequestLogger` and `ErrorLogger` auto-select the correct middleware for the chosen framework.
extension for advanced use.
- **Improved usage:** See README for new usage examples for each supported framework.
- **Bug fixes and code quality:** Improved null checks, error handling, and code comments.

### Usage

- **Express:**
  ```ts
  import { Auditor } from '@kingdiablo/auditor';
  import express from 'express';
  const audit = new Auditor({ framework: 'express' });
  const app = express();
  app.use(audit.RequestLogger());
  app.use(audit.ErrorLogger());
  ```
- **Fastify:**
  ```ts
  import { Auditor } from '@kingdiablo/auditor';
  import Fastify from 'fastify';
  const audit = new Auditor({ framework: 'fastify' });
  const fastify = Fastify();
  fastify.addHook('onRequest', audit.RequestLogger().onRequest);
  fastify.addHook('onResponse', audit.RequestLogger().onResponse);
  // For error logging, use fastify.setErrorHandler(audit.ErrorLogger());
  ```
- **Koa:**
  ```ts
  import { Auditor } from '@kingdiablo/auditor';
  import Koa from 'koa';
  const audit = new Auditor({ framework: 'koa' });
  const app = new Koa();
  app.use(audit.RequestLogger());
  // For error logging, use app.use(audit.ErrorLogger());
  ```

---

## [Unreleased]

### Planned

- Support for remote logging transport (send audit logs to remote destinations)
- Support for database audit with Prisma and Sequelize
- More configuration options: log rotation, custom transports
- **UI for audit viewing:** A new feature will allow displaying audits via a UI. Users who want to use this must set up their own server to host the UI.


## auditor 0.2.0 - 2025-07-05 [[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.2.0)]

### Added

-   **Mongoose (MongoDB) support**: Audit logging for MongoDB operations using Mongoose.
-   **Enhanced logging functionality**: Improvements to request and error logging, including better user context and stack traces.
-   **User utilities**: Added helpers for extracting and handling user information in logs.

### Changed

-   Updated `Auditor.ts` core logic for extensibility and MongoDB integration.
-   Refactored middleware and helper utilities for improved maintainability.
-   Bumped package version to 0.2.0.

### Fixed

-   Various bug fixes and improvements across middleware and database modules.

## auditor 0.1.1 - 2025-07-02 [[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.1.1)]

### Added

-   **SetFileConfig method**: Configure log file location and name for file-based logging (only works if file logging is enabled and splitFiles is not set; replaces previous FileConfig method).
-   **Zero-config instantiation**: You can now use `new Auditor()` with all defaults.
-   **userId support**: Request and error loggers now include userId if present on the request object.
-   **Database audit roadmap**: Announced support for logging DB operations (create, update, delete, find) for Mongoose, Prisma, and Sequelize.
-   **Error logger stack trace**: (Planned) Full stack trace will be sent to remote destinations; only the file is shown for file/console.
-   **Business event logging**: Type-safe logging with IntelliSense for event types and actions.

### Fixed

-   Various bug fixes and improvements.

### Changed

-   **Imports and usage** updated to use `@kingdiablo/auditor` package name.
-   **Database audit** clarified to mean logging DB operations (not just integration).
-   Added documentation to all exposed methods for better developer experience.

---

## auditor 0.1.0 - 2025-06-30 [[GitHub Release](https://github.com/King-diablo/auditor/releases/tag/v0.1.0)]

### Added

-   **Initial core audit logger class** (logging, request and error middleware, file-based JSON logging).
