# Changelog

# Table of Contents

-   [Unreleased](#unreleased)
-   [auditor 0.1.1](#auditor-011---2025-07-02)
-   [auditor 0.1.0](#auditor-010---2025-06-30)

All notable changes and fixes to this project are documented in this file.

## [Unreleased]

### Planned

-   Support for MongoDB audit logging (database operations: create, update, delete, find)
-   Support for remote logging transport (send audit logs to remote destinations)
-   Support for database audit with Prisma and Sequelize
-   More configuration options: log rotation, custom transports

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
