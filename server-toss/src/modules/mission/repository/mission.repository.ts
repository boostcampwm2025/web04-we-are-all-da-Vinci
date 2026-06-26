import { EntityRepository } from "@mikro-orm/mysql";
import { Mission, MissionPeriod } from "../entity/mission.entity";

export class MissionRepository extends EntityRepository<Mission> {
  // id 오름차순 고정 — 같은 슬롯 중복 행이 남아 있어도 dedupeByObjective가 항상
  // 가장 작은 id(시드/마이그레이션 canonical)를 고르도록 결정성을 보장한다.
  async findFixed(period: MissionPeriod): Promise<Mission[]> {
    return this.find({ period, isFixed: true }, { orderBy: { id: "asc" } });
  }

  async findRandom(period: MissionPeriod): Promise<Mission[]> {
    return this.find({ period, isFixed: false }, { orderBy: { id: "asc" } });
  }

  async findTutorial(): Promise<Mission[]> {
    return this.find({ period: MissionPeriod.TUTORIAL });
  }
}
