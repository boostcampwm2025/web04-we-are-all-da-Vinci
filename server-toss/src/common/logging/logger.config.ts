import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { Params } from "nestjs-pino";

export const REQUEST_ID_HEADER = "x-request-id";
export const RESPONSE_REQUEST_ID_HEADER = "X-Request-Id";
export const REDACTED_VALUE = "[Redacted]";

const SENSITIVE_LOG_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
];

type RequestWithId = IncomingMessage & { id?: unknown; originalUrl?: string };
type ResponseWithError = ServerResponse & { err?: Error; statusCode: number };
type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal"
  | "silent";

type LoggerConfigInput = {
  nodeEnv?: string;
  logLevel?: string;
};
type LogObject = Record<string, unknown>;

function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getRequestPath(req: RequestWithId): string {
  return req.originalUrl ?? req.url ?? "";
}

function getIncomingRequestId(req: RequestWithId): string | undefined {
  const requestId = firstHeaderValue(req.headers[REQUEST_ID_HEADER]);
  const trimmed = requestId?.trim();
  return trimmed ? trimmed : undefined;
}

function toRequestId(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }
  return "unknown";
}

function toLogObject(value: unknown): LogObject {
  if (typeof value === "object" && value !== null) {
    return value as LogObject;
  }
  return {};
}

function getRequestLogProps(req: RequestWithId): { requestId: string } {
  return { requestId: toRequestId(req.id) };
}

function createSuccessLogObject(
  _req: IncomingMessage,
  res: ServerResponse,
  loggableObject: unknown,
): LogObject {
  return {
    ...toLogObject(loggableObject),
    event: "http.request.completed",
    statusCode: res.statusCode,
  };
}

function createErrorLogObject(
  _req: IncomingMessage,
  res: ServerResponse,
  _error: Error,
  loggableObject: unknown,
): LogObject {
  return {
    ...toLogObject(loggableObject),
    event: "http.request.failed",
    statusCode: res.statusCode,
  };
}

export function generateRequestId(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const requestId = getIncomingRequestId(req) ?? randomUUID();
  res.setHeader(RESPONSE_REQUEST_ID_HEADER, requestId);
  return requestId;
}

export function getHttpAutoLogLevel(
  req: IncomingMessage,
  res: ResponseWithError,
  error?: Error,
): LogLevel {
  if (error || res.err || res.statusCode >= 500) return "error";
  if (res.statusCode >= 400) return "warn";

  const path = getRequestPath(req);
  if (path === "/health" || path.startsWith("/health?")) return "silent";
  if (
    req.method === "POST" &&
    (path === "/strokes" || path.startsWith("/strokes?"))
  ) {
    return "debug";
  }

  return "info";
}

export function createLoggerParams({
  nodeEnv,
  logLevel,
}: LoggerConfigInput): Params {
  const isProduction = nodeEnv === "production";

  return {
    assignResponse: true,
    pinoHttp: {
      name: "server-toss",
      level: logLevel ?? (isProduction ? "info" : "debug"),
      redact: {
        paths: SENSITIVE_LOG_PATHS,
        censor: REDACTED_VALUE,
      },
      genReqId: generateRequestId,
      customProps: getRequestLogProps,
      customLogLevel: getHttpAutoLogLevel,
      customAttributeKeys: {
        responseTime: "durationMs",
      },
      customSuccessObject: createSuccessLogObject,
      customErrorObject: createErrorLogObject,
      transport: isProduction
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              singleLine: true,
              translateTime: "SYS:standard",
            },
          },
    },
  };
}
