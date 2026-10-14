import { Injectable, Module, type OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DataSource } from "typeorm";
import { safeCall } from "../core/result/result.js";
import { sastDateTime } from "../core/time/sast.js";

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
 * One-off, idempotent: rewrite legacy UTC wall-clock datetimes (written by the
 * sqlite driver before columns became SAST text) as SAST ISO strings so the
 * whole database uses a single, sortable convention.
 */
@Injectable()
class SastBackfill implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const meta of this.dataSource.entityMetadatas) {
      for (const column of meta.columns) {
        if (column.transformer !== sastDateTime) {
          continue;
        }
        const table = `"${meta.tableName}"`;
        const col = `"${column.databaseName}"`;
        await this.dataSource.query(
          `UPDATE ${table} SET ${col} = strftime('%Y-%m-%dT%H:%M:%f', ${col}, '+2 hours') || '+02:00' ` +
            `WHERE ${col} IS NOT NULL AND ${col} NOT LIKE '%+02:00' ` +
            `AND strftime('%Y-%m-%dT%H:%M:%f', ${col}) IS NOT NULL`,
        );
      }
    }
  }
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
  providers: [SastBackfill],
})
export class DatabaseModule {}
