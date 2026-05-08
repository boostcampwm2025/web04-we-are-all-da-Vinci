## Load Test Environment

### App Server

- 2 vCPU
- 2GB Memory
- Node.js 22
- Docker container

### Database

- MySQL 8
- 2 vCPU
- 1GB Memory

## 대량 시드 (부하 테스트용)

- `LargeUserDrawingSeeder`는 배치 단위로 flush/clear 하도록 구성되어 메모리 사용량을 줄입니다.
- 기본값:
  - `SEED_DRAWING_USER_COUNT=5000`
  - `SEED_DRAWING_BATCH_SIZE=300`

```sh
# 기본 5,000명
pnpm -F server-toss seed:drawing:large

# 10,000명 / 20,000명
pnpm -F server-toss seed:drawing:large:10k
pnpm -F server-toss seed:drawing:large:20k

# 배치 크기 직접 지정
SEED_DRAWING_USER_COUNT=10000 SEED_DRAWING_BATCH_SIZE=200 pnpm -F server-toss seed:drawing:large
```
