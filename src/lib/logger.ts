import { getEnv } from "../server/config/env";

type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): number {
  try {
    return ORDER[getEnv().LOG_LEVEL];
  } catch {
    return ORDER.info;
  }
}

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (ORDER[level] < currentLevel()) return;

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ?? {}),
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
};
