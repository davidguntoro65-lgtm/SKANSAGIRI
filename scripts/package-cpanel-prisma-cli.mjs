import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(path.join(projectRoot, "package-lock.json"), "utf8"));
const prismaVersion = lock.packages?.["node_modules/prisma"]?.version;
if (!prismaVersion) {
  throw new Error("package-lock.json does not contain the pinned Prisma CLI version.");
}

// cPanel uses RHEL-family hosts; Debian is included to validate the bundle on
// the Replit build machine. The CLI needs schema-engine, not the query engine.
const binaryTargets = [
  "debian-openssl-3.0.x",
  "rhel-openssl-1.0.x",
  "rhel-openssl-3.0.x",
];
const artifact = path.join(projectRoot, "dist", "prisma-cli-cpanel.tar.gz");
const stagingDir = mkdtempSync(path.join(os.tmpdir(), "smkn-prisma-cli-"));
const temporaryArchive = path.join(os.tmpdir(), `smkn-prisma-cli-${process.pid}.tar.gz`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
  }
}

try {
  rmSync(artifact, { force: true });
  rmSync(temporaryArchive, { force: true });
  mkdirSync(path.join(projectRoot, "dist"), { recursive: true });

  writeFileSync(
    path.join(stagingDir, "package.json"),
    `${JSON.stringify(
      {
        name: "smkn-wonogiri-cpanel-prisma-cli",
        version: "1.0.0",
        private: true,
        dependencies: { prisma: prismaVersion },
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Packaging Prisma CLI ${prismaVersion} with engines for ${binaryTargets.join(", ")}...`,
  );
  run(
    "npm",
    ["install", "--no-audit", "--no-fund", "--package-lock=true", "--omit=dev"],
    {
      cwd: stagingDir,
      timeout: 300_000,
      env: {
        ...process.env,
        PRISMA_CLI_BINARY_TARGETS: binaryTargets.join(","),
      },
    },
  );

  const packageRoot = path.join(stagingDir, "node_modules");
  const cliPath = path.join(packageRoot, "prisma", "build", "index.js");
  if (!existsSync(cliPath)) {
    throw new Error("The packaged Prisma CLI entry point is missing.");
  }

  for (const target of binaryTargets) {
    const enginePath = path.join(
      packageRoot,
      "@prisma",
      "engines",
      `schema-engine-${target}`,
    );
    if (!existsSync(enginePath) || statSync(enginePath).size < 1) {
      throw new Error(`Prisma schema engine for ${target} was not downloaded.`);
    }
  }

  run(process.execPath, [cliPath, "--version"], {
    cwd: projectRoot,
    timeout: 30_000,
    env: {
      ...process.env,
      PRISMA_CLI_BINARY_TARGETS: binaryTargets.join(","),
    },
  });

  run("tar", [
    "-czf",
    temporaryArchive,
    "-C",
    stagingDir,
    "package.json",
    "package-lock.json",
    "node_modules",
  ]);
  run("tar", ["-tzf", temporaryArchive], { stdio: "ignore" });

  const archiveBytes = statSync(temporaryArchive).size;
  if (archiveBytes >= 95 * 1024 * 1024) {
    throw new Error(
      `Prisma CLI archive is ${Math.ceil(archiveBytes / 1024 / 1024)} MiB; refusing an artifact near GitHub's per-file size limit.`,
    );
  }

  renameSync(temporaryArchive, artifact);
  console.log(
    `Created dist/prisma-cli-cpanel.tar.gz (${Math.ceil(archiveBytes / 1024 / 1024)} MiB).`,
  );
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
  rmSync(temporaryArchive, { force: true });
}
