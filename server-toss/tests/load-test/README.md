## Load Test Environment

### App Server

- 1 vCPU
- 1GB Memory
- Node.js 22

### Database

- MySQL 8
- 1 vCPU
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

## 부하 테스트 가이드

> 도커 컨테이너로 하는 이유는 컨테이너 실행 시 cpu, memory 자원 제한을 두기 위함입니다.

> 컨테이너를 사용하지 않는다면, 컨테이너 빌드/시작 대신에 바로 서버를 실행하면 됩니다.

- [ ] 준비물: `k6`, `Docker`, `.env`
- [ ] 도커 컴포즈 실행 (`pnpm load-test:docker:run`)
- [ ] 시드 데이터 생성 (`MYSQL_DATABASE=load_test pnpm seed:drawing:large &&MYSQL_DATABASE=load_test pnpm seed:ranking`)
- [ ] JWT 토큰 생성 (`MYSQL_DATABASE=load_test pnpm tokens:generate --count 100`)
- [ ] 테스트 실행 (`k6 run tests/load-test/k6/baseline.js`)
