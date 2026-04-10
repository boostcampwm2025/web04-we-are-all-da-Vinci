#!/bin/bash
COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

# git commit 명령은 허용 (메시지 안 텍스트 오탐 방지)
if echo "$COMMAND" | grep -qE '^\s*git\s+commit\b'; then
  exit 0
fi

# 위험한 명령 패턴 차단
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+/|rm\s+-rf\s+\.|git\s+push\s+--force|git\s+push\s+-f\b|git\s+reset\s+--hard|git\s+checkout\s+--\s+\.|git\s+clean\s+-f|DROP\s+TABLE|DROP\s+DATABASE|truncate\s+table'; then
  echo "BLOCK: 위험한 명령이 감지되었습니다. 더 안전한 대안을 사용하세요." >&2
  exit 2
fi

# force push to main/master 차단
if echo "$COMMAND" | grep -qE 'git\s+push.*--force.*\b(main|master)\b|git\s+push.*-f.*\b(main|master)\b'; then
  echo "BLOCK: main/master 브랜치에 force push는 금지됩니다." >&2
  exit 2
fi

exit 0
