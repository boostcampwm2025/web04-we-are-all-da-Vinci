#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="compose.blue-green.yml"

log() { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

error() {
  log "ERROR: $*"
  return 1;
}

abort() {
  log "ERROR: $*"
  exit 1
}

# 서비스 컨테이너 ID (없으면 빈 문자열)
cid_of() {
  docker compose -f "$COMPOSE_FILE" ps -q "$1" 2>/dev/null || true
}

# 컨테이너 Health 상태 반환: healthy | unhealthy | starting | (none)
health_of_cid() {
  local cid="$1"
  # Healthcheck가 없으면 .State.Health 자체가 없어서 에러날 수 있음 -> none 처리
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo "none"
}

log "배포를 시작합니다."

# 현재 blue가 떠 있으면 green 배포, 아니면 blue 배포
BLUE_CID="$(cid_of blue)"
GREEN_CID="$(cid_of green)"

if [[ -z "$BLUE_CID" ]]; then
  log "현재 blue가 없음 -> blue로 배포합니다."
  OLD_SERVICE="green"
  OLD_PORT=3001
  SERVICE="blue"
  PORT=3000
else
  if [[ -n "$GREEN_CID" ]]; then
    abort "blue/green이 모두 떠 있습니다. (blue CID=$BLUE_CID, green CID=$GREEN_CID)"
  fi
  log "현재 blue가 떠 있음 -> green으로 배포합니다."
  OLD_SERVICE="blue"
  OLD_PORT=3000
  SERVICE="green"
  PORT=3001
fi

log "OLD_SERVICE=$OLD_SERVICE (port=$OLD_PORT)"
log "NEW_SERVICE=$SERVICE (port=$PORT)"

log "새 컨테이너 빌드 및 기동: $SERVICE"
docker compose -f "$COMPOSE_FILE" up -d --build "$SERVICE"

NEW_CID="$(cid_of "$SERVICE")"
[[ -n "$NEW_CID" ]] || abort "새 서비스 컨테이너 CID를 얻지 못했습니다. service=$SERVICE"

# 헬스 체크
MAX_ATTEMPTS=5
SLEEP_TIME=5

log "헬스체크 시작 (service=$SERVICE, cid=$NEW_CID)"
DEPLOY_SUCCESS=false

for ((i=1; i<=MAX_ATTEMPTS; i++)); do
  status="$(health_of_cid "$NEW_CID")"
  log "Attempt $i/$MAX_ATTEMPTS - health=$status"

  if [[ "$status" == "healthy" ]]; then
    DEPLOY_SUCCESS=true
    break
  fi

  if [[ $i -lt $MAX_ATTEMPTS ]]; then
    sleep "$SLEEP_TIME"
  fi
done

if [[ "$DEPLOY_SUCCESS" != "true" ]]; then
  log "지정된 횟수 내에 컨테이너가 healthy가 되지 않았습니다. 롤백합니다."
  log "새 서비스 중지/삭제: $SERVICE"
  docker compose -f "$COMPOSE_FILE" stop "$SERVICE" || true
  docker compose -f "$COMPOSE_FILE" rm -f "$SERVICE" || true
  exit 1
fi

log "새 컨테이너가 정상(healthy) 상태입니다."

# nginx 전환 + post-check: 실패하면 nginx 원복 + 새 서비스 내리고 종료
{
  # 1) 트래픽 전환
  echo "set \$service_url http://127.0.0.1:$PORT;" | sudo -n tee /etc/nginx/conf.d/service_url.inc > /dev/null

  log "nginx 설정 테스트"
  sudo -n nginx -t

  log "nginx reload"
  sudo -n systemctl reload nginx

  # 2) POST-CHECK (nginx 경유 health 확인)
  HEALTH_URL="http://127.0.0.1/health"

  POST_MAX_ATTEMPTS=5
  POST_SLEEP_TIME=5

  log "post-check 시작: nginx 경유 health 확인 ($HEALTH_URL)"
  POST_OK=false

  for ((j=1; j<=POST_MAX_ATTEMPTS; j++)); do
    # -f: 4xx/5xx면 실패 처리
    # --max-time: hung 방지
    if curl -fsS --max-time 2 "$HEALTH_URL" > /dev/null; then
      POST_OK=true
      log "post-check 성공 (attempt $j/$POST_MAX_ATTEMPTS)"
      break
    fi
    log "post-check 실패 (attempt $j/$POST_MAX_ATTEMPTS) - 재시도"
    sleep "$POST_SLEEP_TIME"
  done

  if [[ "$POST_OK" != "true" ]]; then
    error "post-check 실패: nginx 경유 health가 정상 응답하지 않습니다."
  fi

} || {
  log "nginx 전환 또는 post-check 실패. 롤백 수행"

  # nginx 복구 (OLD로 되돌리기)
  log "nginx 트래픽 복구: $OLD_SERVICE (port=$OLD_PORT)"
  echo "set \$service_url http://127.0.0.1:$OLD_PORT;" | sudo -n tee /etc/nginx/conf.d/service_url.inc > /dev/null
  sudo -n nginx -t || true
  sudo -n systemctl reload nginx || true

  # 새 서비스 종료/삭제
  log "새 서비스 중지/삭제: $SERVICE"
  docker compose -f "$COMPOSE_FILE" stop "$SERVICE" || true
  docker compose -f "$COMPOSE_FILE" rm -f "$SERVICE" || true

  exit 1
}

log "전환 성공. OLD 서비스 종료: $OLD_SERVICE"
docker compose -f "$COMPOSE_FILE" stop "$OLD_SERVICE" || true
docker compose -f "$COMPOSE_FILE" rm -f "$OLD_SERVICE" || true

log "배포 완료."