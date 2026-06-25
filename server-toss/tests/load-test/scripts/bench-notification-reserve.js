#!/usr/bin/env node

// 일일 프롬프트 대량 발송의 reserve 단계(sendBulk 내부 N번 직렬 tryInsert)를 격리 측정한다.
// 측정 가설:
//   H1(시간): reserve 시간이 대상 N에 선형 증가 (앱-DB 왕복 × N)
//   H2(메모리): em.clear() 없이 N entity가 identity map에 누적 → RSS 선형 증가, 2GB 천장 위험
//
// sendBulk는 이미 추려진 targets 배열을 받고 reserve는 sent_notifications에 INSERT만 하므로,
// 임의 userKey로 repo.tryInsert를 N번 호출하면 실제 reserve 경로를 그대로 잰다.
// UNIQUE(user_key, type, reference_id)는 userKey 1..N이 모두 달라 충돌하지 않는다.
//
// 환경변수:
//   BENCH_SIZES        쉼표구분 N 목록 (기본 "1000,10000,50000,100000")
//   BENCH_CLEAR_EVERY  N건마다 em.clear() (기본 0 = 현재 코드 동작: clear 안 함)
//   MYSQL_HOST/PORT/DATABASE  대상 DB
//
// 사용:
//   MYSQL_DATABASE=load_test node --expose-gc tests/load-test/scripts/bench-notification-reserve.js
//   MYSQL_DATABASE=load_test BENCH_CLEAR_EVERY=500 node --expose-gc tests/load-test/scripts/bench-notification-reserve.js

// 주의: .env/.env.local을 로드하지 않는다. 측정 대상 DB(load_test)·포트(3307)를
// 로컬 개발 DB(.env.local)가 override하는 사고를 막기 위해, 접속 정보는 전적으로
// 명령줄 환경변수로만 주입한다. (MYSQL_HOST/PORT/USER/PASSWORD/DATABASE 필수)
const mb = (bytes) => Math.round(bytes / 1024 / 1024);

async function run() {
  require("ts-node/register");
  require("tsconfig-paths/register");

  const { MikroORM } = require("@mikro-orm/mysql");
  const config = require("../../../src/mikro-orm.config.ts").default;
  const {
    SentNotification,
  } = require("../../../src/modules/notification/sent-notification.entity.ts");

  const sizes = (process.env.BENCH_SIZES || "1000,10000,50000,100000")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0);
  const clearEvery = Number(process.env.BENCH_CLEAR_EVERY || 0);

  const orm = await MikroORM.init({
    ...config,
    host: process.env.MYSQL_HOST || "127.0.0.1",
    debug: false,
  });

  const cleanup = () =>
    orm.em
      .getConnection()
      .execute(
        "delete from sent_notifications where reference_id like 'bench\\_%'",
      )
      .catch(() => {});

  const results = [];
  try {
    console.log(
      `[bench-reserve] sizes=${sizes.join(",")} clearEvery=${clearEvery} host=${process.env.MYSQL_HOST || "127.0.0.1"} db=${process.env.MYSQL_DATABASE}`,
    );

    for (const N of sizes) {
      await cleanup();

      const em = orm.em.fork();
      const repo = em.getRepository(SentNotification);
      const referenceId = `bench_${N}_${Date.now()}`;

      if (global.gc) global.gc();
      const rss0 = process.memoryUsage().rss;
      let peakRss = rss0;

      const t0 = process.hrtime.bigint();
      for (let i = 1; i <= N; i++) {
        await repo.tryInsert({
          userKey: i,
          type: "daily_prompt",
          referenceId,
          sentAt: new Date(),
        });
        if (clearEvery > 0 && i % clearEvery === 0) em.clear();
        if (i % 2000 === 0) {
          const r = process.memoryUsage().rss;
          if (r > peakRss) peakRss = r;
        }
      }
      const totalMs = Number(process.hrtime.bigint() - t0) / 1e6;
      peakRss = Math.max(peakRss, process.memoryUsage().rss);

      const row = {
        N,
        totalMs: Math.round(totalMs),
        perInsertMs: +(totalMs / N).toFixed(3),
        peakRssMB: mb(peakRss),
        deltaRssMB: mb(peakRss - rss0),
      };
      results.push(row);
      console.log(
        `  N=${N}\t total=${row.totalMs}ms\t per=${row.perInsertMs}ms\t peakRSS=${row.peakRssMB}MB\t ΔRSS=${row.deltaRssMB}MB`,
      );
    }

    console.log("\n[bench-reserve] 결과 요약");
    console.table(results);
  } finally {
    await cleanup();
    await orm.close(true);
  }
}

run().catch((err) => {
  console.error("[bench-reserve] 실패:", err);
  process.exit(1);
});
