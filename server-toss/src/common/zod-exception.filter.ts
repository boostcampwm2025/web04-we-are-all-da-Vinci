import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createExceptionResponse,
  ZOD_VALIDATION_MESSAGE,
} from "./exception-response";

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    response.status(400).json({
      ...createExceptionResponse(400, ZOD_VALIDATION_MESSAGE, request.url),
      issues: exception.issues,
    });
  }
}
