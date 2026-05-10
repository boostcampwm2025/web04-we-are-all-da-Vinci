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
  - `SEED_DRAWING_USER_COUNT=1000`
  - `SEED_DRAWING_BATCH_SIZE=200`

```sh
# 기본 1,000명
pnpm -F server-toss seed:drawing:large
```
