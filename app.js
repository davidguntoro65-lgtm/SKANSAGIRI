// cPanel / Phusion Passenger entry point
// NOTE: package.json has "type":"module" so this file runs as ES module.
//       We must use ESM syntax — require() is not available here.
import { createRequire } from "module";

// Force BASE_PATH to /id so Express serves assets at the right prefix.
// This must be set BEFORE loading dist/server.cjs.
if (!process.env.BASE_PATH) {
  process.env.BASE_PATH = "/id";
}

// Force production mode so Vite dev-server is never started on cPanel.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

// Use createRequire to load the CommonJS server bundle from an ES module context.
const require = createRequire(import.meta.url);
require("./dist/server.cjs");
