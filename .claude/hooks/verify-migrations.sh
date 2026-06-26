#!/bin/bash
# PreToolUse(Bash) 게이트 — git commit/push에 server-toss 마이그레이션 변경이 포함되면
# 실제 MySQL(daVinci_toss_migcheck)에 전체 마이그레이션을 처음부터 적용해 본다.
# 실패(예: MySQL 1093 같은 방언 오류)하면 exit 2로 커밋/푸시를 차단한다.
# jest는 MikroORM을 모킹해 raw SQL 오류를 못 잡으므로, 이 훅이 유일한 실DB 검증이다.
# 긴급 우회: SKIP_MIGRATION_CHECK=1

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')

# git commit / git push 가 아니면 무관 — 통과
case "$CMD" in
  *"git commit"* | *"git push"*) ;;
  *) exit 0 ;;
esac

[ "${SKIP_MIGRATION_CHECK:-}" = "1" ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0

# 변경된 마이그레이션 탐지 — staged(commit) + 미푸시 커밋(push)
CHANGED=$(
  {
    git diff --cached --name-only
    git diff --name-only @{u}..HEAD 2>/dev/null
  } | grep -E '^server-toss/src/migrations/.*\.ts$' | sort -u
)
[ -z "$CHANGED" ] && exit 0 # 마이그레이션 무관 커밋/푸시 — 즉시 통과(오버헤드 0)

echo "마이그레이션 변경 감지 → 실 MySQL 검증을 시작합니다." >&2

# MySQL 기동 + healthy 대기
if ! pnpm infra:mysql:up >/dev/null 2>&1; then
  echo "MySQL 기동 실패 — 마이그레이션을 검증할 수 없어 차단합니다. (도커 확인 후 재시도, 긴급 시 SKIP_MIGRATION_CHECK=1)" >&2
  exit 2
fi
for _ in $(seq 1 30); do
  docker exec daVinci-mysql mysqladmin ping -h127.0.0.1 --silent 2>/dev/null && break
  sleep 2
done

# config가 dist/ 엔티티를 require하므로 빌드 필요
if ! pnpm --filter server-toss build >/dev/null 2>&1; then
  echo "server-toss 빌드 실패 — 마이그레이션 검증 불가, 차단합니다." >&2
  exit 2
fi

# 일회용 검증 DB를 매번 비우고(드롭→생성) 전체 마이그레이션을 처음부터 적용한다.
# dev DB(daVinci_toss)는 건드리지 않는다. migration:fresh는 엔티티 메타데이터에 없는
# 테이블(예: daily_user_rankings)을 못 지워 재실행이 깨지므로, 빈 DB + migration:up을 쓴다.
docker exec daVinci-mysql mysql -uroot \
  -e "drop database if exists daVinci_toss_migcheck; create database daVinci_toss_migcheck;" 2>/dev/null

LOG=$(mktemp)
MYSQL_DATABASE=daVinci_toss_migcheck MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 \
  MYSQL_USER=root MYSQL_PASSWORD= NODE_ENV=test \
  pnpm --filter server-toss exec mikro-orm migration:up \
  --config mikro-orm.migration.config.cjs >"$LOG" 2>&1
RESULT=$?

# 검증 DB 이름으로 생성되는 스냅샷 아티팩트는 커밋 대상이 아니므로 정리.
rm -f "$CLAUDE_PROJECT_DIR"/server-toss/src/migrations/.snapshot-daVinci_toss_migcheck.json 2>/dev/null

if [ "$RESULT" -eq 0 ]; then
  rm -f "$LOG"
  echo "마이그레이션 실 MySQL 검증 통과." >&2
  exit 0
else
  echo "── 마이그레이션 검증 실패 (커밋/푸시 차단) ──" >&2
  tail -30 "$LOG" >&2
  rm -f "$LOG"
  echo "── SQL/마이그레이션을 수정해 다시 시도하세요. 긴급 우회: SKIP_MIGRATION_CHECK=1 ──" >&2
  exit 2
fi
