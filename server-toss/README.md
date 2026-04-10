## 로컬 환경 설정

> [!INFO]
> 이 프로젝트는 pnpm과 MySQL을 사용합니다.

**MySQL이 없는 경우**

1. 프로젝트 루트로 이동합니다.
2. `pnpm infra:mysql:up` 명령으로 MySQL을 실행합니다.
3. `pnpm dev:server-toss`로 서버를 실행합니다.

**MySQL이 이미 실행 중인 경우**

1. `cp server-toss/.env.example .env`로 `server-toss/.env` 파일을 생성합니다.
2. 실행 중인 MySQL 설정에 맞게 값을 바꿉니다.
3. 프로젝트 루트에서 `pnpm dev:server-toss` 명령으로 서버를 실행합니다.
