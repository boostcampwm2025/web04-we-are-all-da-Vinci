import { EntityRepository } from "@mikro-orm/mysql";
import { Drawing } from "./drawing.entity";

export class DrawingRepository extends EntityRepository<Drawing> {}
