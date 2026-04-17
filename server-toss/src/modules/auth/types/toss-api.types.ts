export interface TossTokenResponse {
  resultType: "SUCCESS" | "FAIL";
  success?: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  };
  error?: {
    errorCode: string;
    reason: string;
  };
}

export interface TossUserResponse {
  resultType: "SUCCESS" | "FAIL";
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
  error?: {
    errorCode: string;
    reason: string;
  };
}

export type TossUserInfo = NonNullable<TossUserResponse["success"]>;
