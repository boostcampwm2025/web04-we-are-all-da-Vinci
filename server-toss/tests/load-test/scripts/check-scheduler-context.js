#!/usr/bin/env node

// scheduler(@Cron)는 HTTP 요청이 아니라 RequestContext(fork em)가 없다.
// 그 상황에서 em 작업이 allowGlobalContext=false 하에 막히는지 재현한다.
//   - 전역 em(fork 안 함) = @CreateRequestContext 없는 cron 상황
//   - fork em = @CreateRequestContext / this.em.fork() 적용 상황(대조군)
//
// 사용:
//   MYSQL_DATABASE=load_test MYSQL_HOST=127.0.0.1 MYSQL_PORT=3307 MYSQL_USER=root MYSQL_PASSWORD= \
//     NODE_ENV=development node tests/load-test/scripts/check-scheduler-context.js

async function run() {
  require("ts-node/register");
  require("tsconfig-paths/register");

  const { MikroORM, RequestContext } = require("@mikro-orm/mysql");
  const config = require("../../../src/mikro-orm.config.ts").default;
  const {
    SentNotification,
  } = require("../../../src/modules/notification/sent-notification.entity.ts");

  console.log(
    `NODE_ENV=${process.env.NODE_ENV} allowGlobalContext=${config.allowGlobalContext}`,
  );

  const orm = await MikroORM.init({
    ...config,
    host: process.env.MYSQL_HOST || "127.0.0.1",
    debug: false,
  });

  const tryInsert = async (em, refSuffix) => {
    const repo = em.getRepository(SentNotification);
    return repo.tryInsert({
      userKey: 999999900 + refSuffix,
      type: "daily_prompt",
      referenceId: `ctxcheck_${refSuffix}`,
      sentAt: new Date(),
    });
  };

  try {
    // A) 전역 em — RequestContext 없는 cron 상황 그대로
    try {
      await tryInsert(orm.em, 1);
      console.log("[전역 em (cron 상황)]  결과: OK — 안 막힘");
    } catch (e) {
      console.log(
        `[전역 em (cron 상황)]  결과: BLOCKED → ${e.constructor.name}: ${String(e.message).slice(0, 140)}`,
      );
    }

    // B) fork em — this.em.fork() 수동(방안 2) 대조군
    try {
      const fork = orm.em.fork();
      await tryInsert(fork, 2);
      console.log("[fork em (방안2)]           결과: OK");
    } catch (e) {
      console.log(
        `[fork em (방안2)]           결과: BLOCKED → ${String(e.message).slice(0, 140)}`,
      );
    }

    // C) RequestContext.create — 방안 1(v7: 데코레이터 대체) 메커니즘
    try {
      await RequestContext.create(orm.em, async () => {
        const ctxEm = RequestContext.getEntityManager();
        await tryInsert(ctxEm, 3);
      });
      console.log("[RequestContext.create (방안1)] 결과: OK — 컨텍스트 잡힘");
    } catch (e) {
      console.log(
        `[RequestContext.create (방안1)] 결과: BLOCKED → ${String(e.message).slice(0, 140)}`,
      );
    }
  } finally {
    await orm.em
      .getConnection()
      .execute(
        "delete from sent_notifications where reference_id like 'ctxcheck\\_%'",
      )
      .catch(() => {});
    await orm.close(true);
  }
}

run().catch((err) => {
  console.error("check 실패:", err);
  process.exit(1);
});
