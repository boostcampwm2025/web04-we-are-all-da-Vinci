## Load Test

### 테스트 환경 (Docker)

| 서비스                  | 스펙                 | 포트           |
| ----------------------- | -------------------- | -------------- |
| App (NestJS)            | 1 vCPU, 1GB, Node 22 | 3000           |
| MySQL 8.4               | 1 vCPU, 2GB          | 3306           |
| OpenTelemetry Collector | 640MB                | 4318(receiver) |
| Tempo                   | 640MB                | 4317(receiver) |
| Grafana                 | 1GB                  | 3100           |

# Load Test

NestJS 서버를 실제 서비스 환경과 유사한 조건에서 부하 테스트하기 위한 환경입니다.

`pnpm load-test` 한 번으로

- Docker 환경 구성
- DB Migration
- Seed Data 생성
- JWT Token 생성
- Application 실행
- k6 Warmup / Main Test
- 결과 저장
- (선택) OpenTelemetry Trace 수집

까지 모두 자동으로 수행합니다.

---

# Quick Start

## 준비

필요한 프로그램

- Docker Desktop
- pnpm
- k6

환경변수

```
tests/load-test/docker/env/.env
```

을 준비합니다.

---

## 실행

기본 설정

```bash
pnpm load-test
```

다른 설정 사용

```bash
pnpm load-test staging.yaml
```

실행이 끝나면 결과는

```
tests/load-test/results/<runId>/
```

에 저장됩니다.

---

# 실행 순서

```text
Load Config
      │
      ▼
MySQL
      │
      ▼
Migration
      │
      ▼
Seed Data
      │
      ▼
Generate Tokens
      │
      ▼
(Optional)
OpenTelemetry
      │
      ▼
Application
      │
      ▼
Warmup
      │
      ▼
Main Test
      │
      ▼
Save Result
      │
      ▼
docker compose down
```

모든 Stage는 실행 시간을 기록하며,

중간에 실패하면 즉시 종료한 뒤 Docker 리소스를 정리합니다.

---

# 디렉토리 구조

```
tests/load-test
├── configs/          # 실행 설정
├── docker/           # Docker Compose
├── fixtures/         # 생성된 토큰
├── k6/               # 테스트 시나리오
├── results/          # 실행 결과
└── scripts/          # JS 오케스트레이터
```

---

# Config

모든 테스트 조건은

```
configs/*.yaml
```

에서 관리합니다.

예시

```yaml
database:
  migrate: true
  seed: 1000

tokens:
  count: 1000

warmup:
  enabled: true
  vus: 5
  duration: 30s

main:
  vus: 100
  duration: 5m

docker:
  profiles:
    - obs
```

설정을 변경하면 코드를 수정하지 않고

- Seed 수
- Token 수
- VU
- Duration
- Docker Profile

등을 바꿀 수 있습니다.

---

# 결과

매 실행마다

```
results/<runId>/
```

가 생성됩니다.

```
config.yaml
metadata.json
summary.json
report.html
stdout.log
stderr.log
```

| 파일          | 설명                 |
| ------------- | -------------------- |
| config.yaml   | 실행에 사용한 설정   |
| metadata.json | Stage 시간, runId 등 |
| summary.json  | k6 원본 결과         |
| report.html   | HTML Report          |
| stdout.log    | k6 출력              |
| stderr.log    | 에러 로그            |

---

# Trace 분석

Config에

```yaml
docker:
  profiles:
    - obs
```

를 추가하면

- OpenTelemetry Collector
- Tempo
- Grafana

가 함께 실행됩니다.

Grafana

```
http://localhost:3100
```

서비스

```
davinci-app-1
```

실행마다

```
run.id=<runId>
```

를 Resource Attribute에 넣어 보내므로

Grafana Explore에서 해당 실행의 Trace만 조회할 수 있습니다.

---

# 새로운 Scenario 추가

1.

```
k6/<name>.js
```

생성

2.

```
configs/*.yaml
```

에서

```yaml
main:
  scenario: "<name>"
```

설정

3.

실행

```
pnpm load-test
```

---

# 결과 비교

두 실행 결과 비교

```bash
pnpm load-test:compare results/run1 results/run2
```

Markdown 출력

```bash
pnpm load-test:compare results/run1 results/run2 --markdown
```

---

# 자주 수정하는 위치

| 하고 싶은 작업   | 수정할 파일        |
| ---------------- | ------------------ |
| VU 변경          | configs/\*.yaml    |
| Duration 변경    | configs/\*.yaml    |
| Seed 개수 변경   | configs/\*.yaml    |
| Scenario 추가    | k6/\*.js           |
| Docker 자원 변경 | docker/compose.yml |
| 실행 순서 변경   | scripts/runner.js  |
| 결과 저장 변경   | scripts/result.js  |

---

# 내부 구조

실행 파이프라인은 JS 오케스트레이터가 담당합니다.

```
Runner
├── Compose
├── K6Runner
├── Result
├── ConfigHelper
└── Process
```

각 컴포넌트는 하나의 책임만 가지도록 분리되어 있으며,

새로운 Stage를 추가하거나 실행 방식을 변경할 때는 `Runner`만 수정하면 됩니다.
