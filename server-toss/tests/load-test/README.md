## Load Test

### 테스트 환경 (Docker)

| 서비스       | 스펙                 | 포트                    |
| ------------ | -------------------- | ----------------------- |
| App (NestJS) | 1 vCPU, 1GB, Node 22 | 3000                    |
| MySQL 8.4    | 1 vCPU, 1GB          | 3306                    |
| Jaeger       | all-in-one           | 16686 (UI), 4318 (OTLP) |

> 컨테이너로 실행하는 이유: CPU/Memory 자원 제한을 두기 위함.

### 준비물

- Docker (Compose V2)
- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- pnpm
- `docker/env/.env` 파일 (DB 접속 정보, JWT_SECRET 등)

### Quick Start

```bash
# 1. 전체 준비 (Docker up + 시드 + 토큰 생성)
pnpm load-test:prepare

# 2. 부하 테스트 실행
pnpm load-test:run

# 3. 결과 확인
open tests/load-test/results/latest/report.html      # 커스텀 리포트
open tests/load-test/results/latest/dashboard.html    # k6 대시보드
```

### 스크립트 상세

#### prepare-test.sh

Docker 컨테이너 기동 → 헬스체크 대기 → DB 시드 → JWT 토큰 생성을 자동화.

```bash
bash tests/load-test/scripts/prepare-test.sh [OPTIONS]

Options:
  --skip-build       Docker 이미지 리빌드 생략
  --skip-seed        DB 시딩 생략 (이미 데이터가 있을 때)
  --token-count N    생성할 토큰 수 (default: 100)
```

#### run-test.sh

k6 실행 + 타임스탬프 디렉토리에 결과 저장.

```bash
bash tests/load-test/scripts/run-test.sh [OPTIONS]

Options:
  --tag NAME    결과 디렉토리에 태그 추가 (예: --tag after-index-fix)
```

결과 디렉토리 구조:

```
results/YYYYMMDD-HHMMSS[-tag]/
  summary.json          # 구조화 메트릭 (비교 스크립트용)
  report.html           # Chart.js 커스텀 리포트
  dashboard.html        # k6 Web Dashboard (인터랙티브)
  raw-metrics.json.gz   # 원시 데이터
```

#### compare-results.js

두 실행 결과를 비교하는 스크립트.

```bash
# 콘솔 테이블
node tests/load-test/scripts/compare-results.js results/run1 results/run2

# PR용 마크다운 테이블
node tests/load-test/scripts/compare-results.js results/run1 results/run2 --markdown
```

### npm scripts

| 명령어                       | 설명                             |
| ---------------------------- | -------------------------------- |
| `pnpm load-test:prepare`     | 전체 준비 (Docker + 시드 + 토큰) |
| `pnpm load-test:run`         | k6 실행 + 결과 저장              |
| `pnpm load-test:compare`     | 결과 비교                        |
| `pnpm load-test:clean`       | Docker 컨테이너 + 볼륨 제거      |
| `pnpm load-test:docker:run`  | Docker Compose up (수동)         |
| `pnpm load-test:docker:stop` | Docker Compose down (수동)       |
| `pnpm load-test:docker:logs` | 컨테이너 로그                    |
| `pnpm load-test:seed`        | DB 시드 (수동)                   |
| `pnpm load-test:k6:run`      | k6 실행 (수동, 결과 저장 없음)   |
| `pnpm tokens:generate`       | JWT 토큰 생성 (수동)             |

### 시드 데이터

`LargeUserDrawingSeeder`가 배치 단위로 flush/clear하여 메모리 사용량을 줄임.

- 기본: 1,000명 유저 (userKey 1,900,000~)
- 환경변수: `SEED_DRAWING_USER_COUNT`, `SEED_DRAWING_BATCH_SIZE`

### 트레이싱

OpenTelemetry + Jaeger로 트레이스 수집. 테스트 중/후에 Jaeger UI에서 확인:

```
http://localhost:16686
```

서비스명: `davinci-app-1`
