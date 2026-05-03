export const TOSS_API_ENDPOINTS = {
  GENERATE_TOKEN: "/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
  LOGIN_ME: "/api-partner/v1/apps-in-toss/user/oauth2/login-me",
  REMOVE_BY_USER_KEY:
    "/api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-user-key",
  PROMOTION_GET_KEY:
    "/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key",
  EXECUTE_PROMOTION:
    "/api-partner/v1/apps-in-toss/promotion/execute-promotion",
} as const;
