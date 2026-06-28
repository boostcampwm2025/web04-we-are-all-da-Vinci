import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { EntityManager } from "@mikro-orm/mysql";
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { TutorialMissionService } from "src/modules/mission/service/tutorial-mission.service";
import { generateNickname } from "src/modules/user/lib/nickname-generator";
import { User } from "src/modules/user/user.entity";
import { AdView } from "../chance/ad-view.entity";
import { PlayChance } from "../chance/play-chance.entity";
import { ShareLog } from "../chance/share-log.entity";
import { DailyUserRanking } from "../dailyRanking/daily-user-ranking.entity";
import { Drawing } from "../drawing/drawing.entity";
import { UserMission } from "../mission/entity/user-mission.entity";
import { NotificationAgreement } from "../notification/notification-agreement.entity";
import { SentNotification } from "../notification/sent-notification.entity";
import { PointGrantRequest } from "../point/entity/point-grant-request.entity";
import { PointLog } from "../point/entity/point-log.entity";
import { Ranking } from "../ranking/ranking.entity";
import { Attendance } from "../attendance/attendance.entity";

const NICKNAME_RETRY_LIMIT = 5;

@Injectable()
export class UserService {
  constructor(
    private readonly tutorialMissionService: TutorialMissionService,
    private readonly em: EntityManager,
  ) {}

  async upsert(data: {
    userKey: number;
    name: string;
    gender?: string;
    birthday?: Date;
  }): Promise<User> {
    const existing = await this.em.findOne(User, {
      userKey: data.userKey,
    });

    if (existing) {
      existing.name = data.name;
      if (data.gender !== undefined) existing.gender = data.gender;
      if (data.birthday !== undefined) existing.birthday = data.birthday;
      await this.em.flush();
      return existing;
    }

    return this.createWithNickname(data);
  }

  async getUserInfo(userKey: number): Promise<User> {
    const user = await this.em.findOne(User, { userKey });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없어요.");
    return user;
  }

  @Transactional()
  async removeAll(userKey: number) {
    const user = await this.getUserInfo(userKey);

    await this.em.nativeDelete(Ranking, { userKey: user.userKey });
    await this.em.nativeDelete(DailyUserRanking, { userKey: user.userKey });
    await this.em.nativeDelete(Drawing, { user: user });

    await this.em.nativeDelete(UserMission, { user: user });

    await this.em.nativeDelete(SentNotification, { userKey: user.userKey });
    await this.em.nativeDelete(NotificationAgreement, {
      userKey: user.userKey,
    });

    await this.em.nativeDelete(PointLog, { user: user });
    await this.em.nativeDelete(PointGrantRequest, { user: user });

    await this.em.nativeDelete(PlayChance, { userKey: user.userKey });
    await this.em.nativeDelete(AdView, { user: user });
    await this.em.nativeDelete(ShareLog, { user: user });

    await this.em.nativeDelete(Attendance, { userKey: user.userKey });

    await this.em.nativeDelete(User, { userKey: user.userKey });
  }

  private async createWithNickname(data: {
    userKey: number;
    name: string;
    gender?: string;
    birthday?: Date;
  }): Promise<User> {
    for (let attempt = 0; attempt < NICKNAME_RETRY_LIMIT; attempt++) {
      try {
        return await this.persistNewUser(data, generateNickname());
      } catch (err) {
        if (!(err instanceof UniqueConstraintViolationException)) throw err;
      }
    }

    try {
      const fallback = `${generateNickname()}${Date.now().toString(36).slice(-4)}`;
      return await this.persistNewUser(data, fallback);
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        throw new InternalServerErrorException(
          "닉네임 생성에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
      }
      throw err;
    }
  }

  private async persistNewUser(
    data: { userKey: number; name: string; gender?: string; birthday?: Date },
    nickname: string,
  ): Promise<User> {
    const user = this.em.create(User, {
      userKey: data.userKey,
      name: data.name,
      nickname,
      gender: data.gender,
      birthday: data.birthday,
    });
    this.em.persist(user);
    await this.em.flush();

    // 신규 유저에게 튜토리얼 미션을 가입 시점에 1회 eager 할당
    // (이후 미션 hot path에서는 튜토리얼 할당을 보장하지 않는다)
    await this.tutorialMissionService.ensureTutorialAssigned(user.userKey);

    return user;
  }
}
