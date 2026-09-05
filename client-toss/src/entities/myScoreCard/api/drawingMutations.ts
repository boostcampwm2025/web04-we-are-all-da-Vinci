import { archiveQueries } from "@/entities/archive";
import { missionQueries } from "@/entities/missionCard";
import { podiumQueries } from "@/entities/podium";
import { rankingQueries } from "@/entities/ranking";
import { serverTossApi } from "@/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Stroke } from "@toss/shared";

/** 그림 제출은 오늘 랭킹(내 순위·TOP100·시상대), 미션 진행도, 아카이브 통계를 바꾼다. */
export const useSubmitDrawing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (strokes: Stroke[]) => serverTossApi.submitDrawing(strokes),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: rankingQueries.all() }),
        queryClient.invalidateQueries({ queryKey: podiumQueries.all() }),
        queryClient.invalidateQueries({ queryKey: missionQueries.all() }),
        queryClient.invalidateQueries({ queryKey: archiveQueries.all() }),
      ]),
  });
};
