import { Migration } from "@mikro-orm/migrations";
import { generateNickname } from "../modules/user/lib/nickname-generator";

export class Migration20260506195152 extends Migration {
  override async up(): Promise<void> {
    await this.execute("alter table `users` add `nickname` varchar(20) null;");

    const rows = (await this.execute(
      "select `user_key` from `users` where `nickname` is null;",
    )) as { user_key: number }[];
    const used = new Set<string>();
    for (const row of rows) {
      let nickname: string;
      do {
        nickname = generateNickname();
      } while (used.has(nickname));
      used.add(nickname);
      await this.execute(
        `update \`users\` set \`nickname\` = '${nickname}' where \`user_key\` = ${row.user_key};`,
      );
    }

    await this.execute(
      "alter table `users` modify `nickname` varchar(20) not null;",
    );
    await this.execute(
      "alter table `users` add unique key `users_nickname_unique` (`nickname`);",
    );

    await this.execute(
      "alter table `rankings` drop index `idx_ranking_score_submit_name`;",
    );
    await this.execute(
      "alter table `rankings` change `name` `nickname` varchar(20) not null;",
    );
    await this.execute(
      "alter table `rankings` add index `idx_ranking_score_submit_nickname` (`score` DESC, `submitted_at` ASC, `nickname` ASC);",
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      "alter table `rankings` drop index `idx_ranking_score_submit_nickname`;",
    );
    await this.execute(
      "alter table `rankings` change `nickname` `name` varchar(10) not null;",
    );
    await this.execute(
      "alter table `rankings` add index `idx_ranking_score_submit_name` (`score` DESC, `submitted_at` ASC, `name` ASC);",
    );

    await this.execute(
      "alter table `users` drop index `users_nickname_unique`;",
    );
    await this.execute("alter table `users` drop column `nickname`;");
  }
}
