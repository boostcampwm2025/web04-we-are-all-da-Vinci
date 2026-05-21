#!/usr/bin/env bash
# 샌드박스에서 "당일 첫 플레이" 상태를 모의 구성하는 리셋 스크립트.
# play_chances.last_reset_at을 과거로 돌려 오늘 무료 플레이가 가능한 상태로 만든다.
# (클라이언트 localStorage는 WebView 내부라 직접 못 건드리므로 안내만 출력한다.)
set -euo pipefail

MYSQL_CONTAINER="${MYSQL_CONTAINER:-daVinci-mysql}"
MYSQL_DATABASE="${MYSQL_DATABASE:-daVinci_toss}"
PAST_DATE="2000-01-01 00:00:00"

mysql_exec() {
  docker exec -i "$MYSQL_CONTAINER" mysql -uroot "$MYSQL_DATABASE" "$@"
}

if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
  echo "❌ MySQL 컨테이너 '$MYSQL_CONTAINER'가 실행 중이 아니에요."
  echo "   먼저 실행하세요: pnpm infra:mysql:up"
  exit 1
fi

# pnpm은 `pnpm chance:reset -- 3` 형태에서 `--`를 스크립트로 그대로 넘기므로 제거한다.
if [[ "${1:-}" == "--" ]]; then shift; fi

USER_KEY="${1:-}"
CHARGED_COUNT="${2:-0}"

if [[ -z "$USER_KEY" ]]; then
  echo "최근 유저 10명:"
  mysql_exec -e "SELECT * FROM users ORDER BY user_key DESC LIMIT 10;"
  echo
  echo "사용법: pnpm chance:reset -- <user_key> [charged_count]"
  echo "  예) pnpm chance:reset -- 3      # user_key=3, 충전분 0으로 리셋"
  echo "  예) pnpm chance:reset -- 3 4    # user_key=3, 충전분 4로 리셋 (이월 시나리오)"
  exit 0
fi

if ! [[ "$USER_KEY" =~ ^[0-9]+$ ]]; then
  echo "❌ user_key는 숫자여야 해요: '$USER_KEY'"
  exit 1
fi
if ! [[ "$CHARGED_COUNT" =~ ^[0-9]+$ ]]; then
  echo "❌ charged_count는 숫자여야 해요: '$CHARGED_COUNT'"
  exit 1
fi

USER_EXISTS=$(mysql_exec -N -s -e "SELECT COUNT(*) FROM users WHERE user_key = $USER_KEY;")
if [[ "$USER_EXISTS" -eq 0 ]]; then
  echo "❌ user_key=$USER_KEY 인 유저가 없어요."
  echo "   인자 없이 실행하면 유저 목록을 볼 수 있어요: pnpm chance:reset"
  exit 1
fi

echo "── 리셋 전 play_chances (user_key=$USER_KEY) ──"
mysql_exec -e "SELECT * FROM play_chances WHERE user_key = $USER_KEY;"

mysql_exec -e "INSERT INTO play_chances (user_key, \`count\`, last_reset_at)
VALUES ($USER_KEY, $CHARGED_COUNT, '$PAST_DATE')
ON DUPLICATE KEY UPDATE \`count\` = $CHARGED_COUNT, last_reset_at = '$PAST_DATE';"

echo "── 리셋 후 play_chances ──"
mysql_exec -e "SELECT * FROM play_chances WHERE user_key = $USER_KEY;"

cat <<'GUIDE'

✅ 서버 리셋 완료 — 오늘 무료 플레이가 가능한 상태예요.

다음으로 클라이언트 localStorage도 정리해야 자동 시작이 발동해요.
샌드박스 WebView 웹 인스펙터(콘솔)에 아래 한 줄을 붙여넣고 미니앱을 새로고침하세요:

  Object.keys(localStorage).filter(k=>k.startsWith('lastPlayed')).forEach(k=>localStorage.removeItem(k))
GUIDE
