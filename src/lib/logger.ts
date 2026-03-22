/**
 * Structured Logger
 * ANSIカラーでサーバーログを視覚化する
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  // foreground
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  // background
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
} as const;

const LEVEL_STYLES: Record<LogLevel, { label: string; color: string }> = {
  debug: { label: "DBG", color: COLORS.gray },
  info: { label: "INF", color: COLORS.cyan },
  warn: { label: "WRN", color: COLORS.yellow },
  error: { label: "ERR", color: `${COLORS.bold}${COLORS.red}` },
};

// scope ごとの色（自動で回る）
const SCOPE_COLORS = [
  COLORS.magenta,
  COLORS.blue,
  COLORS.green,
  COLORS.cyan,
  COLORS.yellow,
];
const scopeColorMap = new Map<string, string>();
let scopeColorIndex = 0;

function getScopeColor(scope: string): string {
  if (!scopeColorMap.has(scope)) {
    scopeColorMap.set(scope, SCOPE_COLORS[scopeColorIndex % SCOPE_COLORS.length]);
    scopeColorIndex++;
  }
  return scopeColorMap.get(scope)!;
}

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? "debug";

function formatTimestamp(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${COLORS.dim}${h}:${m}:${s}.${ms}${COLORS.reset}`;
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${COLORS.green}<1ms${COLORS.reset}`;
  if (ms < 100) return `${COLORS.green}${ms}ms${COLORS.reset}`;
  if (ms < 1000) return `${COLORS.yellow}${ms}ms${COLORS.reset}`;
  return `${COLORS.red}${(ms / 1000).toFixed(2)}s${COLORS.reset}`;
}

function log(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < LEVELS[currentLevel]) return;

  const { label, color } = LEVEL_STYLES[level];
  const scopeColor = getScopeColor(scope);
  const ts = formatTimestamp();

  let line = `${ts} ${color}${label}${COLORS.reset} ${scopeColor}[${scope}]${COLORS.reset} ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    const parts = Object.entries(meta).map(([k, v]) => {
      const val = typeof v === "number" ? `${COLORS.bold}${v}${COLORS.reset}` : String(v);
      return `${COLORS.dim}${k}=${COLORS.reset}${val}`;
    });
    line += ` ${parts.join(" ")}`;
  }

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", scope, msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", scope, msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", scope, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", scope, msg, meta),

    /** 処理時間を計測する */
    time(label: string) {
      const start = performance.now();
      return {
        end: (meta?: Record<string, unknown>) => {
          const elapsed = Math.round(performance.now() - start);
          log("info", scope, `${label} ${formatDuration(elapsed)}`, meta);
          return elapsed;
        },
      };
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
