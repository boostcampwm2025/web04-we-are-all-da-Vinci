import "express";

declare module "express" {
  interface Request {
    user?: { userKey: number };
  }
}
