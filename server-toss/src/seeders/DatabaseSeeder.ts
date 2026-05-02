import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { AdType, AdView } from "src/modules/ad/ad-view.entity";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { PointLog, PointReason } from "src/modules/point/point-log.entity";
import { DailyPrompt } from "src/modules/prompt/daily-prompt.entity";
import { Prompt } from "src/modules/prompt/prompt.entity";
import { Ranking } from "src/modules/ranking/ranking.entity";
import { User } from "src/modules/user/user.entity";
import { getTodayKst } from "src/common/today";

type Stroke = {
  points: [number[], number[]];
  color: [number, number, number];
};

type Similarity = {
  score: number;
  strokeMatchSimilarity: number;
  shapeSimilarity: number;
  penalty: number;
};

const TEST_USERS = [
  {
    userKey: 900001,
    name: "SeedA",
    gender: "female",
    birthday: new Date("1998-01-12T00:00:00.000Z"),
  },
  {
    userKey: 900002,
    name: "SeedB",
    gender: "male",
    birthday: new Date("1996-04-03T00:00:00.000Z"),
  },
  {
    userKey: 900003,
    name: "SeedC",
    gender: "female",
    birthday: new Date("2000-09-27T00:00:00.000Z"),
  },
  {
    userKey: 900004,
    name: "SeedD",
    gender: "male",
    birthday: new Date("1994-12-08T00:00:00.000Z"),
  },
  {
    userKey: 900005,
    name: "SeedE",
    gender: undefined,
    birthday: new Date("2001-06-19T00:00:00.000Z"),
  },
] as const;

const TEST_USER_KEYS = TEST_USERS.map(({ userKey }) => userKey);

const USER_STROKES: Stroke[] = [
  {
    points: [
      [63, 63, 67, 76, 84, 96, 109, 116, 119],
      [103, 102, 102, 101, 101, 102, 102, 102, 102],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [100, 99, 99, 99, 98, 98, 98],
      [103, 105, 109, 114, 127, 131, 132],
    ],
    color: [0, 0, 0],
  },
  {
    points: [
      [
        110, 115, 115, 117, 118, 120, 121, 121, 122, 123, 124, 124, 124, 125,
        125, 124, 122, 121, 121, 121, 121, 121, 121, 122, 123, 125, 126, 129,
        131, 131, 131, 131,
      ],
      [
        122, 122, 122, 122, 121, 119, 117, 117, 116, 116, 116, 116, 114, 115,
        115, 115, 118, 120, 121, 121, 123, 125, 127, 128, 129, 131, 131, 131,
        130, 128, 127, 127,
      ],
    ],
    color: [239, 68, 68],
  },
  {
    points: [
      [
        156, 155, 154, 153, 153, 152, 151, 150, 148, 146, 146, 147, 147, 147,
        147, 147, 147, 147, 147, 149, 149, 149, 149, 150, 150, 150, 149, 149,
        147, 146,
      ],
      [
        119, 119, 119, 119, 119, 117, 117, 117, 117, 118, 118, 119, 120, 121,
        122, 122, 124, 125, 126, 127, 128, 129, 131, 132, 132, 133, 133, 133,
        133, 133,
      ],
    ],
    color: [59, 130, 246],
  },
  {
    points: [
      [158, 162, 171, 172, 176, 176, 177],
      [109, 110, 111, 113, 114, 115, 115],
    ],
    color: [34, 197, 94],
  },
  {
    points: [
      [167, 167, 167, 165, 165, 165, 165, 165, 165, 165, 165],
      [99, 101, 102, 117, 122, 127, 129, 133, 139, 140, 142],
    ],
    color: [34, 197, 94],
  },
];

const PROMPT_STROKES: Stroke[][] = [
  [
    {
      points: [
        [
          90, 84, 70, 39, 27, 23, 1, 0, 4, 41, 57, 102, 133, 147, 176, 213, 231,
          242, 246, 245, 232, 214, 191, 160, 122, 94, 90, 88,
        ],
        [
          73, 61, 56, 56, 62, 64, 124, 174, 184, 240, 248, 248, 255, 255, 241,
          219, 193, 166, 149, 124, 97, 75, 62, 60, 80, 78, 75, 69,
        ],
      ],
      color: [239, 68, 68],
    },
    {
      points: [
        [104, 112, 118, 116],
        [72, 30, 25, 78],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [103, 99, 83, 65, 56, 57, 68, 81],
        [59, 46, 25, 12, 0, 38, 55, 59],
      ],
      color: [34, 197, 94],
    },
  ],
  [
    {
      points: [
        [48, 31],
        [92, 181],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [198, 201, 201],
        [76, 100, 167],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [0, 185, 251, 190, 115, 103, 78, 36, 12, 3],
        [82, 83, 80, 39, 8, 10, 25, 58, 70, 82],
      ],
      color: [239, 68, 68],
    },
    {
      points: [
        [101, 103, 152, 152, 150, 94],
        [99, 149, 150, 107, 99, 97],
      ],
      color: [239, 68, 68],
    },
    {
      points: [
        [125, 124],
        [98, 149],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [101, 166],
        [133, 131],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [97, 105, 111, 125, 130, 131, 94],
        [60, 37, 34, 42, 51, 65, 60],
      ],
      color: [59, 130, 246],
    },
    {
      points: [
        [168, 168],
        [3, 27],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [184, 189],
        [4, 41],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [168, 169, 184],
        [0, 3, 5],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [34, 117, 135, 210, 208],
        [186, 189, 185, 184, 154],
      ],
      color: [0, 0, 0],
    },
    {
      points: [
        [24, 25, 11, 12, 25, 33, 36, 41, 37, 39, 41, 41, 48],
        [186, 174, 155, 163, 181, 155, 154, 171, 170, 177, 175, 150, 181],
      ],
      color: [34, 197, 94],
    },
    {
      points: [
        [204, 211, 240, 235, 231, 242, 231, 255, 250, 246, 237],
        [181, 176, 138, 149, 173, 156, 182, 175, 178, 190, 196],
      ],
      color: [34, 197, 94],
    },
  ],
];

const SIMILARITIES: Similarity[] = [
  buildSimilarity(48.2, 42.1, 5.6),
  buildSimilarity(39.5, 33.8, 7.1),
  buildSimilarity(50, 45.4, 3.2),
  buildSimilarity(31.8, 37.6, 10.4),
  buildSimilarity(44.4, 38.8, 6.7),
];

function buildSimilarity(
  strokeMatchSimilarity: number,
  shapeSimilarity: number,
  penalty: number,
): Similarity {
  return {
    score: Number(
      (strokeMatchSimilarity + shapeSimilarity - penalty).toFixed(1),
    ),
    strokeMatchSimilarity,
    shapeSimilarity,
    penalty,
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    await em.transactional(async (txEm) => {
      const existingUsers = await txEm.find(User, {
        userKey: { $in: TEST_USER_KEYS },
      });
      const existingUserIds = existingUsers.map((user) => user.id);

      if (existingUserIds.length > 0) {
        await txEm.nativeDelete(Ranking, { userId: { $in: existingUserIds } });
        await txEm.nativeDelete(Drawing, { user: { $in: existingUsers } });
        await txEm.nativeDelete(PointLog, { user: { $in: existingUsers } });
        await txEm.nativeDelete(AdView, { user: { $in: existingUsers } });
      }

      const today = getTodayKst();
      const tomorrow = addDays(today, 1);
      const prompts = await Promise.all([
        this.upsertPromptForDate(txEm, today, PROMPT_STROKES[0]),
        this.upsertPromptForDate(txEm, tomorrow, PROMPT_STROKES[1]),
      ]);
      const todayPrompt = prompts[0];

      const userByKey = new Map(
        existingUsers.map((user) => [user.userKey, user]),
      );
      const users = TEST_USERS.map((seedUser) => {
        const existingUser = userByKey.get(seedUser.userKey);
        if (existingUser) {
          existingUser.name = seedUser.name;
          existingUser.gender = seedUser.gender;
          existingUser.birthday = seedUser.birthday;
          return existingUser;
        }

        const user = txEm.create(User, {
          userKey: seedUser.userKey,
          name: seedUser.name,
          gender: seedUser.gender,
          birthday: seedUser.birthday,
        });
        txEm.persist(user);
        return user;
      });
      await txEm.flush();

      const submittedAtBase = minutesAfter(new Date(), -30);
      const drawings = users.map((user, index) => {
        const submittedAt = minutesAfter(submittedAtBase, index * 3);
        const drawing = txEm.create(Drawing, {
          user,
          prompt: todayPrompt,
          strokes: JSON.stringify(USER_STROKES),
          similarity: JSON.stringify(SIMILARITIES[index]),
          score: SIMILARITIES[index].score,
          createdAt: submittedAt,
          updatedAt: submittedAt,
        });
        txEm.persist(drawing);
        return drawing;
      });
      await txEm.flush();

      drawings.forEach((drawing, index) => {
        const ranking = txEm.create(Ranking, {
          name: users[index].name,
          strokes: drawing.strokes,
          score: drawing.score,
          userId: users[index].id,
          drawingId: drawing.id,
          submittedAt: drawing.createdAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        txEm.persist(ranking);

        txEm.persist(
          txEm.create(PointLog, {
            user: users[index],
            reason: PointReason.DRAWING,
            pointAmount: 10,
          }),
        );

        txEm.persist(
          txEm.create(PointLog, {
            user: users[index],
            reason: index % 2 === 0 ? PointReason.AD : PointReason.SHARE,
            pointAmount: index % 2 === 0 ? 5 : 3,
          }),
        );

        txEm.persist(
          txEm.create(AdView, {
            user: users[index],
            type: AdType.DRAWING,
          }),
        );
      });

      await txEm.flush();
    });
  }

  private async upsertPromptForDate(
    em: EntityManager,
    promptDate: Date,
    strokes: Stroke[],
  ): Promise<Prompt> {
    const dailyPrompt = await em.findOne(
      DailyPrompt,
      { promptDate },
      { populate: ["prompt"] },
    );

    if (dailyPrompt) {
      dailyPrompt.prompt.strokes = JSON.stringify(strokes);
      return dailyPrompt.prompt;
    }

    const prompt = em.create(Prompt, {
      strokes: JSON.stringify(strokes),
    });
    const daily = em.create(DailyPrompt, {
      prompt,
      promptDate,
    });
    em.persist(prompt);
    em.persist(daily);
    return prompt;
  }
}
