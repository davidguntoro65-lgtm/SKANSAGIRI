// cPanel / Phusion Passenger entry point
// Application Startup File: app.js
"use strict";

// Force BASE_PATH to /id so Express serves assets at the right prefix.
// This must be set BEFORE requiring dist/server.cjs.
if (!process.env.BASE_PATH) {
  process.env.BASE_PATH = "/id";
}

// Force production mode so Vite dev-server is never started on cPanel.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

require("./dist/server.cjs");
