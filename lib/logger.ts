// lib/logger.ts
// Tiny level-based logger used in server code. Keeps messages out of the
// browser console in production and gives us one place to swap in a real
// logger (pino/winston) later.

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function format(level: LogLevel, scope: string, message: string): string {
  return `[${level.toUpperCase()}] [${scope}] ${message}`;
}

export interface Logger {
  debug: (message: string, meta?: unknown) => void;
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, meta) => {
      if (shouldLog("debug")) console.debug(format("debug", scope, message), meta ?? "");
    },
    info: (message, meta) => {
      if (shouldLog("info")) console.info(format("info", scope, message), meta ?? "");
    },
    warn: (message, meta) => {
      if (shouldLog("warn")) console.warn(format("warn", scope, message), meta ?? "");
    },
    error: (message, meta) => {
      if (shouldLog("error")) console.error(format("error", scope, message), meta ?? "");
    },
  };
}
