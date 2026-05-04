import { HttpException } from "@nestjs/common";

export type ExceptionResponse = {
  timestamp: string;
  statusCode: number;
  message: string;
  path: string;
};

export const ZOD_VALIDATION_MESSAGE =
  "요청 데이터가 올바르지 않아요 (Validation Failed)";

export function createExceptionResponse(
  statusCode: number,
  message: string,
  path: string,
  timestamp = new Date().toISOString(),
): ExceptionResponse {
  return {
    timestamp,
    statusCode,
    message,
    path,
  };
}

export function getHttpExceptionMessage(exception: HttpException): string {
  const response = exception.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (typeof response === "object" && response !== null) {
    const { message } = response as { message?: unknown };

    if (Array.isArray(message)) {
      return message.map(String).join(", ");
    }

    if (typeof message === "string") {
      return message;
    }

    if (
      typeof message === "number" ||
      typeof message === "boolean" ||
      typeof message === "bigint"
    ) {
      return String(message);
    }

    if (typeof message === "symbol") {
      return message.description ?? "Symbol";
    }

    if (typeof message === "object" && message !== null) {
      try {
        return JSON.stringify(message);
      } catch {
        return "요청 처리에 실패했어요.";
      }
    }
  }

  return String(exception.message);
}
