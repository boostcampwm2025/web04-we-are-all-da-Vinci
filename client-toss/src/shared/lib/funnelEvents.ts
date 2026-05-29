export const FUNNEL_EVENTS = {
  attributionFirstTouch: "attribution_first_touch",
  pageView: "page_view",

  loginButtonClick: "login_button_click",

  playStartAttempt: "play_start_attempt",
  playStartSuccess: "play_start_success",
  playStartFailed: "play_start_failed",

  memorizeView: "memorize_view",
  drawingView: "drawing_view",
  drawingFirstStroke: "drawing_first_stroke",

  submittedView: "submitted_view",
  submittedSubmitClick: "submitted_submit_click",
  submittedSubmitSuccess: "submitted_submit_success",
  submittedSubmitFailed: "submitted_submit_failed",

  rankingView: "ranking_view",
  rankingDetailView: "ranking_detail_view",
  rankingItemClick: "ranking_item_click",

  questView: "quest_view",

  shareScoreSelected: "share_score_selected",
  shareInviteSelected: "share_invite_selected",
  shareInviteFailed: "share_invite_failed",
  shareInviteRewardSuccess: "share_invite_reward_success",
  shareInviteRewardFailed: "share_invite_reward_failed",

  adRewardAttempt: "ad_reward_attempt",
  adRewardSuccess: "ad_reward_success",
  adRewardFailed: "ad_reward_failed",
  bannerAdImpression: "banner_ad_impression",
} as const;

export type FunnelEventName =
  (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];
