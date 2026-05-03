import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/mysql";
import { User } from "src/modules/user/user.entity";
import { UserRepository } from "src/modules/user/user.repository";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: UserRepository,
    private readonly em: EntityManager,
  ) {}

  async upsert(data: {
    userKey: number;
    name: string;
    gender?: string;
    birthday?: Date;
  }): Promise<void> {
    let user = await this.userRepository.findOne({ userKey: data.userKey });

    if (!user) {
      user = this.userRepository.create({
        userKey: data.userKey,
        name: data.name,
        gender: data.gender,
        birthday: data.birthday,
      });
      this.em.persist(user);
    } else {
      user.name = data.name;
      if (data.gender !== undefined) user.gender = data.gender;
      if (data.birthday !== undefined) user.birthday = data.birthday;
    }

    await this.em.flush();
  }

  async getUserInfo(userKey: number): Promise<User> {
    const user = await this.userRepository.findOne({ userKey });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없어요.");
    return user;
  }
}
