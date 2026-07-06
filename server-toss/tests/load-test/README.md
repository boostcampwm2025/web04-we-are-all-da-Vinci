## Load Test

### 테스트 환경 (Docker)

| 서비스                  | 스펙                 | 포트           |
| ----------------------- | -------------------- | -------------- |
| App (NestJS)            | 1 vCPU, 1GB, Node 22 | 3000           |
| MySQL 8.4               | 1 vCPU, 1GB          | 3306           |
| OpenTelemetry Collector | 640MB                | 4318(receiver) |
| Tempo                   | 640MB                | 4317(receiver) |
| Grafana                 | 1GB                  | 3100           |

OpenTelemetry Collector/Tempo/Grafana는 `obs` profile로 묶여 있어 기본 실행에는 뜨지 않는다.

### 준비물

- Docker (Compose)
- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- pnpm
- `docker/env/.env` 파일 (DB 접속 정보, JWT_SECRET 등)

### Quick Start

```bash
pnpm load-test
```

한 번에 Docker 기동 → 마이그레이션 → 시드 → 토큰 생성 → 앱 기동 → k6(warmup → main)까지 전부 실행하고, 끝나면(성공/실패 무관) 컨테이너를 정리한다. 실행 순서와 설정은 `configs/example.yaml`로 제어한다.

### 파이프라인 구성

`scripts/load-test.js`가 진입점이고, `scripts/runner.js`의 `Runner`가 아래 순서로 단계를 실행한다(각 단계는 `[이름] start`/`done` 로그로 구분됨):

1. **MySQL** — `davinci-mysql` 컨테이너 기동 + 헬스체크 대기
2. **Migration** (`database.migrate: true`일 때만) — `davinci-migrate` 서비스에서 `mikro-orm migration:up` 실행
3. **Seed** — `davinci-migrate`에서 `mikro-orm seeder:run --class LoadTestSeeder` 실행, `database.seed`에 지정한 수만큼 유저/드로잉 생성
4. **Token Generate** — `davinci-migrate`에서 JWT 토큰을 발급해 `fixtures/tokens.json`에 저장
5. **App** — `davinci-app` 컨테이너 기동 + 헬스체크 대기
6. **Warmup** (`warmup.enabled: true`일 때만) — k6로 `warmup` 설정만큼 가볍게 워밍업
7. **Main** — k6로 `main` 설정만큼 본 테스트 실행

어느 단계에서든 실패하면 즉시 에러를 던지고, 마지막에 항상 `docker compose down`으로 정리한다.

`davinci-migrate`는 배포용 슬림 이미지(`davinci-app`)가 아니라 **Dockerfile의 `builder` 스테이지**를 재사용한다 — devDependencies(`@mikro-orm/cli` 등)와 TS 소스가 다 있어야 마이그레이션/시드/토큰 생성이 가능하기 때문. `tests/load-test/` 디렉토리는 루트 `.dockerignore`가 빌드 컨텍스트에서 제외하므로, `docker/compose.yml`의 `davinci-migrate` 서비스가 이를 volume mount로 다시 끌어와 스크립트 접근과 `fixtures/tokens.json` 출력 영속화를 둘 다 해결한다.

### 설정: `configs/example.yaml`

```yaml
name: example

docker:
  profile:
    - obs # obs 붙이면 otel-collector/tempo/grafana도 같이 뜸 (아직 compose.js에서 실제로 소비하진 않음)

database:
  migrate: true # false면 Migration 단계 생략
  seed: 1000 # 시드할 유저 수 (SEED_DRAWING_USER_COUNT 환경변수로 davinci-migrate에 전달됨)

tokens:
  count: 1000 # 발급할 JWT 토큰 수

warmup:
  enabled: true
  vus: 5
  durations: 30s
  scenario: "baseline" # tests/load-test/k6/<scenario>.js

main:
  vus: 100
  durations: 5m
  scenario: "baseline"
```

새 설정 파일을 만들고 싶으면 `configs/` 아래 파일을 추가하고 `scripts/load-test.js`가 읽는 경로를 바꾸면 된다(아직 CLI 인자로 config 경로를 받진 않음).

### npm scripts

| 명령어                   | 설명                                             |
| ------------------------ | ------------------------------------------------ |
| `pnpm load-test`         | 전체 파이프라인 실행 (Docker + 시드 + 토큰 + k6) |
| `pnpm load-test:compare` | 두 결과 디렉토리 비교                            |
| `pnpm load-test:clean`   | Docker 컨테이너 + 볼륨 제거                      |

Docker Compose를 직접 조작해야 할 때 (로그 확인 등):

```bash
docker compose -f tests/load-test/docker/compose.yml logs -f
docker compose -f tests/load-test/docker/compose.yml down
```

### k6 (`k6/baseline.js`, `k6/options.json`)

- VU/duration은 오로지 `configs/example.yaml`의 `warmup`/`main` 값 → `k6-runner.js`가 `--vus`/`--duration` CLI 플래그로 넘긴다. `k6/options.json`에는 `thresholds`만 두고 `scenarios`는 정의하지 않는다 — k6는 스크립트가 `options.scenarios`를 export하면 CLI `--vus`/`--duration`을 무시하므로, warmup/main을 별개의 두 번의 k6 실행으로 다루는 이 구조와는 `scenarios` 방식이 맞지 않는다.
- `baseline.js`는 `--env VUS=<n>`/`--env DURATION=<d>`로 넘어온 값을 읽어 토큰 라운드로빈 인덱싱(`MAX_VUS`)과 리포트에 쓴다.
- k6는 **threshold(SLA) 위반 시 exit code 99**를 반환하는데, 이는 "테스트 인프라 실패"가 아니라 "테스트는 정상 종료됐고 SLA를 위반했다"는 뜻이라 `k6-runner.js`가 `[0, 99]`를 정상 종료로 취급한다. 콘솔에 `[k6] threshold(SLA) 위반` 경고만 찍고 파이프라인은 계속 진행된다.

### 결과 저장 (미구현)

예전 `run-test.sh`가 하던 `results/<timestamp>/{report.html,dashboard.html,raw-metrics.json.gz,config.json}` 저장 및 Grafana 트레이스 구간 매칭용 `runStartedAt`/`runEndedAt` 기록은 새 JS 오케스트레이터에는 아직 없다. 현재는 k6 stdout summary만 출력된다. `scripts/compare-results.js`로 비교하려면 별도로 `k6 run --out json=... `등을 수동으로 붙여 결과를 만들어야 한다.

#### compare-results.js

```bash
# 콘솔 테이블
node tests/load-test/scripts/compare-results.js results/run1 results/run2

# PR용 마크다운 테이블
node tests/load-test/scripts/compare-results.js results/run1 results/run2 --markdown
```

### 시드 데이터

`LargeUserDrawingSeeder`가 배치 단위로 flush/clear하여 메모리 사용량을 줄임.

- 기본: 1,000명 유저 (userKey 1,900,000~)
- 환경변수: `SEED_DRAWING_USER_COUNT`, `SEED_DRAWING_BATCH_SIZE`

### 트레이싱

OpenTelemetry + OpenTelemetry Collector + Tempo 트레이스 수집(`obs` profile). 테스트 중/후에 Grafana UI에서 확인:

```
http://localhost:3100
```

서비스명: `davinci-app-1`
