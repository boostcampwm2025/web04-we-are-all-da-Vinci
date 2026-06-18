#!/bin/bash
COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

# 위험 명령 패턴
# rm은 'r'(재귀) 플래그를 포함하고 대상이 /, ., ~, * 일 때만 차단한다.
# (node_modules·dist 같은 상대 경로 정리는 막지 않으려는 의도적 트레이드오프)
DANGER='rm\s+-[a-z]*r[a-z]*\s+(/|\.|~|\*)|git\s+push\s+--force|git\s+push\s+-f\b|git\s+reset\s+--hard|git\s+checkout\s+--\s+\.|git\s+clean\s+-f|DROP\s+TABLE|DROP\s+DATABASE|truncate\s+table'

# 복합 명령(&&, ||, ;, |, 개행)을 구간별로 분해해 각각 독립 검사한다.
# 이렇게 해야 "git commit -m x && git push --force"처럼 commit 뒤에
# 위험 명령을 이어 붙여 가드를 우회하던 문제를 막을 수 있다.
SEGMENTED="${COMMAND//&&/$'\n'}"
SEGMENTED="${SEGMENTED//||/$'\n'}"
SEGMENTED="${SEGMENTED//;/$'\n'}"
SEGMENTED="${SEGMENTED//|/$'\n'}"

# here-string은 서브셸을 만들지 않으므로 루프 안의 exit이 스크립트를 종료한다.
while IFS= read -r SEG; do
  # 앞뒤 공백 제거
  SEG="${SEG#"${SEG%%[![:space:]]*}"}"
  SEG="${SEG%"${SEG##*[![:space:]]}"}"
  [ -z "$SEG" ] && continue

  # git commit 구간은 허용 (커밋 메시지 안 텍스트 오탐 방지)
  if printf '%s' "$SEG" | grep -qE '^git\s+commit\b'; then
    continue
  fi

  if printf '%s' "$SEG" | grep -qiE "$DANGER"; then
    echo "BLOCK: 위험한 명령이 감지되었습니다. 더 안전한 대안을 사용하세요. (구간: $SEG)" >&2
    exit 2
  fi
done <<< "$SEGMENTED"

exit 0
