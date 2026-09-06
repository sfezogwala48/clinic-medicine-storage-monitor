import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { safeCall } from "../core/result/result.js";

interface PragmaDb {
  pragma: (statement: string) => unknown;
}

/** Create the parent directory for file-backed sqlite databases. */
function ensureParentDir(database: string): void {
  if (database === ":memory:") {
    return;
  }
  safeCall(() => mkdirSync(dirname(resolve(database)), { recursive: true }));
}

/**
 * SQLite via better-sqlite3 (synchronous, zero-config, single file).
 *
 * Driven by env (see .env.example):
 * - DATABASE_PATH   file path, or ":memory:" for tests
 * - DB_SYNCHRONIZE  auto-sync schema in dev ("true"); use migrations in prod
 * - DB_LOGGING      SQL logging ("true" to enable)
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const database = config.get<string>("DATABASE_PATH", "./data/app.sqlite");
        ensureParentDir(database);
        return {
          type: "better-sqlite3",
          database,
          autoLoadEntities: true,
          synchronize: config.get<string>("DB_SYNCHRONIZE", "true") === "true",
          logging: config.get<string>("DB_LOGGING", "false") === "true",
          retryAttempts: 3,
          retryDelay: 1000,
          prepareDatabase: (db: PragmaDb): void => {
            db.pragma("journal_mode = WAL");
            db.pragma("foreign_keys = ON");
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
