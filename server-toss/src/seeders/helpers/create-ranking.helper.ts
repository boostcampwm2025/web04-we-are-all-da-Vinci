import { EntityData } from "@mikro-orm/core";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { Ranking } from "src/modules/ranking/ranking.entity";

const compareDrawings = (left: Drawing, right: Drawing) => {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  const createdAtDiff = left.createdAt.getTime() - right.createdAt.getTime();
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  if (left.id === right.id) {
    return 0;
  }

  return left.id < right.id ? -1 : 1;
};

const groupDrawingsByUser = (drawings: Drawing[]) => {
  const grouped = new Map<number, Drawing[]>();

  for (const drawing of drawings) {
    const drawingsByUser = grouped.get(drawing.user.userKey);

    if (drawingsByUser) {
      drawingsByUser.push(drawing);
      continue;
    }

    grouped.set(drawing.user.userKey, [drawing]);
  }

  return grouped;
};

const pickBestDrawingByUser = (drawings: Drawing[]) => {
  const grouped = groupDrawingsByUser(drawings);
  const bestByUser = new Map<number, Drawing>();

  for (const [userKey, userDrawings] of grouped.entries()) {
    const [best] = [...userDrawings].sort(compareDrawings);
    bestByUser.set(userKey, best);
  }

  return bestByUser;
};

export const createRanking = (drawings: Drawing[]) => {
  const bestByUser = pickBestDrawingByUser(drawings);

  return [...bestByUser.values()].map<EntityData<Ranking>>((drawing) => ({
    name: drawing.user.name,
    strokes: drawing.strokes,
    score: drawing.score,
    userKey: drawing.user.userKey,
    drawingId: drawing.id,
    submittedAt: drawing.createdAt,
  }));
};
