import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { Quest, QuestPeriod } from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";
import { QuestWindow } from "../quest-window";
import { DAILY_RANDOM_COUNT, WEEKLY_RANDOM_COUNT } from "../quest.constants";
import { QuestRepository } from "../repository/quest.repository";
import { UserQuestRepository } from "../repository/user-quest.repository";

@Injectable()
export class AssignQuestService {
  private readonly logger = new Logger(AssignQuestService.name);
  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: QuestRepository,
    @InjectRepository(UserQuest)
    private readonly userQuestRepository: UserQuestRepository,
  ) {}

  async ensureQuestsAssigned(
    userKey: number,
    window: QuestWindow,
  ): Promise<void> {
    const { todayStart, weekStart } = window;

    const existing = await this.userQuestRepository.findCurrentQuests(
      userKey,
      todayStart,
      weekStart,
    );
    if (existing.length > 0) return;

    try {
      await this.assignNewQuests(userKey, todayStart, weekStart);
    } catch (err) {
      if (!this.isDuplicateKeyError(err)) throw err;
    }
  }

  @Transactional()
  private async assignNewQuests(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    const dailyQuests = await this.assignQuests(
      userKey,
      QuestPeriod.DAILY,
      todayStart,
      DAILY_RANDOM_COUNT,
    );
    const weeklyQuests = await this.assignQuests(
      userKey,
      QuestPeriod.WEEKLY,
      weekStart,
      WEEKLY_RANDOM_COUNT,
    );

    const all = [...dailyQuests, ...weeklyQuests];
    if (all.length > 0) {
      await this.userQuestRepository.flush();
    }

    this.logger.log(
      {
        event: "quest.assign.succeeded",
        userKey,
        dailyCount: dailyQuests.length,
        weeklyCount: weeklyQuests.length,
      },
      "퀘스트 배정 완료",
    );

    return all;
  }

  private async assignQuests(
    userKey: number,
    period: QuestPeriod,
    periodStart: Date,
    randomCount: number,
  ): Promise<UserQuest[]> {
    const fixedQuests = await this.questRepository.findFixed(period);
    const randomQuests = await this.questRepository.findRandom(period);

    const selected = [
      ...fixedQuests,
      ...this.pickRandom(randomQuests, randomCount),
    ];

    return selected.map((quest) =>
      this.userQuestRepository.createForUser(userKey, quest, periodStart),
    );
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "ER_DUP_ENTRY"
    );
  }

  private pickRandom<T>(items: T[], count: number): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count);
  }
}
