import { applyDecorators, SetMetadata } from "@nestjs/common";

export const TRACE_TARGET_METADATA = Symbol("TRACE_TARGET_METADATA");

export function TraceTarget(): ClassDecorator {
  return applyDecorators(SetMetadata(TRACE_TARGET_METADATA, true));
}
