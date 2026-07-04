#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOAD_TEST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$LOAD_TEST_DIR/../.." && pwd)"
RESULTS_BASE="$LOAD_TEST_DIR/results"

TAG=""
APP_URL="http://localhost:3000"

log() { echo -e "\033[1;36m[run]\033[0m $(date '+%H:%M:%S') $*"; }
err() { echo -e "\033[1;31m[run]\033[0m $(date '+%H:%M:%S') $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --tag NAME    결과 디렉토리에 태그 추가 (예: after-index-fix)
  -h, --help    도움말
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)  TAG="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) err "알 수 없는 옵션: $1"; exit 1 ;;
  esac
done

# --- 사전 검사 ---
log "사전 검사..."

if ! command -v k6 &>/dev/null; then
  err "k6가 설치되어 있지 않습니다."
  exit 1
fi

TOKENS_FILE="$LOAD_TEST_DIR/fixtures/tokens.json"
if [[ ! -f "$TOKENS_FILE" ]] || [[ ! -s "$TOKENS_FILE" ]]; then
  err "토큰 파일이 없거나 비어있습니다: $TOKENS_FILE"
  err "먼저 prepare-test.sh를 실행하세요."
  exit 1
fi

if ! curl -sf "$APP_URL/health" > /dev/null 2>&1; then
  err "App이 응답하지 않습니다: $APP_URL/health"
  err "먼저 prepare-test.sh를 실행하세요."
  exit 1
fi

# --- 결과 디렉토리 생성 ---
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
if [[ -n "$TAG" ]]; then
  DIR_NAME="${TIMESTAMP}-${TAG}"
else
  DIR_NAME="$TIMESTAMP"
fi
RESULT_DIR="$RESULTS_BASE/$DIR_NAME"
mkdir -p "$RESULT_DIR"

log "결과 저장 경로: $RESULT_DIR"

# --- k6 실행 ---
log "k6 부하 테스트 시작..."
echo

cd "$PROJECT_ROOT"

set +e
K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT="$RESULT_DIR/dashboard.html" \
  k6 run \
  --out "json=$RESULT_DIR/raw-metrics.json.gz" \
  --env "RESULT_DIR=$RESULT_DIR" \
  tests/load-test/k6/baseline.js
K6_EXIT=$?
set -e

echo

# --- latest 심링크 갱신 ---
ln -sfn "$DIR_NAME" "$RESULTS_BASE/latest"

# --- 완료 요약 ---
log "========================================="
log "부하 테스트 완료"
log "========================================="
log "결과 파일:"
ls -lh "$RESULT_DIR/" | tail -n +2 | while read -r line; do
  log "  $line"
done
echo
log "결과 디렉토리: $RESULT_DIR"
log "심링크:        $RESULTS_BASE/latest -> $DIR_NAME"
echo

if [[ -f "$RESULT_DIR/report.html" ]]; then
  log "리포트 열기:   open $RESULT_DIR/report.html"
fi
if [[ -f "$RESULT_DIR/dashboard.html" ]]; then
  log "대시보드 열기: open $RESULT_DIR/dashboard.html"
fi

exit $K6_EXIT
