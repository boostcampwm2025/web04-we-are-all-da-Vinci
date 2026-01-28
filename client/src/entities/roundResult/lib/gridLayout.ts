export const PLAYERS_PER_PAGE = 8;
export const CARD_ASPECT_RATIO = 4 / 5;
export const GAP = 8;

export interface GridLayout {
  cols: number;
  rows: number;
}

export interface CardSize {
  width: number;
  height: number;
}

/**
 * 인원에 따라 그리드의 열/행을 결정
 */
export const getGridLayout = (playerCount: number): GridLayout => {
  if (playerCount <= 2) {
    return { cols: Math.max(1, playerCount), rows: 1 };
  }
  if (playerCount <= 4) {
    return { cols: 2, rows: 2 };
  }
  if (playerCount <= 6) {
    return { cols: 3, rows: 2 };
  }
  return { cols: 4, rows: 2 };
};

/**
 * 컨테이너 크기와 그리드 레이아웃을 기반으로 카드 크기 계산
 * 종횡비(4:5)를 유지하면서 최대 크기로 조정
 */
export const calculateCardSize = (
  containerWidth: number,
  containerHeight: number,
  cols: number,
  rows: number,
): CardSize => {

  // 1. 간격을 제외한 사용 가능한 공간 계산
  const availableWidth = containerWidth - GAP * (cols - 1);
  const availableHeight = containerHeight - GAP * (rows - 1);

  // 2. 열/행 기준 최대 카드 크기
  const maxWidthPerCard = availableWidth / cols;
  const maxHeightPerCard = availableHeight / rows;

  // 3. 종횡비를 고려한 크기 계산
  //    - 높이 기준으로 너비 계산
  const widthFromHeight = maxHeightPerCard * CARD_ASPECT_RATIO;
  //    - 너비 기준으로 높이 계산
  const heightFromWidth = maxWidthPerCard / CARD_ASPECT_RATIO;

  // 4. 둘 중 컨테이너에 맞는 크기 선택
  if (widthFromHeight <= maxWidthPerCard) {
    return { width: widthFromHeight, height: maxHeightPerCard };
  }
  return { width: maxWidthPerCard, height: heightFromWidth };
};
