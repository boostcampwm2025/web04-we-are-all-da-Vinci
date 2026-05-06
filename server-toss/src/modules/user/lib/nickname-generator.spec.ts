import { generateNickname } from "./nickname-generator";

const NICKNAME_REGEX = /^[가-힣]+\d{3}$/;

describe("generateNickname", () => {
  it("형용사+명사+숫자3자리 형식을 따른다", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateNickname()).toMatch(NICKNAME_REGEX);
    }
  });

  it("주입된 RNG로 결정적 출력을 만든다", () => {
    const rng = () => 0;
    expect(generateNickname(rng)).toBe(generateNickname(rng));
  });
});
