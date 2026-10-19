import { randomUUID } from "crypto";
import os from "os";
import type { Request, RequestHandler, Response } from "express";
import type { Server as HttpServer } from "http";
import { monitorEventLoopDelay, performance } from "perf_hooks";
import { dbPool, dbPoolMax } from "./db";

type DiagnosticLevel = "INFO" | "WARN" | "ERROR";
type DiagnosticLogger = (level: DiagnosticLevel, message: string) => void;

type RouteMetrics = {
  requestsStarted: number;
  requestsCompleted: number;
  statusCodes: Record<string, number>;
  durationTotalMs: number;
  durationMaxMs: number;
  durationBuckets: number[];
  slowRequests: number;
  requestBytes: number;
};

type MetricsWindow = {
  started: number;
  completed: number;
  aborted: number;
  expressErrors: number;
  statusCodes: Record<string, number>;
  requestBytes: number;
  peakInFlight: number;
  routes: Map<string, RouteMetrics>;
  examples: Array<Record<string, string | number | null>>;
};

const REPORT_INTERVAL_MS = 10_000;
const SLOW_REQUEST_MS = 1_000;
const LATENCY_BUCKET_LIMITS = [50, 100, 250, 500, 1_000, 3_000];
const MAX_EXAMPLES_PER_WINDOW = 5;
const ERROR_REDACTION = /\b(password|token|secret|authorization)\b\s*[:=]\s*[^\s,;]+/gi;
const LONG_NUMBER = /\b\d{8,}\b/g;

function emptyWindow(currentInFlight: number): MetricsWindow {
  return {
    started: 0,
    completed: 0,
    aborted: 0,
    expressErrors: 0,
    statusCodes: {},
    requestBytes: 0,
    peakInFlight: currentInFlight,
    routes: new Map(),
    examples: [],
  };
}

function routeLabel(originalUrl: string) {
  const queryIndex = originalUrl.indexOf("?");
  const configuredBasePath = (process.env.BASE_PATH || "").replace(/\/$/, "");
  let pathname = queryIndex >= 0 ? originalUrl.slice(0, queryIndex) : originalUrl;
  if (configuredBasePath && (pathname === configuredBasePath || pathname.startsWith(`${configuredBasePath}/`))) {
    pathname = pathname.slice(configuredBasePath.length) || "/";
  }
  pathname = pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  if (pathname !== "/api/v1/pilketos" && !pathname.startsWith("/api/v1/pilketos/")) return null;

  return pathname
    .replace(/\/candidates\/[^/]+\/photo$/, "/candidates/:candidateId/photo")
    .replace(/\/admin\/elections\/[^/]+\/non-voters$/, "/admin/elections/:electionId/non-voters")
    .replace(/\/admin\/election\/[^/]+\/candidates$/, "/admin/election/:electionId/candidates")
    .replace(/\/admin\/candidates\/[^/]+$/, "/admin/candidates/:candidateId");
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return message.replace(ERROR_REDACTION, "$1=[redacted]").replace(LONG_NUMBER, "[redacted-number]").slice(0, 400);
}

function rounded(value: number, decimalPlaces = 1) {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function megabytes(bytes: number) {
  return rounded(bytes / (1024 * 1024));
}

function bucketIndex(durationMs: number) {
  const index = LATENCY_BUCKET_LIMITS.findIndex((limit) => durationMs <= limit);
  return index < 0 ? LATENCY_BUCKET_LIMITS.length : index;
}

function percentileEstimate(buckets: number[], total: number, percentile: number) {
  if (!total) return 0;
  const target = Math.ceil(total * percentile);
  let observed = 0;
  for (let index = 0; index < buckets.length; index += 1) {
    observed += buckets[index];
    if (observed >= target) {
      return index < LATENCY_BUCKET_LIMITS.length ? LATENCY_BUCKET_LIMITS[index] : "3000+";
    }
  }
  return "3000+";
}

function getRouteMetrics(window: MetricsWindow, route: string) {
  let metrics = window.routes.get(route);
  if (!metrics) {
    metrics = {
      requestsStarted: 0,
      requestsCompleted: 0,
      statusCodes: {},
      durationTotalMs: 0,
      durationMaxMs: 0,
      durationBuckets: Array(LATENCY_BUCKET_LIMITS.length + 1).fill(0),
      slowRequests: 0,
      requestBytes: 0,
    };
    window.routes.set(route, metrics);
  }
  return metrics;
}

export function createPilketosDiagnostics(log: DiagnosticLogger) {
  let inFlightRequests = 0;
  let openConnections = 0;
  let window = emptyWindow(0);
  let interval: NodeJS.Timeout | undefined;
  const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
  let previousCpuUsage = process.cpuUsage();
  let previousEventLoopUtilization = performance.eventLoopUtilization();
  let previousSnapshotAt = performance.now();

  const middleware: RequestHandler = (req, res, next) => {
    const route = routeLabel(req.originalUrl);
    if (!route) return next();

    const requestId = randomUUID();
    const requestStartedAt = process.hrtime.bigint();
    const requestBytes = Math.max(0, Number.parseInt(req.headers["content-length"] || "0", 10) || 0);
    let finalized = false;
    let responseFinished = false;

    res.locals.pilketosRequestId = requestId;
    res.locals.pilketosRoute = route;
    res.setHeader("X-Request-Id", requestId);

    inFlightRequests += 1;
    window.started += 1;
    window.requestBytes += requestBytes;
    window.peakInFlight = Math.max(window.peakInFlight, inFlightRequests);
    const routeMetrics = getRouteMetrics(window, route);
    routeMetrics.requestsStarted += 1;
    routeMetrics.requestBytes += requestBytes;

    const finalize = (aborted: boolean) => {
      if (finalized) return;
      finalized = true;
      inFlightRequests = Math.max(0, inFlightRequests - 1);
      const durationMs = Number(process.hrtime.bigint() - requestStartedAt) / 1_000_000;
      if (aborted) {
        window.aborted += 1;
      } else {
        const statusCode = String(res.statusCode);
        window.completed += 1;
        window.statusCodes[statusCode] = (window.statusCodes[statusCode] || 0) + 1;
        const completedRouteMetrics = getRouteMetrics(window, route);
        completedRouteMetrics.requestsCompleted += 1;
        completedRouteMetrics.statusCodes[statusCode] = (completedRouteMetrics.statusCodes[statusCode] || 0) + 1;
        completedRouteMetrics.durationTotalMs += durationMs;
        completedRouteMetrics.durationMaxMs = Math.max(completedRouteMetrics.durationMaxMs, durationMs);
        completedRouteMetrics.durationBuckets[bucketIndex(durationMs)] += 1;
        if (durationMs >= SLOW_REQUEST_MS) completedRouteMetrics.slowRequests += 1;
      }
      if ((aborted || res.statusCode >= 500 || durationMs >= SLOW_REQUEST_MS) && window.examples.length < MAX_EXAMPLES_PER_WINDOW) {
        window.examples.push({
          requestId,
          method: req.method,
          route,
          statusCode: aborted ? null : res.statusCode,
          durationMs: rounded(durationMs),
          outcome: aborted ? "client_disconnected" : res.statusCode >= 500 ? "server_error" : "slow_request",
        });
      }
    };

    res.once("finish", () => {
      responseFinished = true;
      finalize(false);
    });
    res.once("close", () => {
      if (!responseFinished) finalize(true);
    });
    return next();
  };

  function recordExpressError(req: Request, res: Response, error: unknown, statusCode: number) {
    const route = String(res.locals?.pilketosRoute || routeLabel(req.originalUrl) || "");
    if (!route) return false;

    window.expressErrors += 1;
    if (window.examples.length < MAX_EXAMPLES_PER_WINDOW) {
      const errorRecord = error as { name?: unknown; code?: unknown };
      window.examples.push({
        requestId: String(res.locals?.pilketosRequestId || ""),
        method: req.method,
        route,
        statusCode,
        errorName: typeof errorRecord?.name === "string" ? errorRecord.name : "Error",
        errorCode: typeof errorRecord?.code === "string" ? errorRecord.code : null,
        message: safeErrorMessage(error),
        outcome: "express_error",
      });
    }
    return true;
  }

  function attachHttpServer(server: HttpServer) {
    server.on("connection", (socket) => {
      openConnections += 1;
      socket.once("close", () => {
        openConnections = Math.max(0, openConnections - 1);
      });
    });
  }

  function start() {
    if (interval) return;
    eventLoopDelay.enable();
    previousCpuUsage = process.cpuUsage();
    previousEventLoopUtilization = performance.eventLoopUtilization();
    previousSnapshotAt = performance.now();
    interval = setInterval(() => {
      if (!window.started && !inFlightRequests && !window.aborted && !window.expressErrors) return;

      const now = performance.now();
      const elapsedMs = Math.max(1, now - previousSnapshotAt);
      const currentCpuUsage = process.cpuUsage();
      const cpuUserUs = currentCpuUsage.user - previousCpuUsage.user;
      const cpuSystemUs = currentCpuUsage.system - previousCpuUsage.system;
      const cpuPercent = ((cpuUserUs + cpuSystemUs) / (elapsedMs * 1_000)) * 100;
      const currentEventLoopUtilization = performance.eventLoopUtilization();
      const eventLoopUtilization = performance.eventLoopUtilization(previousEventLoopUtilization);
      const memory = process.memoryUsage();
      const pool = {
        total: dbPool.totalCount,
        idle: dbPool.idleCount,
        waiting: dbPool.waitingCount,
        max: dbPoolMax,
      };
      const routes = [...window.routes.entries()].map(([route, metrics]) => ({
        route,
        started: metrics.requestsStarted,
        completed: metrics.requestsCompleted,
        statusCodes: metrics.statusCodes,
        avgMs: metrics.requestsCompleted ? rounded(metrics.durationTotalMs / metrics.requestsCompleted) : null,
        p95MsApprox: percentileEstimate(metrics.durationBuckets, metrics.requestsCompleted, 0.95),
        maxMs: metrics.requestsCompleted ? rounded(metrics.durationMaxMs) : null,
        slowOver1s: metrics.slowRequests,
        requestBytes: metrics.requestBytes,
      }));
      const total5xx = Object.entries(window.statusCodes)
        .filter(([status]) => Number(status) >= 500)
        .reduce((sum, [, count]) => sum + count, 0);
      const eventLoopP99Ms = eventLoopDelay.percentile(99) / 1_000_000;
      const eventLoopMaxMs = eventLoopDelay.max / 1_000_000;
      const summary = {
        event: "pilketos_load_window",
        windowMs: Math.round(elapsedMs),
        pid: process.pid,
        uptimeSeconds: Math.round(process.uptime()),
        requests: {
          started: window.started,
          completed: window.completed,
          aborted: window.aborted,
          expressErrors: window.expressErrors,
          statusCodes: window.statusCodes,
          inFlightNow: inFlightRequests,
          peakInFlight: window.peakInFlight,
          openConnections,
          requestBytes: window.requestBytes,
        },
        databasePool: pool,
        process: {
          rssMB: megabytes(memory.rss),
          heapUsedMB: megabytes(memory.heapUsed),
          heapTotalMB: megabytes(memory.heapTotal),
          externalMB: megabytes(memory.external),
          cpuPercentOfOneCore: rounded(cpuPercent),
          eventLoopUtilization: rounded(eventLoopUtilization.utilization, 3),
          eventLoopP99Ms: rounded(eventLoopP99Ms),
          eventLoopMaxMs: rounded(eventLoopMaxMs),
        },
        host: {
          cpuCores: typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length,
          loadAverage: os.loadavg().map((value) => rounded(value, 2)),
        },
        routes,
        examples: window.examples,
      };
      const level: DiagnosticLevel = total5xx > 0
        ? "ERROR"
        : pool.waiting > 0 || eventLoopP99Ms > 100 || window.aborted > 0
          ? "WARN"
          : "INFO";
      log(level, JSON.stringify(summary));

      window = emptyWindow(inFlightRequests);
      previousCpuUsage = currentCpuUsage;
      previousEventLoopUtilization = currentEventLoopUtilization;
      previousSnapshotAt = now;
      eventLoopDelay.reset();
    }, REPORT_INTERVAL_MS);
    interval.unref();
  }

  return { middleware, recordExpressError, attachHttpServer, start };
}
