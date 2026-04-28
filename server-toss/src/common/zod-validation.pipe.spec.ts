import { z, ZodError } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().nonnegative(),
  });

  it("유효한 페이로드는 그대로 통과시킨다", () => {
    const pipe = new ZodValidationPipe(schema);
    const payload = { name: "민수", age: 20 };

    expect(pipe.transform(payload)).toEqual(payload);
  });

  it("스키마와 다른 페이로드는 ZodError를 던진다", () => {
    const pipe = new ZodValidationPipe(schema);
    const payload = { name: "", age: -1 };

    expect(() => pipe.transform(payload)).toThrow(ZodError);
  });

  it("알 수 없는 필드가 있어도 허용된 필드만 남겨 통과시킨다", () => {
    const pipe = new ZodValidationPipe(schema);
    const payload = { name: "민수", age: 20, extra: "허용" };

    const result = pipe.transform(payload) as typeof payload;
    expect(result.name).toBe("민수");
    expect(result.age).toBe(20);
    expect(result).not.toHaveProperty("extra");
  });
});
