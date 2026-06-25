import { EntityRepository } from "@mikro-orm/mysql";
import { Mission, MissionPeriod } from "../entity/mission.entity";

export class MissionRepository extends EntityRepository<Mission> {
  async findFixed(period: MissionPeriod): Promise<Mission[]> {
    return this.find({ period, isFixed: true });
  }

  async findRandom(period: MissionPeriod): Promise<Mission[]> {
    return this.find({ period, isFixed: false });
  }

  async findTutorial(): Promise<Mission[]> {
    return this.find({ period: MissionPeriod.TUTORIAL });
  }
}
