// cPanel / Phusion Passenger entry point
// NOTE: package.json has "type":"module" so this file runs as ES module.
import { createRequire } from "module";
import { appendFileSync, mkdirSync, existsSync, statSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR   = join(__dirname, "logs");
const LOG_FILE  = join(LOG_DIR,  "app.log");
const LOG_OLD   = join(LOG_DIR,  "app.log.1");
const MAX_BYTES = 512 * 1024; // rotate at 512 KB

function writeLog(level, message) {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  // Echo to stdout/stderr — Passenger captures these in its own error log too
  (level === "ERROR" ? process.stderr : process.stdout).write(line);
  // Write to our own file for easy viewing via cPanel File Manager or /api/logs
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    // Simple rotation: rename when > MAX_BYTES
    if (existsSync(LOG_FILE) && statSync(LOG_FILE).size > MAX_BYTES) {
      if (existsSync(LOG_OLD)) {
        try { renameSync(LOG_OLD, join(LOG_DIR, "app.log.2")); } catch {}
      }
      renameSync(LOG_FILE, LOG_OLD);
    }
    appendFileSync(LOG_FILE, line, "utf-8");
  } catch (e) {
    process.stderr.write(`[LOG-WRITE-FAIL] ${e.message}\n`);
  }
}

// ─── Capture uncaught crashes BEFORE anything loads ──────────────────────────
process.on("uncaughtException", (err) => {
  writeLog("ERROR", `Uncaught exception: ${err.stack || err.message}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  writeLog("ERROR", `Unhandled rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
  process.exit(1);
});

// ─── Set env defaults BEFORE loading server bundle ───────────────────────────
if (!process.env.BASE_PATH)  process.env.BASE_PATH  = "/id";
if (!process.env.NODE_ENV)   process.env.NODE_ENV   = "production";

writeLog("INFO", `Starting — NODE_ENV=${process.env.NODE_ENV}  BASE_PATH=${process.env.BASE_PATH}  Node=${process.version}  PID=${process.pid}`);

// ─── Load server bundle ───────────────────────────────────────────────────────
try {
  const require = createRequire(import.meta.url);
  require("./dist/server.cjs");
  writeLog("INFO", "dist/server.cjs loaded — Express server starting");
} catch (err) {
  writeLog("ERROR", `Failed to load dist/server.cjs:\n${err.stack || err.message}`);
  process.exit(1);
}
