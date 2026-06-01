import { TossUserResponse } from "src/external/toss/common/toss-api.types";

export type UserInfo = NonNullable<TossUserResponse["success"]>;
