#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_TEST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$LOAD_TEST_DIR/../.." && pwd)"
COMPOSE_FILE="$LOAD_TEST_DIR/docker/compose.yml"

SKIP_BUILD=false
SKIP_SEED=false
KEEP_DATA=false
APP_URL="http://localhost:3000"
SEED_MULTIPLIER=10

# options.json에서 max VU 수를 읽어 토큰/시드 수 자동 계산
OPTIONS_FILE="$LOAD_TEST_DIR/k6/options.json"
MAX_VUS=$(python3 -c "
import json, sys
with open('$OPTIONS_FILE') as f:
    cfg = json.load(f)
stages = list(cfg['scenarios'].values())[0]['stages']
print(max(s['target'] for s in stages))
" 2>/dev/null || echo "300")

TOKEN_COUNT="$MAX_VUS"
SEED_USER_COUNT=$((MAX_VUS * SEED_MULTIPLIER))

log() { echo -e "\033[1;34m[prepare]\033[0m $(date '+%H:%M:%S') $*"; }
err() { echo -e "\033[1;31m[prepare]\033[0m $(date '+%H:%M:%S') $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --skip-build       Docker 이미지 리빌드 생략
  --skip-seed        DB 시딩 생략
  --keep-data        기존 데이터 유지한 채 시딩 (기본: migration:fresh 후 시딩)
  --token-count N    생성할 토큰 수 (default: options.json의 max VU 수)
  --seed-multiplier N  시드 유저 수 = VU × N (default: 10)
  -h, --help         도움말
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)  SKIP_BUILD=true; shift ;;
    --skip-seed)   SKIP_SEED=true; shift ;;
    --keep-data)   KEEP_DATA=true; shift ;;
    --token-count) TOKEN_COUNT="$2"; shift 2 ;;
    --seed-multiplier) SEED_MULTIPLIER="$2"; SEED_USER_COUNT=$((MAX_VUS * SEED_MULTIPLIER)); shift 2 ;;
    -h|--help)     usage ;;
    *) err "알 수 없는 옵션: $1"; exit 1 ;;
  esac
done

# --- 사전 검사 ---
check_command() {
  if ! command -v "$1" &>/dev/null; then
    err "'$1'이(가) 설치되어 있지 않습니다."
    exit 1
  fi
}

log "사전 검사..."
check_command docker
check_command k6
check_command pnpm

if ! docker compose version &>/dev/null; then
  err "Docker Compose V2 플러그인이 필요합니다."
  exit 1
fi

# --- Docker Compose Up ---
log "Docker Compose 시작..."
BUILD_FLAG=""
if [[ "$SKIP_BUILD" == false ]]; then
  BUILD_FLAG="--build"
fi
docker compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG

# --- MySQL 헬스체크 대기 ---
log "MySQL 헬스체크 대기 (최대 60초)..."
TIMEOUT=60
ELAPSED=0
while [[ $ELAPSED -lt $TIMEOUT ]]; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' davinci-mysql 2>/dev/null || echo "missing")
  if [[ "$STATUS" == "healthy" ]]; then
    log "MySQL ready (${ELAPSED}s)"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  printf "."
done
echo
if [[ $ELAPSED -ge $TIMEOUT ]]; then
  err "MySQL 헬스체크 타임아웃 (${TIMEOUT}s)"
  exit 1
fi

# --- App 헬스체크 대기 ---
log "App 헬스체크 대기 (최대 120초)..."
TIMEOUT=120
ELAPSED=0
while [[ $ELAPSED -lt $TIMEOUT ]]; do
  if curl -sf "$APP_URL/health" > /dev/null 2>&1; then
    log "App ready (${ELAPSED}s)"
    break
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
  printf "."
done
echo
if [[ $ELAPSED -ge $TIMEOUT ]]; then
  err "App 헬스체크 타임아웃 (${TIMEOUT}s)"
  docker compose -f "$COMPOSE_FILE" logs davinci-app-1 --tail=30
  exit 1
fi

# --- DB 시드 ---
if [[ "$SKIP_SEED" == false ]]; then
  cd "$PROJECT_ROOT"

  if [[ "$KEEP_DATA" == false ]]; then
    log "DB 초기화 (migration:fresh)..."
    MYSQL_DATABASE=load_test npx mikro-orm migration:fresh || {
      err "migration:fresh 실패"
      exit 1
    }
    log "DB 초기화 완료"
  else
    log "기존 데이터 유지 (--keep-data)"
  fi

  log "DB 시드 실행 (유저 ${SEED_USER_COUNT}명, 드로잉 $((SEED_USER_COUNT * 2))개)..."
  MYSQL_DATABASE=load_test SEED_DRAWING_USER_COUNT="$SEED_USER_COUNT" pnpm load-test:seed || {
    err "시드 실패"
    exit 1
  }
  log "DB 시드 완료"
else
  log "DB 시드 건너뜀 (--skip-seed)"
fi

# --- 토큰 생성 ---
log "JWT 토큰 ${TOKEN_COUNT}개 생성..."
cd "$PROJECT_ROOT"
MYSQL_DATABASE=load_test pnpm tokens:generate --count "$TOKEN_COUNT"
log "토큰 생성 완료"

# --- 완료 요약 ---
echo
log "========================================="
log "부하 테스트 준비 완료"
log "========================================="
log "컨테이너 상태:"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo
TOKENS_FILE="$LOAD_TEST_DIR/fixtures/tokens.json"
if [[ -f "$TOKENS_FILE" ]]; then
  TOKEN_ACTUAL=$(python3 -c "import json; print(len(json.load(open('$TOKENS_FILE'))))" 2>/dev/null || echo "?")
  log "토큰: ${TOKEN_ACTUAL}개 ($TOKENS_FILE)"
fi
log "VU:     ${MAX_VUS}명 (options.json)"
log "시드:   유저 ${SEED_USER_COUNT}명 / 드로잉 $((SEED_USER_COUNT * 2))개 (×${SEED_MULTIPLIER})"
log "토큰:   ${TOKEN_COUNT}개"
log "App:    $APP_URL"
log "Jaeger: http://localhost:16686"
log ""
log "다음 단계: bash $SCRIPT_DIR/run-test.sh"
