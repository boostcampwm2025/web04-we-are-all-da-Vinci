#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const dotenv = require("dotenv");
const { JwtService } = require("@nestjs/jwt");

const DEFAULT_MIN_USER_KEY = 1_900_000;

function loadEnv() {
  const projectRoot = path.resolve(__dirname, "../../../");
  dotenv.config({ path: path.resolve(projectRoot, ".env") });
  dotenv.config({
    path: path.resolve(projectRoot, ".env.local"),
    override: true,
  });
}

function parseIntegerArg(name, raw, { min } = {}) {
  if (raw === undefined) return undefined;

  if (!/^\d+$/.test(raw)) {
    throw new Error(`--${name} 값은 양의 정수여야 합니다. 입력값="${raw}"`);
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`--${name} 값이 너무 큽니다. 입력값="${raw}"`);
  }

  if (typeof min === "number" && value < min) {
    throw new Error(
      `--${name} 값은 ${min} 이상이어야 합니다. 입력값="${value}"`,
    );
  }

  return value;
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) {
      throw new Error(`알 수 없는 인자입니다: ${key}`);
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${key} 인자의 값이 없습니다.`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }

  args.out = args.out ?? "tests/load-test/fixtures/tokens.json";

  const count = parseIntegerArg("count", args.count, { min: 1 });
  const minUserKey = parseIntegerArg("minUserKey", args.minUserKey, { min: 1 });
  const maxUserKey = parseIntegerArg("maxUserKey", args.maxUserKey, { min: 1 });

  const resolvedMinUserKey = minUserKey ?? DEFAULT_MIN_USER_KEY;
  if (typeof maxUserKey === "number" && maxUserKey < resolvedMinUserKey) {
    throw new Error(
      `--maxUserKey는 minUserKey(${resolvedMinUserKey}) 이상이어야 합니다. 입력값="${maxUserKey}"`,
    );
  }

  return {
    out: args.out,
    count,
    minUserKey: resolvedMinUserKey,
    maxUserKey,
  };
}

function buildUserKeyFilter(minUserKey, maxUserKey) {
  if (typeof maxUserKey === "number") {
    return { $gte: minUserKey, $lte: maxUserKey };
  }
  return { $gte: minUserKey };
}

function buildWhere(minUserKey, maxUserKey) {
  return {
    userKey: buildUserKeyFilter(minUserKey, maxUserKey),
  };
}

async function run() {
  loadEnv();
  require("ts-node/register");
  require("tsconfig-paths/register");

  const options = parseArgs(process.argv.slice(2));

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET 환경변수가 필요합니다. .env 또는 .env.local에 설정해주세요.",
    );
  }

  const { MikroORM } = require("@mikro-orm/mysql");
  const mikroOrmConfig = require("../../../src/mikro-orm.config.ts").default;
  const { User } = require("../../../src/modules/user/user.entity.ts");

  const orm = await MikroORM.init({ ...mikroOrmConfig, host: "127.0.0.1" });

  try {
    const em = orm.em.fork();
    const where = buildWhere(options.minUserKey, options.maxUserKey);

    const availableUserCount = await em.count(User, where);

    if (
      typeof options.count === "number" &&
      options.count > availableUserCount
    ) {
      console.error(
        [
          "[generate-test-tokens] 요청한 토큰 발급 수가 가용 유저 수를 초과했습니다.",
          `요청수=${options.count}`,
          `가용유저수=${availableUserCount}`,
          `minUserKey=${options.minUserKey}`,
          `maxUserKey=${options.maxUserKey ?? "없음"}`,
        ].join(" "),
      );
      process.exitCode = 1;
      return;
    }

    const targetCount =
      typeof options.count === "number" ? options.count : availableUserCount;

    const users =
      targetCount === 0
        ? []
        : await em.find(User, where, {
            orderBy: { userKey: "asc" },
            fields: ["userKey"],
            limit: targetCount,
          });

    const jwtService = new JwtService({
      secret: jwtSecret,
      signOptions: { expiresIn: "1d" },
    });

    const tokens = users.map((user) => ({
      userKey: user.userKey,
      token: jwtService.sign({ sub: user.userKey }),
    }));

    const outputPath = path.resolve(process.cwd(), options.out);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(
      `${outputPath}`,
      `${JSON.stringify(tokens, null, 2)}\n`,
      "utf8",
    );

    console.log(
      [
        "[generate-test-tokens] completed.",
        `생성개수=${tokens.length}`,
        `저장경로=${outputPath}`,
        `minUserKey=${options.minUserKey}`,
        `maxUserKey=${options.maxUserKey ?? "없음"}`,
      ].join(" "),
    );
  } finally {
    await orm.close(true);
  }
}

run().catch((err) => {
  console.error(
    `[generate-test-tokens] 실패: ${
      err instanceof Error ? err.message : String(err)
    }`,
  );
  process.exit(1);
});
