const os = require("node:os");
const { spawn } = require("node:child_process");

const timeoutSeconds = Number(process.argv[2]);
const [command, ...args] = process.argv.slice(3);

if (!Number.isSafeInteger(timeoutSeconds) || timeoutSeconds < 1 || !command) {
  console.error("Usage: node run-with-timeout.cjs <seconds> <command> [args...]");
  process.exit(2);
}

const child = spawn(command, args, {
  detached: true,
  stdio: "inherit",
});

let timedOut = false;
let interruptedBy = null;
let settled = false;
let killTimer;

function signalChildGroup(signal) {
  if (!child.pid) return;

  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The process may have exited between the timeout and signal.
    }
  }
}

function finish(code) {
  if (settled) return;
  settled = true;
  clearTimeout(timeoutTimer);
  if (killTimer) clearTimeout(killTimer);
  process.exitCode = code;
}

const timeoutTimer = setTimeout(() => {
  timedOut = true;
  signalChildGroup("SIGTERM");
  killTimer = setTimeout(() => signalChildGroup("SIGKILL"), 10_000);
}, timeoutSeconds * 1_000);

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    interruptedBy = signal;
    signalChildGroup(signal);
  });
}

child.once("error", (error) => {
  console.error(`Failed to start ${command}: ${error.message}`);
  finish(127);
});

child.once("close", (code, signal) => {
  if (timedOut) {
    finish(124);
    return;
  }

  if (interruptedBy) {
    finish(128 + (os.constants.signals[interruptedBy] || 1));
    return;
  }

  if (signal) {
    finish(128 + (os.constants.signals[signal] || 1));
    return;
  }

  finish(code ?? 1);
});
