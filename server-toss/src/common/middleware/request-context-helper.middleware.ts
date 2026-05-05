import { RequestContext } from "@mikro-orm/core";
import { MikroORM } from "@mikro-orm/mysql";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class RequestContextHelper implements NestMiddleware {
  constructor(private readonly orm: MikroORM) {}
  use(req: Request, res: Response, next: NextFunction) {
    RequestContext.create(this.orm.em, next);
  }
}
