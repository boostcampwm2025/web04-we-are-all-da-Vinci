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

# server 소스 → .spec.ts 찾기
if echo "$FILE" | grep -q 'server/src/'; then
  TEST_FILE=$(echo "$FILE" | sed 's/\.ts$/.spec.ts/')
  if [ -f "$TEST_FILE" ]; then
    echo "관련 테스트 실행: $TEST_FILE"
    pnpm --filter server exec jest --passWithNoTests "$TEST_FILE" 2>&1 | tail -15
    exit 0
  fi
fi

# client 소스 → .test.ts(x) 찾기
if echo "$FILE" | grep -q 'client/src/'; then
  BASE="${FILE%.*}"
  TEST_FILE_TS="${BASE}.test.ts"
  TEST_FILE_TSX="${BASE}.test.tsx"
  for TF in "$TEST_FILE_TS" "$TEST_FILE_TSX"; do
    if [ -f "$TF" ]; then
      echo "관련 테스트 실행: $TF"
      pnpm --filter client exec vitest run "$TF" 2>&1 | tail -15
      exit 0
    fi
  done
fi

exit 0
