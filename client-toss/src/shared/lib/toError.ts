/** unknown 값을 Error로 정규화한다. 이미 Error면 그대로, 아니면 fallback 메시지로 감싼다. */
export const toError = (error: unknown, fallbackMessage: string): Error =>
  error instanceof Error ? error : new Error(fallbackMessage);
