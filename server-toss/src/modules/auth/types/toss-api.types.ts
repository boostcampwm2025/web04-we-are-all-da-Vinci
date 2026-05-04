interface TossBaseResponse {
  resultType: "SUCCESS" | "FAIL";
  error?: {
    errorCode: string;
    reason: string;
  };
}

export interface TossTokenResponse extends TossBaseResponse {
  success?: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  };
}

export interface TossUserResponse extends TossBaseResponse {
  success?: {
    userKey: number;
    scope: string;
    agreedTerms: string[];
    name?: string;
    phone?: string;
    birthday?: string;
    ci?: string;
    di?: null;
    gender?: string;
    nationality?: string;
    email?: string | null;
  };
}

export type TossUserInfo = NonNullable<TossUserResponse["success"]>;

export interface TossPromotionKeyResponse extends TossBaseResponse {
  success?: { key: string };
}

export interface TossPromotionExecuteResponse extends TossBaseResponse {
  success?: { key: string };
}
