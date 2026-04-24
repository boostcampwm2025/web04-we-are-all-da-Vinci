import { BadRequestException } from "@nestjs/common";

export const parseUserIdHeader = (
  userIdHeader: string | string[] | undefined,
) => {
  const headerValue = Array.isArray(userIdHeader)
    ? userIdHeader[0]
    : userIdHeader;
  const normalizedHeader = headerValue?.trim();

  if (!normalizedHeader || !/^\d+$/.test(normalizedHeader)) {
    throw new BadRequestException("X-User-Id 헤더는 숫자 문자열이어야 합니다.");
  }

  return BigInt(normalizedHeader);
};

export const parseOptionalUserIdHeader = (
  userIdHeader: string | string[] | undefined,
) => {
  const headerValue = Array.isArray(userIdHeader)
    ? userIdHeader[0]
    : userIdHeader;

  if (headerValue === undefined) {
    return undefined;
  }

  return parseUserIdHeader(userIdHeader);
};
