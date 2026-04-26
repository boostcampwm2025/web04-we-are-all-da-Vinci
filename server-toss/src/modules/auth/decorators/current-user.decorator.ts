import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export interface CurrentUserPayload {
  userKey: number;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request["user"] as CurrentUserPayload;
  },
);
