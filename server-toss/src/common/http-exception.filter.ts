import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  createExceptionResponse,
  getHttpExceptionMessage,
} from "./exception-response";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    response
      .status(exception.getStatus())
      .json(
        createExceptionResponse(
          exception.getStatus(),
          getHttpExceptionMessage(exception),
          request.url,
        ),
      );
  }
}
