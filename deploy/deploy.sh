#! /bin/bash

# blue port 사용 중인지 확인
EXISTS_BLUE=$(docker ps --filter "name=daVinci-blue-server" --format "{{.Ports}}" | grep 3000)

# 사용 중이지 않으면 blue port로 실행
if [ -z "$EXISTS_BLUE" ]; then
	echo "Blue 실행"
  OLD_SERVER="daVinci-green-server"
  OLD_PORT=3001
  OLD_SERVICE="green"
  SERVER="daVinci-blue-server"
  PORT=3000
  SERVICE="blue"
else
	# 사용 중이면 green port 사용 중인지 확인
	EXISTS_GREEN=$(docker ps --filter "name=daVinci-green-server" --format "{{.Ports}}" | grep 3001)
	if [ -n "$EXISTS_GREEN" ]; then
		echo "3000, 3001 포트 모두 사용 중입니다."
		exit 1
	else
		echo "Green 실행"
		OLD_SERVER="daVinci-blue-server"
		OLD_PORT=3000
    OLD_SERVICE="blue"
		SERVER="daVinci-green-server"
		PORT=3001
		SERVICE="green"
	fi
fi

echo "OLD_SERVER: $OLD_SERVER"
echo "OLD_PORT: $OLD_PORT"
echo "SERVER: $SERVER"
echo "PORT: $PORT"
echo "SERVICE: $SERVICE"

# 새로 만든 도커 이미지 실행 (Blue 포트와 다른 포트로 실행)
docker compose -f compose.blue-green.yml up -d --build "$SERVICE" 

# 헬스 체크 5회
MAX_ATTEMPTS=5
SLEEP_TIME=5

DEPLOY_SUCCESS=false

echo "헬스체크 시작 (대상: $SERVER)"

for ((i=1; i<=MAX_ATTEMPTS; i++)); do
	echo "Attempt $i/$MAX_ATTEMPTS"
	
	IS_HEALTHY=$(docker ps --filter "name=$SERVER" --format "{{.Status}}" | grep healthy)
	if [ -n "$IS_HEALTHY" ]; then
		echo "Service is healthy"
		DEPLOY_SUCCESS=true
		break
	else 
		echo "Service is not healthy"
	fi
	
	if [ $i -lt $MAX_ATTEMPTS ]; then
		sleep $SLEEP_TIME
	fi
done


if [ "$DEPLOY_SUCCESS" = false ]; then
    echo "지정된 횟수 내에 컨테이너가 정상 상태가 되지 않았습니다."
    # TODO: 실패 시 이전 컨테이너 유지, 방금 띄운 컨테이너 종료 등 롤백/중단 로직
    echo "컨테이너를 종료합니다."
    docker compose -f compose.blue-green.yml down "$SERVICE"
    exit 1
fi

echo "배포된 컨테이너가 정상 작동 중입니다."

echo "set \$service_url http://localhost:$PORT;" > /etc/nginx/conf.d/service_url.inc
nginx -t
service nginx reload

docker compose -f compose.blue-green.yml down "$OLD_SERVICE"
