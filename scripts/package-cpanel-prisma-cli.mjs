import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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

// Include Debian only to validate `prisma --version` on the Replit build host;
// remove it before packaging. cPanel's OS release is unknown, so retain both
// RHEL OpenSSL generations. The migration CLI needs schema-engine only.
const buildTargets = [
  "debian-openssl-3.0.x",
  "rhel-openssl-1.0.x",
  "rhel-openssl-3.0.x",
];
const deploymentTargets = buildTargets.filter((target) => target.startsWith("rhel-"));
const artifact = path.join(projectRoot, "dist", "prisma-cli-cpanel.tar.gz");
const artifactPartPrefix = `${artifact}.part`;
const stagingDir = mkdtempSync(path.join(os.tmpdir(), "smkn-prisma-cli-"));
const temporaryArchive = path.join(
  projectRoot,
  "dist",
  `.prisma-cli-cpanel-${process.pid}.tmp.tar.gz`,
);
const temporaryPartPrefix = path.join(
  projectRoot,
  "dist",
  `.prisma-cli-cpanel-${process.pid}.part`,
);
const createdParts = [];
let packagingSucceeded = false;

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
  for (const entry of readdirSync(path.dirname(artifact))) {
    if (entry.startsWith(path.basename(artifactPartPrefix))) {
      rmSync(path.join(path.dirname(artifact), entry), { force: true });
    }
  }

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
    `Packaging Prisma CLI ${prismaVersion} with engines for ${deploymentTargets.join(", ")}...`,
  );
  run(
    "npm",
    ["install", "--no-audit", "--no-fund", "--package-lock=true", "--omit=dev"],
    {
      cwd: stagingDir,
      timeout: 300_000,
      env: {
        ...process.env,
        PRISMA_CLI_BINARY_TARGETS: buildTargets.join(","),
      },
    },
  );

  const packageRoot = path.join(stagingDir, "node_modules");
  const cliPath = path.join(packageRoot, "prisma", "build", "index.js");
  if (!existsSync(cliPath)) {
    throw new Error("The packaged Prisma CLI entry point is missing.");
  }
  const packagedVersion = JSON.parse(
    readFileSync(path.join(packageRoot, "prisma", "package.json"), "utf8"),
  ).version;
  if (packagedVersion !== prismaVersion) {
    throw new Error(
      `Packaged Prisma version ${packagedVersion} does not match lockfile ${prismaVersion}.`,
    );
  }

  for (const target of buildTargets) {
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
    cwd: stagingDir,
    timeout: 30_000,
    stdio: "ignore",
    env: {
      ...process.env,
      PRISMA_CLI_BINARY_TARGETS: buildTargets.join(","),
    },
  });

  // The Debian engine is only for the build-host version check; do not ship it.
  rmSync(
    path.join(packageRoot, "@prisma", "engines", "schema-engine-debian-openssl-3.0.x"),
  );

  // Check that the exact command used by cPanel is available in the reduced bundle.
  run(process.execPath, [cliPath, "migrate", "deploy", "--help"], {
    cwd: stagingDir,
    timeout: 30_000,
    stdio: "ignore",
    env: {
      ...process.env,
      PRISMA_CLI_BINARY_TARGETS: deploymentTargets.join(","),
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

  run("split", ["-b", "40M", "-d", "-a", "2", temporaryArchive, temporaryPartPrefix]);
  const temporaryParts = readdirSync(path.dirname(temporaryPartPrefix))
    .filter((entry) => entry.startsWith(path.basename(temporaryPartPrefix)))
    .sort();
  if (temporaryParts.length === 0) {
    throw new Error("The Prisma CLI archive was not split into Git-safe parts.");
  }

  let totalPartBytes = 0;
  for (const entry of temporaryParts) {
    const source = path.join(path.dirname(temporaryPartPrefix), entry);
    const suffix = entry.slice(path.basename(temporaryPartPrefix).length);
    const destination = `${artifactPartPrefix}${suffix}`;
    const partBytes = statSync(source).size;
    if (partBytes > 40 * 1024 * 1024) {
      throw new Error(`Prisma CLI part ${suffix} exceeds the 40 MiB Git-safe limit.`);
    }
    renameSync(source, destination);
    createdParts.push(destination);
    totalPartBytes += partBytes;
  }
  if (totalPartBytes !== archiveBytes) {
    throw new Error("The split Prisma CLI parts do not match the verified archive size.");
  }
  packagingSucceeded = true;
  console.log(
    `Created ${createdParts.length} Git-safe Prisma CLI parts (${Math.ceil(archiveBytes / 1024 / 1024)} MiB total).`,
  );
} finally {
  rmSync(stagingDir, { recursive: true, force: true });
  rmSync(temporaryArchive, { force: true });
  for (const entry of readdirSync(path.dirname(temporaryPartPrefix))) {
    if (entry.startsWith(path.basename(temporaryPartPrefix))) {
      rmSync(path.join(path.dirname(temporaryPartPrefix), entry), { force: true });
    }
  }
  if (!packagingSucceeded) {
    for (const part of createdParts) rmSync(part, { force: true });
  }
}
