#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_input.filePath' < /dev/stdin)

# 파일 경로가 없거나 테스트 파일 자체면 스킵
if [ -z "$FILE" ] || [ "$FILE" = "null" ]; then
  exit 0
fi

# 테스트/설정 파일은 스킵
if echo "$FILE" | grep -qE '\.(spec|test)\.(ts|tsx)$|\.config\.|\.json$|\.md$|\.css$|\.html$'; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 워크스페이스 판별 (-toss 변형을 먼저 검사: server/src·client/src 부분일치 회피)
# jest 계열(server, server-toss) → 인접 .spec.ts
# vitest 계열(client, client-toss) → 인접 .test.ts(x)
run_jest() {
  local filter="$1"
  local TEST_FILE
  TEST_FILE=$(echo "$FILE" | sed 's/\.ts$/.spec.ts/')
  if [ -f "$TEST_FILE" ]; then
    echo "관련 테스트 실행: $TEST_FILE"
    # pnpm --filter는 워크스페이스 디렉터리에서 실행되므로 워크스페이스 상대경로를 넘긴다
    pnpm --filter "$filter" exec jest --passWithNoTests "${TEST_FILE#"$filter"/}" 2>&1 | tail -15
    exit 0
  fi
}

run_vitest() {
  local filter="$1"
  local BASE="${FILE%.*}"
  for TF in "${BASE}.test.ts" "${BASE}.test.tsx"; do
    if [ -f "$TF" ]; then
      echo "관련 테스트 실행: $TF"
      # pnpm --filter는 워크스페이스 디렉터리에서 실행되므로 워크스페이스 상대경로를 넘긴다
      pnpm --filter "$filter" exec vitest run "${TF#"$filter"/}" 2>&1 | tail -15
      exit 0
    fi
  done
}

if echo "$FILE" | grep -q 'server-toss/src/'; then
  run_jest server-toss
elif echo "$FILE" | grep -q 'client-toss/src/'; then
  run_vitest client-toss
elif echo "$FILE" | grep -q 'server/src/'; then
  run_jest server
elif echo "$FILE" | grep -q 'client/src/'; then
  run_vitest client
fi

exit 0
