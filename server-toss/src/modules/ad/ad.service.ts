import { EntityManager } from "@mikro-orm/mysql";
import { Injectable, NotFoundException } from "@nestjs/common";
import { AdType, AdView } from "./ad-view.entity";
import { User } from "../user/user.entity";

@Injectable()
export class AdService {
  constructor(private readonly em: EntityManager) {}

  async recordDrawingAdView(userKey: number): Promise<void> {
    const user = await this.em.findOne(User, { userKey });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없어요.");

    const adView = this.em.create(AdView, {
      type: AdType.DRAWING,
      user,
    });

    this.em.persist(adView);
    await this.em.flush();
  }
}
