export class Runner {
  _config;
  _compose;
  _k6;
  _token;
  _result;

  constructor(config, compose, k6, token, result) {
    this._config = config;
    this._compose = compose;
    this._k6 = k6;
    this._token = token;
    this._result = result;
  }

  async run() {
    const startedAt = new Date();
    await this._stage(
      "Load Test",
      async () => {
        try {
          await this._compose.down({ profiles: this._config.docker.profiles });
        } catch {}

        // MySQL
        await this._stage(
          "MySQL",
          async () => {
            await this._compose.up({ services: ["davinci-mysql"] });
            await this._compose.waitHealthy("davinci-mysql");
          },
          {
            onError: async () => {
              await this._compose.logs("davinci-mysql");
            },
          },
        );

        // 마이그레이션
        if (this._config.database.migrate) {
          await this._stage("Migration", async () => {
            await this._compose.run("davinci-migrate", [
              "pnpm",
              "exec",
              "mikro-orm",
              "migration:up",
              "--config",
              "mikro-orm.migration.config.cjs",
            ]);
          });
        }

        // 시드 데이터 주입
        await this._stage("Seed", async () => {
          await this._compose.run(
            "davinci-migrate",
            [
              "pnpm",
              "exec",
              "mikro-orm",
              "seeder:run",
              "--config",
              "mikro-orm.migration.config.cjs",
              "--class",
              "LoadTestSeeder",
            ],
            { SEED_DRAWING_USER_COUNT: this._config.database.seed },
          );
        });

        // 토큰 주입
        await this._stage("Token Generate", async () => {
          await this._token.generate(this._config.tokens.count);
        });

        // OpenTelemetry 실행
        if (
          Array.isArray(this._config.docker?.profiles) &&
          this._config.docker.profiles.length > 0
        ) {
          await this._stage("Observability", async () => {
            await this._compose.up({
              profiles: this._config.docker.profiles,
            });
          });
        }

        // 서버 실행
        await this._stage(
          "App",
          async () => {
            await this._compose.up({ services: ["davinci-app"] });
            await this._compose.waitHealthy("davinci-app");
          },
          {
            onError: async () => {
              await this._compose.logs("davinci-app");
            },
          },
        );

        // 웜업 스테이지
        if (this._config.warmup.enabled) {
          await this._stage("Warmup", async () => {
            await this._k6.warmup(this._config.warmup);
          });
        }

        // 메인 스테이지
        await this._stage("Main", async () => {
          await this._k6.run({
            config: this._config.main,
            outputDir: this._result.getDirectory(),
          });
        });
      },
      {
        onFinally: async () => {
          this._result.saveMetadata({ startedAt, finishedAt: new Date() });
          this._result.flush();
          await this._compose.down({});
        },
      },
    );
  }

  /**
   *
   * @param {string} name
   * @param {() => Promise<void>} fn
   * @param {{ onError?: () => Promise<void>, onFinally?: () => Promise<void> }} options
   */
  async _stage(name, fn, options = {}) {
    console.log(`[${name}] start`);
    const started = performance.now();
    try {
      await fn();
      console.log(`[${name}] done`);
    } catch (err) {
      if (options?.onError) {
        await options.onError();
      }
      throw new Error(`[${name}] 에러`, { cause: err });
    } finally {
      if (options?.onFinally) {
        await options.onFinally();
      }
      const finished = performance.now();
      this._result.recordStage(name, finished - started);
    }
  }
}
