#!/usr/bin/env node
/**
 * Ready the clinic monitor API environment: install, env, data dir, broker check.
 * It never starts the server — launch it yourself afterwards:
 *
 *   pnpm bootstrap         # ...then `pnpm dev`
 *   pnpm bootstrap:prod    # ...builds too, then `pnpm start:prod`
 *
 * Environment wins over server/.env; see .env.example for every variable.
 * Runs on plain Node 24+ (native type stripping, no ts-node/tsx needed).
 */
import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(SERVER_DIR);

function need(tool: string): void {
  try {
    execSync(`command -v ${tool}`, { stdio: "ignore" });
  } catch {
    console.error(`Missing required tool: ${tool}`);
    process.exit(1);
  }
}

function run(cmd: string, args: string[], cwd: string): void {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Ensure KEY has a non-empty value in server/.env (uncomment or append). */
function ensureKv(envPath: string, key: string, value: string): void {
  const text = readFileSync(envPath, "utf8");
  if (new RegExp(`^${key}=.+`, "m").test(text)) return;
  const commented = new RegExp(`^# *${key}=.*$`, "m");
  if (commented.test(text)) {
    writeFileSync(envPath, text.replace(commented, `${key}=${value}`));
  } else {
    appendFileSync(envPath, `${key}=${value}\n`);
  }
  console.log(`    set ${key}`);
}

function brokerUp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log("  pnpm bootstrap         # ready env, then `pnpm dev`");
    console.log("  pnpm bootstrap:prod    # ready env + build, then `pnpm start:prod`");
    return;
  }
  const prod = args.includes("--prod");

  for (const tool of ["node", "pnpm"]) need(tool);

  console.log("==> Installing workspace dependencies");
  run("pnpm", ["install", "--frozen-lockfile"], ROOT);

  console.log("==> Ensuring server/.env");
  process.chdir(SERVER_DIR);
  if (!existsSync(".env")) {
    execSync("cp .env.example .env");
    console.log("    created from .env.example");
  }
  ensureKv(".env", "JWT_SECRET", randomBytes(48).toString("base64url"));
  ensureKv(".env", "SEED_ADMIN_PASSWORD", "Admin123!");

  mkdirSync("data", { recursive: true });

  if (await brokerUp("localhost", 1883)) {
    console.log("    MQTT broker reachable on localhost:1883");
  } else {
    console.warn("WARNING: no MQTT broker on localhost:1883 — telemetry ingest will idle.");
    console.warn(`  Start one with: podman compose -f "${ROOT}/compose.yaml" up -d mosquitto`);
  }

  if (prod) {
    console.log("==> Building (nest build)");
    run("pnpm", ["--filter", "server", "build"], ROOT);
  }

  console.log("Environment ready — start the server with:");
  console.log(prod ? "  pnpm start:prod" : "  pnpm dev");
}

await main();
