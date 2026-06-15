import { UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/mysql";
import { InjectRepository } from "@mikro-orm/nestjs";
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { TutorialMissionService } from "src/modules/mission/service/tutorial-mission.service";
import { generateNickname } from "src/modules/user/lib/nickname-generator";
import { User } from "src/modules/user/user.entity";
import { UserRepository } from "src/modules/user/user.repository";

const NICKNAME_RETRY_LIMIT = 5;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: UserRepository,
    private readonly em: EntityManager,
    private readonly tutorialMissionService: TutorialMissionService,
  ) {}

  async upsert(data: {
    userKey: number;
    name: string;
    gender?: string;
    birthday?: Date;
  }): Promise<User> {
    const existing = await this.userRepository.findOne({
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
    const user = await this.userRepository.findOne({ userKey });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없어요.");
    return user;
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
    const user = this.userRepository.create({
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
